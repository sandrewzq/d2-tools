import { classifyWeaponRollSocket } from "../account/summary.js";
import { summarizeItemPerks, type ItemPlugSummary } from "../items/perks.js";
import type { RecommendationSourceRecord, RecommendationSourceMatch, SourceOptions } from "./types.js";

type SocketPool = { socket: number; slot: string; plugs: ItemPlugSummary[] };

/** 检查武器版本的完整候选池，不使用某件实例已刷出的 Perk。 */
export function createRollFeasibilityChecker(itemHash: number, options: SourceOptions) {
  const definition = options.itemDefinitions?.[String(itemHash)];
  const entries = definition?.sockets?.socketEntries;
  const pools: SocketPool[] = [];
  let complete = Boolean(entries?.length && options.itemDefinitions);
  let traitIndex = 0;
  if (definition && options.itemDefinitions && entries) {
    for (const entry of entries) {
      if (entry.hidePerksInItemTooltip) continue;
      const hashes = [entry.singleInitialItemHash, ...(entry.reusablePlugItems ?? []).map((plug) => plug.plugItemHash)];
      for (const hash of [entry.reusablePlugSetHash, entry.randomizedPlugSetHash]) {
        if (!hash) continue;
        const set = options.plugSetDefinitions?.[String(hash)];
        if (!Array.isArray(set?.reusablePlugItems)) complete = false;
        hashes.push(...(set?.reusablePlugItems ?? []).map((plug) => plug.plugItemHash));
      }
      // 已返回的无名称定义通常是空槽占位；只有缺失定义才表示池子未加载完整。
      if (hashes.some((hash) => hash && !options.itemDefinitions?.[String(hash)])) complete = false;
    }
    for (const group of summarizeItemPerks(definition, options.itemDefinitions, {
      plugSetDefinitions: options.plugSetDefinitions, maxPlugsPerSocket: null
    })) {
      const role = classifyWeaponRollSocket(group.plugs);
      const slot = role === "trait" ? `perk${++traitIndex}` : role;
      if (slot) pools.push({ socket: group.socket_index, slot, plugs: group.plugs.filter((plug) => !plug.is_socket_placeholder) });
    }
  }

  return (record: RecommendationSourceRecord): RecommendationSourceMatch["roll_feasibility"] => {
    if (!record.requirements.length) return undefined;
    let unknown = false;
    const choices: number[][] = [];
    const unavailable: string[] = [];
    for (const requirement of record.requirements) {
      if (!["barrel", "magazine", "masterwork", "perk1", "perk2", "origin"].includes(requirement.slot)) {
        unknown = true;
        continue;
      }
      const matching = pools.filter((pool) => pool.slot === requirement.slot && pool.plugs.some((plug) => (
        requirement.candidates.some((candidate) => candidate.hash === plug.hash
          || equalName(candidate.name, plug.name, requirement.slot === "masterwork"))
        || requirement.candidate_names.some((name) => equalName(name, plug.name, requirement.slot === "masterwork"))
      ))).map((pool) => pool.socket);
      if (!matching.length) {
        if (complete && requirement.candidates.length) unavailable.push(requirement.label || requirement.slot);
        else unknown = true;
      } else choices.push(matching);
    }
    if (unavailable.length) return { state: "impossible", reason: "candidate_unavailable", slots: unavailable };
    // 各项要求必须能放在不同插槽里；不能把同一插槽的两个候选当成可同时装备。
    const assigned = new Map<number, number>();
    function assign(requirement: number, visited: Set<number>): boolean {
      for (const socket of choices[requirement]) {
        if (visited.has(socket)) continue;
        visited.add(socket);
        const previous = assigned.get(socket);
        if (previous === undefined || assign(previous, visited)) {
          assigned.set(socket, requirement);
          return true;
        }
      }
      return false;
    }
    if (!choices.every((_, index) => assign(index, new Set()))) {
      return complete ? { state: "impossible", reason: "socket_conflict", slots: [] } : { state: "unknown" };
    }
    return { state: unknown ? "unknown" : "possible" };
  };
}

function equalName(left: string, right: string, masterwork: boolean): boolean {
  const normalize = (value: string) => {
    const name = masterwork ? value.replace(/^\s*\d+\s*阶\s*[：:]\s*/u, "").replace(/^\s*大师杰作\s*[：:]\s*/u, "") : value;
    return name.normalize("NFKC").toLocaleLowerCase().replace(/[\p{P}\p{Z}\s]+/gu, "");
  };
  return Boolean(left.trim()) && normalize(left) === normalize(right);
}
