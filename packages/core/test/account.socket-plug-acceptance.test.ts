import { describe, expect, it } from "vitest";
import {
  acceptedSocketPlugsReflected,
  applyAcceptedSocketPlugs,
  summarizeAcceptedSocketPlugs,
  type AccountItemDetail,
  type AccountItemSocketSummary,
  type AccountWeaponRollSummary
} from "../src/account/summary.js";

/**
 * 换 Perk 受理后本地落地的核心规则（T77 / T78）。
 *
 * 详情里的插槽状态有**四份**并行表示，任何一份漏改都会让同一屏的不同区域互相打架；
 * 这里钉的就是「一次改，四份一起动」。漏掉 `reusable_plugs[].selected` 那一份，
 * 界面上就会出现「新旧两项同时显示当前启用」。
 */
describe("applyAcceptedSocketPlugs", () => {
  it("一次受理让 sockets / reusable_plugs / socket_plugs / weapon_roll 四份视图同源更新", () => {
    const current = accountDetail();

    const patch = applyAcceptedSocketPlugs(current, [
      { socket_index: 1, plug_hash: 300, plug_name: "新 Perk" }
    ]);

    expect(patch).not.toBeNull();
    expect(patch?.sockets[1]?.selected_plug).toMatchObject({ hash: 300, name: "新 Perk" });
    // 槽内至多一条选中，且必然是新的这一条 —— 否则与本件的 selected_plug 说的不是一件事。
    expect(patch?.sockets[1]?.reusable_plugs.map((plug) => [plug.hash, plug.selected])).toEqual([
      [200, false],
      [300, true]
    ]);
    expect(patch?.socket_plugs.map((plug) => plug.hash)).toEqual([100, 300]);
    expect(patch?.weapon_roll?.sockets[1]?.current_plug).toMatchObject({ hash: 300, name: "新 Perk" });
    // 推荐对照区的「当前启用」读的是 owned_plugs[].selected，与 current_plug 是同一条事实。
    expect(patch?.weapon_roll?.sockets[1]?.owned_plugs.map((plug) => [plug.hash, plug.selected])).toEqual([
      [200, false],
      [300, true]
    ]);
    // 指纹是 Roll 缓存键，不重算就会继续命中旧配置的缓存。
    expect(patch?.weapon_roll?.fingerprint).not.toBe(current.weapon_roll?.fingerprint);
  });

  it("不动没命中的槽位，也不改写传入的详情", () => {
    const current = accountDetail();

    const patch = applyAcceptedSocketPlugs(current, [
      { socket_index: 1, plug_hash: 300, plug_name: "新 Perk" }
    ]);

    expect(patch?.sockets[0]).toBe(current.sockets[0]);
    expect(current.sockets[1]?.selected_plug?.hash).toBe(200);
    expect(current.socket_plugs.map((plug) => plug.hash)).toEqual([100, 200]);
  });

  it("按 socket_index 定位，找不到的条目整条跳过", () => {
    const current = accountDetail();

    expect(applyAcceptedSocketPlugs(current, [{ socket_index: 9, plug_hash: 300 }])).toBeNull();
    // 一条落上、一条落不上：落上的生效，落不上的不新增槽位。
    const patch = applyAcceptedSocketPlugs(current, [
      { socket_index: 1, plug_hash: 300, plug_name: "新 Perk" },
      { socket_index: 9, plug_hash: 400 }
    ]);
    expect(patch?.sockets).toHaveLength(current.sockets.length);
    expect(patch?.socket_plugs.map((plug) => plug.hash)).toEqual([100, 300]);
  });

  it("没有插槽数据或没有变更时是干净的 no-op", () => {
    expect(applyAcceptedSocketPlugs(accountDetail(), [])).toBeNull();
    expect(applyAcceptedSocketPlugs({ socket_plugs: [] }, [
      { socket_index: 1, plug_hash: 300 }
    ])).toBeNull();
    expect(applyAcceptedSocketPlugs({ sockets: [] }, [
      { socket_index: 1, plug_hash: 300 }
    ])).toBeNull();
  });

  it("不可见槽位照样改 sockets，但不进 socket_plugs 派生", () => {
    const current = accountDetail({ hideSocketIndexes: [1] });

    const patch = applyAcceptedSocketPlugs(current, [
      { socket_index: 1, plug_hash: 300, plug_name: "新 Perk" }
    ]);

    expect(patch?.sockets[1]?.selected_plug?.hash).toBe(300);
    expect(patch?.socket_plugs.map((plug) => plug.hash)).toEqual([100]);
  });

  it("plug_name 缺失时回落到该槽候选插件的名字，再回落 hash", () => {
    const current = accountDetail();

    const named = applyAcceptedSocketPlugs(current, [{ socket_index: 1, plug_hash: 300 }]);
    expect(named?.sockets[1]?.selected_plug).toMatchObject({
      hash: 300,
      name: "候选 300",
      icon: "/icons/300.png"
    });
    // 候选信息一并带进 weapon_roll，避免 Roll 区显示成光秃秃的 hash。
    expect(named?.weapon_roll?.sockets[1]?.current_plug?.icon).toBe("/icons/300.png");

    const unnamed = applyAcceptedSocketPlugs(current, [{ socket_index: 1, plug_hash: 999 }]);
    expect(unnamed?.sockets[1]?.selected_plug?.name).toBe("999");
  });

  it("非武器没有 weapon_roll 时只回插槽两份视图", () => {
    const current = accountDetail({ weaponRoll: null });

    const patch = applyAcceptedSocketPlugs(current, [
      { socket_index: 1, plug_hash: 300, plug_name: "新 Perk" }
    ]);

    expect(patch?.socket_plugs.map((plug) => plug.hash)).toEqual([100, 300]);
    expect(patch?.weapon_roll).toBeUndefined();
  });

  it("Roll 里没有这个槽位时 weapon_roll 原样返回", () => {
    const current = accountDetail({ weaponRollSocketIndexes: [0] });

    const patch = applyAcceptedSocketPlugs(current, [
      { socket_index: 1, plug_hash: 300, plug_name: "新 Perk" }
    ]);

    expect(patch?.weapon_roll).toBe(current.weapon_roll);
  });
});

