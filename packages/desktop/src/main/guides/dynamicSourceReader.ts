import { BrowserWindow } from "electron";
import { createGuideSourceSections, type GuideSourceReadPreview } from "@d2-tools/core/guides/source";

const dynamicReadTimeoutMs = 20_000;
const xiaoheiheHost = "www.xiaoheihe.cn";
const xiaoheihePathPattern = /^\/app\/bbs\/link\/[^/?#]+\/?$/;

type DynamicPageResult = {
  title: string;
  author?: string;
  tags: string[];
  body: string;
  mediaCount: number;
};

export function isXiaoheiheGuideUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:"
      && url.hostname.toLocaleLowerCase() === xiaoheiheHost
      && xiaoheihePathPattern.test(url.pathname);
  } catch {
    return false;
  }
}

export async function readXiaoheiheGuideSource(
  sourceUrl: string,
  now = new Date()
): Promise<GuideSourceReadPreview> {
  if (!isXiaoheiheGuideUrl(sourceUrl)) {
    throw new Error("不是受支持的小黑盒攻略链接");
  }

  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      partition: "d2-guide-source-reader"
    }
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  window.webContents.on("will-navigate", (event, navigationUrl) => {
    if (!isAllowedTopLevelUrl(navigationUrl)) event.preventDefault();
  });

  try {
    await withTimeout(window.loadURL(sourceUrl.trim()), "小黑盒攻略页面加载超时");
    const page = await withTimeout(
      window.webContents.executeJavaScript(dynamicExtractionScript()) as Promise<DynamicPageResult>,
      "小黑盒攻略正文加载超时"
    );
    const body = page.body.trim();
    if (body.length < 200) throw new Error("小黑盒页面已打开，但没有读取到完整攻略正文");
    const warnings: string[] = [];
    if (page.title.includes("已过时") || body.slice(0, 300).includes("已丧失时效性")) {
      warnings.push("来源作者已将这篇攻略标记为过时，生成方案前需要复核当前版本。");
    }
    if (page.mediaCount) {
      warnings.push(`文章包含 ${page.mediaCount} 个图片或动图；当前自动分析使用可见文字，图片中的精确配置需要人工复核。`);
    }
    return {
      source_url: sourceUrl.trim(),
      final_url: window.webContents.getURL(),
      title: page.title,
      author: page.author,
      tags: page.tags,
      body,
      sections: createGuideSourceSections(body),
      content_type: "text/html",
      fetched_at: now.toISOString(),
      byte_length: Buffer.byteLength(body, "utf8"),
      warnings,
      reader: "dynamic-page",
      completeness: page.mediaCount ? "text-only" : "complete",
      media_count: page.mediaCount
    };
  } finally {
    if (!window.isDestroyed()) window.destroy();
  }
}

function isAllowedTopLevelUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.toLocaleLowerCase() === xiaoheiheHost;
  } catch {
    return false;
  }
}

function withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), dynamicReadTimeoutMs);
    void promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

function dynamicExtractionScript(): string {
  return `
    new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const normalize = (value) => String(value || "").replace(/\\s+/g, " ").trim();
      const readArticle = () => {
        const article = document.querySelector(".hb-article");
        const title = normalize(document.querySelector(".link-section-title")?.textContent);
        if (!article || !title || normalize(article.textContent).length < 200) {
          if (Date.now() - startedAt > ${dynamicReadTimeoutMs}) {
            reject(new Error("页面没有出现可读取的小黑盒攻略正文"));
            return;
          }
          setTimeout(readArticle, 150);
          return;
        }
        const lines = [];
        for (const node of article.children) {
          const text = normalize(node.textContent);
          if (!text) continue;
          const heading = /^H([1-6])$/.exec(node.tagName);
          if (heading) {
            lines.push("#".repeat(Number(heading[1])) + " " + text);
            continue;
          }
          lines.push(text);
        }
        const tags = Array.from(document.querySelectorAll(".link-section-tags"))
          .flatMap((node) => String(node.textContent || "").split(/\\r?\\n/))
          .map(normalize)
          .filter(Boolean);
        const author = normalize(document.querySelector(".link-section-user")?.textContent).split(" ")[0] || undefined;
        resolve({
          title,
          author,
          tags: Array.from(new Set(tags)),
          body: lines.join("\\n\\n"),
          mediaCount: article.querySelectorAll("img, video").length
        });
      };
      readArticle();
    })
  `;
}
