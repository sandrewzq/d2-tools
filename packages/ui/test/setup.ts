import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
  // 产品页面开始把「这一次运行里的界面状态」写进 sessionStorage（仓库筛选：`src/vault/vaultFilterState.ts`）。
  // 同一个测试文件里的用例共用一份存储，不清就会互相串：上一条用例选中的筛选被下一条挂载时恢复出来。
  // node 环境的用例没有 window，跳过即可——那里也读不到存储。
  if (typeof window !== "undefined") window.sessionStorage.clear();
});
