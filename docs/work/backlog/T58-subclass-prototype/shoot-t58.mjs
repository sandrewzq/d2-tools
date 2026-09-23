// 出图：三个标签各一张，宽 1440（用户看原型的宽度）。
import { chromium } from "playwright";
import { join } from "node:path";

const here = import.meta.dirname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 2 });
await page.goto("file://" + join(here, "t58.html"));
await page.waitForTimeout(200);

for (const tab of ["view-a", "view-b", "view-c"]) {
  await page.click('.t58-tab[data-tab="' + tab + '"]');
  await page.waitForTimeout(120);
  // 整页截图会只截到滚动容器的视口，所以按元素截。
  await page.locator("#" + tab).screenshot({ path: join(here, tab + ".png") });
}

await page.click('.t58-tab[data-tab="view-b"]');
await page.click('#sources-toggle');
await page.waitForTimeout(120);
await page.locator("#view-b").screenshot({ path: join(here, "view-b-sources.png") });

await page.click('.t58-seg[data-gate="drifted"]');
await page.waitForTimeout(120);
await page.locator(".t58-gate-panel").screenshot({ path: join(here, "gate-blocked.png") });

await browser.close();
console.log("出图完成");
