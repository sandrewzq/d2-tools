import { describe, expect, it } from "vitest";
import { createTransferQueue, runTransferQueue } from "../src/actions/transferQueue.js";
import type { AccountItemSummary } from "../src/account/summary.js";

const items: AccountItemSummary[] = [
  {
    hash: 1,
    instance_id: "a",
    name: "Riskrunner",
    group_key: "weapons",
    bucket_name: "能量武器",
    socket_plugs: []
  },
  {
    hash: 2,
    instance_id: "b",
    name: "Helmet",
    group_key: "armor",
    bucket_name: "头盔",
    socket_plugs: []
  }
];

describe("transfer queue", () => {
  it("creates readable transfer queue steps before executing writes", () => {
    const queue = createTransferQueue({
      character_id: "char-1",
      transfer_to_vault: false,
      items
    });

    expect(queue.summary).toBe("准备取出 2 件装备到角色背包。");
    expect(queue.steps.map((step) => step.status)).toEqual(["pending", "pending"]);
    expect(queue.steps[0]).toMatchObject({
      item_name: "Riskrunner",
      character_id: "char-1",
      transfer_to_vault: false,
      attempts: 0
    });
  });

  it("executes pending steps and retries only failed steps", async () => {
    const queue = createTransferQueue({
      character_id: "char-1",
      transfer_to_vault: true,
      items
    });
    const calls: string[] = [];

    const first = await runTransferQueue(queue, async (step) => {
      calls.push(step.item_id);
      if (step.item_id === "a") {
        throw new Error("vault full");
      }
      return "ok";
    });

    expect(first.steps.map((step) => step.status)).toEqual(["failed", "success"]);
    expect(first.summary).toBe("转移队列完成 1 件，失败 1 件。");

    const retry = await runTransferQueue(first, async (step) => {
      calls.push(`retry:${step.item_id}`);
      return "ok";
    }, { retryFailedOnly: true });

    expect(calls).toEqual(["a", "b", "retry:a"]);
    expect(retry.steps.map((step) => step.status)).toEqual(["success", "success"]);
    expect(retry.summary).toBe("转移队列完成 2 件，失败 0 件。");
  });
});
