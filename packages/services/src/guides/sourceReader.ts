import { parse, type DefaultTreeAdapterTypes } from "parse5";
import { createGuideSourceSections, isSupportedGuideSourceUrl, type GuideSourceReadPreview, type GuideSourceSection } from "@d2-tools/core/guides/source";
import { readPublicTextUrl } from "../net/publicUrlReader.js";

const maxResponseBytes = 2_000_000;
const maxExtractedCharacters = 200_000;
const requestTimeoutMs = 15_000;
const supportedContentTypes = ["text/html", "application/xhtml+xml", "text/plain", "text/markdown"];
const ignoredTags = new Set(["script", "style", "noscript", "svg", "canvas", "template", "form", "nav", "header", "footer", "aside"]);
const blockTags = new Set(["p", "li", "blockquote", "pre", "tr"]);

export async function readGuideSourceUrl(sourceUrl: string, now = new Date()): Promise<GuideSourceReadPreview> {
  if (!isSupportedGuideSourceUrl(sourceUrl)) throw new Error("攻略来源必须使用有效的 HTTP(S) 地址");
  const read = await readPublicTextUrl(sourceUrl, {
    label: "攻略链接",
    userAgent: "d2-tools-guide-reader/0.0.15",
    accept: "text/html,application/xhtml+xml,text/plain,text/markdown;q=0.9,*/*;q=0.1",
    acceptedContentTypes: supportedContentTypes,
    maxBytes: maxResponseBytes,
    timeoutMs: requestTimeoutMs
  });
  const contentType = read.content_type;
  const rawText = read.text;
  const warnings: string[] = [];
  const extracted = contentType === "text/html" || contentType === "application/xhtml+xml"
    ? extractHtmlDocument(rawText)
    : extractPlainText(rawText);
  if (!extracted.body.trim()) throw new Error("攻略页面没有可读取的正文");
  if (extracted.body.length > maxExtractedCharacters) {
    extracted.body = extracted.body.slice(0, maxExtractedCharacters).trimEnd();
    extracted.sections = createGuideSourceSections(extracted.body);
    warnings.push("正文超过 20 万字符，预览已截断");
  }

  return {
    source_url: sourceUrl.trim(),
    final_url: read.final_url,
    title: extracted.title,
    body: extracted.body,
    sections: extracted.sections,
    content_type: contentType,
    fetched_at: now.toISOString(),
    byte_length: read.byte_length,
    warnings: [...read.warnings, ...warnings, ...extracted.warnings],
    reader: "static-html",
    completeness: extracted.warnings.length ? "partial" : "complete",
    media_count: 0
  };
}

function extractHtmlDocument(html: string): { title?: string; body: string; sections: GuideSourceSection[]; warnings: string[] } {
  const document = parse(html);
  const title = findFirstText(document, "title") || findFirstText(document, "h1") || undefined;
  const candidates = collectContentCandidates(document);
  const candidateTexts = candidates.map((node) => extractBlocks(node)).filter((value) => value.join(" ").length >= 120);
  const lines = candidateTexts.sort((left, right) => right.join(" ").length - left.join(" ").length)[0] ?? extractBlocks(document);
  const body = normalizeExtractedLines(lines).join("\n");
  return {
    title: title?.slice(0, 240),
    body,
    sections: createGuideSourceSections(body),
    warnings: candidateTexts.length ? [] : ["页面没有明确正文容器，已使用整页可见文本"]
  };
}

function extractPlainText(text: string): { title?: string; body: string; sections: GuideSourceSection[]; warnings: string[] } {
  const body = normalizeExtractedLines(text.split(/\r?\n/)).join("\n");
  return {
    title: body.split("\n").find(Boolean)?.slice(0, 240),
    body,
    sections: createGuideSourceSections(body),
    warnings: []
  };
}

function collectContentCandidates(root: DefaultTreeAdapterTypes.Node): DefaultTreeAdapterTypes.Node[] {
  const candidates: DefaultTreeAdapterTypes.Node[] = [];
  walk(root, (node) => {
    if (!isElement(node)) return;
    const identity = [node.tagName, attribute(node, "id"), attribute(node, "class")].join(" ").toLocaleLowerCase();
    if (node.tagName === "article" || node.tagName === "main" || /\b(content|article|post|entry|guide)\b/.test(identity)) {
      candidates.push(node);
    }
  });
  return candidates.length ? candidates : [root];
}

function extractBlocks(root: DefaultTreeAdapterTypes.Node): string[] {
  const lines: string[] = [];
  const visit = (node: DefaultTreeAdapterTypes.Node): void => {
    if (isElement(node)) {
      if (ignoredTags.has(node.tagName)) return;
      const headingLevel = /^h([1-6])$/.exec(node.tagName)?.[1];
      if (headingLevel) {
        const text = nodeText(node);
        if (text) lines.push(`${"#".repeat(Number(headingLevel))} ${text}`);
        return;
      }
      if (blockTags.has(node.tagName)) {
        const text = nodeText(node);
        if (text) lines.push(node.tagName === "li" ? `- ${text}` : text);
        return;
      }
    }
    for (const child of childNodes(node)) visit(child);
  };
  visit(root);
  if (!lines.length) {
    const fallback = nodeText(root);
    if (fallback) lines.push(fallback);
  }
  return lines;
}

function findFirstText(root: DefaultTreeAdapterTypes.Node, tagName: string): string {
  let result = "";
  walk(root, (node) => {
    if (!result && isElement(node) && node.tagName === tagName) result = nodeText(node);
  });
  return result;
}

function nodeText(node: DefaultTreeAdapterTypes.Node): string {
  if (isTextNode(node)) return node.value;
  if (isElement(node) && ignoredTags.has(node.tagName)) return "";
  return childNodes(node).map(nodeText).join(" ").replace(/\s+/g, " ").trim();
}

function walk(node: DefaultTreeAdapterTypes.Node, visitor: (node: DefaultTreeAdapterTypes.Node) => void): void {
  visitor(node);
  for (const child of childNodes(node)) walk(child, visitor);
}

function childNodes(node: DefaultTreeAdapterTypes.Node): DefaultTreeAdapterTypes.ChildNode[] {
  return "childNodes" in node ? node.childNodes : [];
}

function isElement(node: DefaultTreeAdapterTypes.Node): node is DefaultTreeAdapterTypes.Element {
  return "tagName" in node;
}

function isTextNode(node: DefaultTreeAdapterTypes.Node): node is DefaultTreeAdapterTypes.TextNode {
  return node.nodeName === "#text" && "value" in node;
}

function attribute(node: DefaultTreeAdapterTypes.Element, name: string): string {
  return node.attrs.find((entry) => entry.name === name)?.value ?? "";
}

function normalizeExtractedLines(lines: string[]): string[] {
  const result: string[] = [];
  for (const rawLine of lines) {
    const line = rawLine.replace(/[ \t]+/g, " ").trim();
    if (!line) continue;
    if (result.at(-1) === line) continue;
    result.push(line);
  }
  return result;
}
