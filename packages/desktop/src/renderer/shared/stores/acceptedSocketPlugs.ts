import {
  acceptedSocketPlugsReflected,
  applyAcceptedSocketPlugs,
  type AcceptedSocketPlugChange,
  type AcceptedSocketPlugTarget,
  type AccountItemDetail
} from "@d2-tools/core/account/summary";

/**
 * 已受理、但服务器还没读回来的换 Perk 结果。
 *
 * 写接口受理（ErrorCode 1）与服务器读回之间有实测可达数分钟的传播延迟（见 T77），所以受理之后
 * 本地必须先落脚。这份落脚点**必须活得比详情弹框久** —— 否则关掉再打开就又看见旧 Perk，
 * 用户没法判断切换到底成功没有。
 *
 * 谁有资格覆盖它（不变量正文在 `docs/development.md`）：
 *
 * - 单件详情的读取：**没有**。读取出口会把它叠上去（见 `useItemDetail.loadAccountItemDetailCached`）。
 * - 服务器自己吐出了新值：可以，且只是提前退休。
 * - 窗口耗尽之后的账号同步：可以，之后完全以服务器为准（含「服务器仍说旧的」）。
 */
type AcceptedSocketPlugRecord = {
  changes: readonly AcceptedSocketPlugChange[];
  expires_at: number;
};

/** 实测传播延迟可达数分钟；窗口取实测上界，给服务器留足自己吐出新值的时间。 */
const ACCEPTED_SOCKET_PLUG_WINDOW_MS = 5 * 60_000;

const recordsByInstanceId = new Map<string, AcceptedSocketPlugRecord>();

/** 写入受理时登记。同槽位的新结果覆盖旧的，不同槽位的并行保留。 */
export function recordAcceptedSocketPlugs(
  instanceId: string,
  changes: readonly AcceptedSocketPlugChange[]
): void {
  if (!instanceId || !changes.length) return;
  const merged = new Map((recordsByInstanceId.get(instanceId)?.changes ?? [])
    .map((change) => [change.socket_index, change]));
  for (const change of changes) merged.set(change.socket_index, change);
  recordsByInstanceId.set(instanceId, {
    changes: [...merged.values()],
    expires_at: Date.now() + ACCEPTED_SOCKET_PLUG_WINDOW_MS
  });
}

/** 账号同步落地时调用：窗口已过的一律退休，之后服务器说什么就是什么（含「仍说旧的」）。 */
export function expireAcceptedSocketPlugs(now = Date.now()): void {
  for (const [instanceId, record] of recordsByInstanceId) {
    if (record.expires_at <= now) recordsByInstanceId.delete(instanceId);
  }
}

/**
 * 把还生效的受理状态叠到**服务器原样读回**的详情上；对不上就原样返回，绝不合成槽位。
 *
 * 顺带处理两种退休：窗口已过，或者这份服务器读回的结果已经对上了（提前退休）。
 */
export function withAcceptedSocketPlugs(
  instanceId: string,
  detail: AccountItemDetail
): AccountItemDetail {
  const record = takeLiveRecord(instanceId, detail);
  if (!record) return detail;
  const patch = applyAcceptedSocketPlugs(detail, record.changes);
  if (!patch) return detail;
  return { ...detail, ...patch };
}

/**
 * 后台探针专用：只跑退休判断，然后**原样返回**服务器读回的结果。
 *
 * 探针必须走这条路，否则它读回自己叠上去的乐观值，每一轮都会「对上」，永远校不出服务器有没有接受。
 */
export function settleAcceptedSocketPlugsFromServer(
  instanceId: string,
  detail: AcceptedSocketPlugTarget
): void {
  takeLiveRecord(instanceId, detail);
}

/** 仅供测试：清空全部受理状态，避免用例之间互相串。 */
export function resetAcceptedSocketPlugs(): void {
  recordsByInstanceId.clear();
}

function takeLiveRecord(
  instanceId: string,
  detail: AcceptedSocketPlugTarget
): AcceptedSocketPlugRecord | null {
  const record = recordsByInstanceId.get(instanceId);
  if (!record) return null;
  if (record.expires_at <= Date.now() || acceptedSocketPlugsReflected(detail, record.changes)) {
    recordsByInstanceId.delete(instanceId);
    return null;
  }
  return record;
}