/**
 * 「服务器有没有吐回这些变更」是全仓唯一的判据：受理状态提前退休、后台留痕、手动重读
 * 都读它。多一处手写的对照，就多一处可能跟这里说法不一致的地方。
 */
describe("acceptedSocketPlugsReflected", () => {
  it("逐槽对照 selected_plug，全中才算反射", () => {
    const reflectedDetail = applyAcceptedSocketPlugs(accountDetail(), [
      { socket_index: 1, plug_hash: 300, plug_name: "新 Perk" }
    ]);
    const changes = [
      { socket_index: 0, plug_hash: 100 },
      { socket_index: 1, plug_hash: 300 }
    ];

    // 服务器原样（还读着旧值）＝ 没反射；把受理结果叠上去之后＝反射。
    expect(acceptedSocketPlugsReflected(accountDetail(), changes)).toBe(false);
    expect(acceptedSocketPlugsReflected({ ...accountDetail(), ...reflectedDetail }, changes)).toBe(true);
  });

  it("定位不到的槽位按「没反射」算，并把期望/实读写进 message", () => {
    const summary = summarizeAcceptedSocketPlugs(accountDetail(), [
      { socket_index: 1, plug_hash: 300 },
      { socket_index: 9, plug_hash: 400 }
    ]);

    expect(summary).toMatchObject({ expected_count: 2, matched_count: 0 });
    expect(summary.message).toContain("插槽 9");
    expect(acceptedSocketPlugsReflected(accountDetail(), [])).toBe(true);
  });
});

function accountDetail(options: {
  hideSocketIndexes?: number[];
  weaponRoll?: null;
  weaponRollSocketIndexes?: number[];
} = {}): AccountItemDetail {
  const sockets = [
    socket({ index: 0, selectedHash: 100 }),
    socket({
      index: 1,
      selectedHash: 200,
      hidden: options.hideSocketIndexes?.includes(1) ?? false,
      reusable: [
        { hash: 200, name: "旧 Perk 200" },
        { hash: 300, name: "候选 300", icon: "/icons/300.png" }
      ]
    })
  ];
  return {
    hash: 500,
    instance_id: "instance-1",
    name: "测试武器",
    group_key: "weapons",
    sockets,
    socket_plugs: selectedPlugs(sockets),
    ...(options.weaponRoll === null
      ? {}
      : { weapon_roll: weaponRoll(sockets, options.weaponRollSocketIndexes) })
  };
}

function socket(input: {
  index: number;
  selectedHash: number;
  hidden?: boolean;
  reusable?: { hash: number; name: string; icon?: string }[];
}): AccountItemSocketSummary {
  const reusable = input.reusable ?? [{ hash: input.selectedHash, name: `候选 ${input.selectedHash}` }];
  return {
    socket_index: input.index,
    is_visible: !input.hidden,
    is_enabled: true,
    enable_fail_indexes: [],
    selected_plug: {
      hash: input.selectedHash,
      socket_index: input.index,
      name: `旧 Perk ${input.selectedHash}`
    },
    reusable_plugs: reusable.map((plug) => ({
      hash: plug.hash,
      socket_index: input.index,
      name: plug.name,
      selected: plug.hash === input.selectedHash,
      insert_fail_indexes: [],
      enable_fail_indexes: [],
      sources: ["instance"],
      ...(plug.icon ? { icon: plug.icon } : {})
    }))
  };
}

/** 与 `summarizeItem` 里 `socket_plugs` 的派生保持一致，别手写第二份。 */
function selectedPlugs(sockets: readonly AccountItemSocketSummary[]) {
  return sockets.flatMap((entry) => (
    entry.is_visible && entry.selected_plug ? [entry.selected_plug] : []
  ));
}

function weaponRoll(
  sockets: readonly AccountItemSocketSummary[],
  socketIndexes?: number[]
): AccountWeaponRollSummary {
  return {
    fingerprint: "roll-v1-00000000:0",
    complete: true,
    incomplete_reasons: [],
    sockets: sockets
      .filter((entry) => !socketIndexes || socketIndexes.includes(entry.socket_index))
      .map((entry) => ({
        socket_index: entry.socket_index,
        slot: entry.socket_index === 0 ? "barrel" : "perk1",
        label: `槽位 ${entry.socket_index}`,
        ...(entry.selected_plug
          ? { current_plug: { hash: entry.selected_plug.hash, name: entry.selected_plug.name, selected: true } }
          : {}),
        owned_plugs: entry.reusable_plugs.map((plug) => ({
          hash: plug.hash,
          name: plug.name,
          selected: plug.selected
        })),
        complete: true,
        incomplete_reasons: []
      }))
  };
}
