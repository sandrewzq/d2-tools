import {
  reduceCombosToColumnPool,
  isRecommendationRequirementSlot,
  type DimWishlistPerkDiagnostic,
  type SourceOptions
} from "@d2-tools/core/community-perks";
import type {
  DimWishlist,
  DimWishlistImportIssue,
  DimWishlistParseIssue,
  DimWishlistRule
} from "@d2-tools/core/analysis/wishlistImport";
import {
  diagnoseDimWishlistRules,
  dimColumnRequirementSets,
  hasWeaponSlotCatalog,
  perkDisplayName,
  weaponDisplayName,
  type DiagnosedDimWishlistRule
} from "./dimWishlistDiagnostics.js";

/**
 * 导入期校验（T56 · 原 T60）：把**按来源本意无法成立**的行挑出来跳过，其余照常导入。
 *
 * 三条口径（用户 2026-09-16 定）：
 * 1. **按行忽略，不整文件拒绝**。笔误在真实文件里很常见，一份文件不会因为几行写错就作废。
 * 2. **只在解析后没有任何有效规则时**才拒绝导入（「没有任何有效规则」由调用方判空即可，这里不做比例阈值）。
 * 3. 结果要能报得出：跳了几行、涉及几把枪、几把枪整把作废、每类问题的示例。
 *
 * 判据全部来自 `dimWishlistDiagnostics` —— 与读取期**同一份**归栏判定。这里不自己列栏位表：
 * 导入期与读取期各一张表就是两条口径，T56 已经为此返工过。
 *
 * ## 摊开写的展开行不是笔误（T64，2026-09-17）
 *
 * 「按行忽略」的前提是**这一行按来源本意无法成立**。把「每栏任选其一」摊开写成笛卡尔积的作者
 * 会顺手多写几行，其中一部分自己就矛盾（同一栏写了两个 perk）——那是写法带来的冗余，不是笔误：
 * 这份文件因此被逐行报了 7291 条「不可能同时拥有」，看着像坏了一大半，其实读取期照样把它归约
 * 成同一组候选。判据与实现见 `expansionRowsFor`：留下的行构成一组完整候选，且被丢掉那一行的
 * 内容已被其中一行整个包含时，记为「展开写法的冗余」（`merged_row_count`）——不报问题、
 * 不计进跳过行数，**写进库的行与从前逐条相同**。
 *
 * ## 会删数据的只有一处，所以判据收得很窄
 *
 * 「整把枪作废」是唯一会删掉**本来能正常展示**的规则的出口。口径原文是
 * 「去掉问题行后重新做可归约校验；剩余集合仍不构成各栏候选的笛卡尔积 → 该武器这部分规则整体跳过」。
 * 若照字面执行，作者原本写了三条互不相干的好 Roll（本来就归约不成）时，
 * 只要其中一行有笔误，剩下两条好 Roll 也会被一起删掉——正是口径里那句
 * 「避免为通过校验而悄悄丢正常数据」要防的事，而 `ui-specs/application-workspaces.md` 也明确
 * 「不能归约时保持一行一个完整组合展示」。
 *
 * 所以这里的触发条件是**丢行打破了原本成立的候选集合**：
 * 丢之前这把枪确实写全了一组候选（`formsCompleteProduct`）、丢之后不再成立 ——
 * 说明作者写的是一组候选、被我们拆残了，此时按残缺集合展示才是错的。
 * 作者本来就写的是独立组合、或本来就只有半栏的情况，丢一行只是少一条，其余原样按
 * 「一行一个完整组合」展示（ui-spec 已定的行为）。
 *
 * 两个方向都不能省：判宽了会删掉正常数据，判严了这个分支就永远不触发、等于没做。
 * 因此两侧都用同一份`formsCompleteProduct`，而不是拿 `reduceCombosToColumnPool` 的返回值直接当结论。
 *
 * 无论哪种情况，结论都**先出现在预览里**（用户确认前就能看到跳了几行、几把枪），
 * 这是「按行跳过」敢做的前提。
 *
 * ## 没有「归不了栏」这一档（Bug #102）
 *
 * 「两个特长栏都可能出」的 perk（例如 `意外复苏` 的 `脉冲增幅器`）按作者书写的栏位顺序
 * 归栏（见 `dimWishlistDiagnostics`），不判成问题。曾经有一档「跨栏无法唯一归栏」，
 * 它按行丢掉的正是作者写明的候选：`意外复苏（专家）` 的第一个特长栏候选少了 `脉冲增幅器`，
 * 只有一行规则的 `砷毒噬咬-4b` 则整把消失（在线合集里丢了全部 342 行）。
 * 判定既然唯一，这一档就不该存在——它回来了就等于「归栏判不了就丢数据」这条路又开了。
 */

/** 预览与回执最多列这么多条示例，其余只给总数——避免一个坏文件把界面和 IPC 撑爆。 */
const maxDimWishlistImportIssues = 50;

export type DimWishlistImportFilterResult = {
  /** 只留能成立的行；注释段里一条规则都不剩的会被一并去掉，不留空来源。 */
  wishlist: DimWishlist;
  skipped_row_count: number;
  affected_weapon_count: number;
  skipped_weapon_count: number;
  /** 展开写法的冗余行数（见 `expansionRowKeysFor`）：不写进库，但也不是笔误。 */
  merged_row_count: number;
  /** 有展开写法冗余行的武器数。 */
  merged_weapon_count: number;
  issue_count: number;
  issues: DimWishlistImportIssue[];
};

export function filterDimWishlistForImport(input: {
  wishlist: DimWishlist;
  parse_issues?: readonly DimWishlistParseIssue[];
  options: SourceOptions;
}): DimWishlistImportFilterResult {
  const issues: DimWishlistImportIssue[] = [];
  let issueCount = 0;
  const record = (issue: DimWishlistImportIssue): void => {
    issueCount += 1;
    if (issues.length < maxDimWishlistImportIssues) issues.push(issue);
  };

  const rulesByWeapon = new Map<number, DimWishlistRule[]>();
  for (const rule of input.wishlist.rules) {
    const bucket = rulesByWeapon.get(rule.item_hash);
    if (bucket) bucket.push(rule);
    else rulesByWeapon.set(rule.item_hash, [rule]);
  }

  // 语法行没进规则表（解析器读不出来），所以它们只会「按行跳过」，不牵动武器级判定。
  // 重复 perk 只在这里**登记**不在这里报：那一行会走到下面的行级判定里统一报一次，
  // 否则同一行会被计两次、报两条。
  const duplicatePerkHashes = new Map<number, number | undefined>();
  let skippedRowCount = 0;
  for (const parseIssue of input.parse_issues ?? []) {
    if (parseIssue.category === "duplicate_perk") {
      duplicatePerkHashes.set(parseIssue.line_number, parseIssue.perk_hash);
      continue;
    }
    skippedRowCount += 1;
    record({
      category: "unparseable_rule",
      line_number: parseIssue.line_number,
      weapon_name: parseIssue.item_hash === undefined ? "" : weaponDisplayName(parseIssue.item_hash, input.options),
      perk_name: "",
      message: "这一行不符合规则写法，读不进来。",
      raw_line: parseIssue.raw_line
    });
  }

  const keptRules = new Set<DimWishlistRule>();
  let affectedWeaponCount = 0;
  let skippedWeaponCount = 0;
  let mergedRowCount = 0;
  let mergedWeaponCount = 0;

  for (const [itemHash, rules] of rulesByWeapon) {
    const { evaluated } = diagnoseDimWishlistRules(itemHash, rules, input.options);
    // 资料库里没有这把枪的定义时目录为空，每个 perk 都会落成「查不到」——那不是笔误，是我们看不见。
    // 判下去会把整份文件误判没，所以只放行不判定（定义池整体缺插件的极端情况同理）。
    const weaponDefined = hasWeaponSlotCatalog(itemHash, input.options);
    const weaponName = weaponDisplayName(itemHash, input.options);
    const keptEntries: Array<DiagnosedDimWishlistRule<DimWishlistRule>> = [];
    const droppedEntries: Array<{ entry: DiagnosedDimWishlistRule<DimWishlistRule>; issue: DimWishlistImportIssue }> = [];
    for (const entry of evaluated) {
      const issue = rowIssueFor(entry, { weaponDefined, duplicatePerkHashes, weaponName, options: input.options });
      if (issue) droppedEntries.push({ entry, issue });
      else keptEntries.push(entry);
    }

    if (droppedEntries.length === 0) {
      for (const entry of keptEntries) keptRules.add(entry.rule);
      continue;
    }

    // 摊开写的展开行不算笔误：认出来的行不进问题清单，也不计进跳过行数。
    // **写进库的行与从前逐条相同**——认不认得出展开写法，只影响报数，不影响数据。
    //
    // 同一行写了两次同一个 perk 的要摘出来：那种行去重后可能又撞上同栏冲突，若当成展开行一带而过，
    // 「你把一个 perk 写了两遍」这条提示就永远不报了。笔误优先于写法。
    const expansionRows = expansionRowsFor(keptEntries);
    const mergedEntries = droppedEntries.filter((dropped) => (
      expansionRows !== null
      && dropped.issue.category === "same_slot"
      && !duplicatePerkHashes.has(dropped.entry.rule.line_number ?? -1)
      && expansionRows.some((keptPerks) => isCoveredByKeptRow(dropped.entry.rule.perk_hashes, keptPerks))
    ));
    const problemEntries = droppedEntries.filter((dropped) => !mergedEntries.includes(dropped));
    if (mergedEntries.length) {
      mergedRowCount += mergedEntries.length;
      mergedWeaponCount += 1;
    }
    if (problemEntries.length) {
      skippedRowCount += problemEntries.length;
      affectedWeaponCount += 1;
      for (const { issue } of problemEntries) record(issue);
    }

    // 这道分支会删掉本来能展示的规则，条件一个字都没动。认得出摊开写的行不影响它：
    // 那种行带着同栏冲突，只要它在，`formsCompleteProduct(留下的行)` 就不可能成立——
    // 换句话说是它自己先把这道分支关上了，而不是靠「不许展开行进来」挡住的。
    if (formsCompleteProduct(dimColumnRequirementSets(evaluated))
      && !formsCompleteProduct(dimColumnRequirementSets(keptEntries))
      && keptEntries.length > 0) {
      skippedWeaponCount += 1;
      record({
        category: "irreducible_weapon",
        line_number: firstLineNumber(rules),
        weapon_name: weaponName,
        perk_name: "",
        message: "丢掉问题行后，这把枪剩下的规则凑不成「每栏任选其一」，整把枪的规则已一起跳过。"
      });
      continue;
    }
    if (keptEntries.length === 0) skippedWeaponCount += 1;
    for (const entry of keptEntries) keptRules.add(entry.rule);
  }

  const survivingBlockIds = new Set(
    [...keptRules].flatMap((rule) => (rule.source_block_id ? [rule.source_block_id] : []))
  );
  const sourceBlocks = (input.wishlist.source_blocks ?? [])
    .filter((block) => survivingBlockIds.has(block.id));
  const rules = input.wishlist.rules.filter((rule) => keptRules.has(rule));

  return {
    wishlist: {
      ...input.wishlist,
      ...(input.wishlist.source_blocks ? { source_blocks: sourceBlocks } : {}),
      rules
    },
    skipped_row_count: skippedRowCount,
    affected_weapon_count: affectedWeaponCount,
    skipped_weapon_count: skippedWeaponCount,
    merged_row_count: mergedRowCount,
    merged_weapon_count: mergedWeaponCount,
    issue_count: issueCount,
    issues
  };
}

/**
 * 这一行该不该跳过。顺序即优先级：能说出「哪个 perk 写错了」的问题优先于「这一行重复写了」，
 * 前者对改文件的人更有用。
 */
function rowIssueFor(
  entry: DiagnosedDimWishlistRule<DimWishlistRule>,
  context: {
    weaponDefined: boolean;
    duplicatePerkHashes: ReadonlyMap<number, number | undefined>;
    weaponName: string;
    options: SourceOptions;
  }
): DimWishlistImportIssue | undefined {
  const lineNumber = entry.rule.line_number ?? 0;
  const base = { line_number: lineNumber, weapon_name: context.weaponName };
  if (context.weaponDefined) {
    const unknown = entry.diagnostics.find((perk) => perk.status === "unknown_slot");
    if (unknown) {
      return {
        ...base,
        category: "unknown_perk",
        perk_name: unknown.name,
        message: `「${unknown.name}」在这把枪的候选里找不到，可能是 Hash 或名字写错。`
      };
    }
    const sameSlot = findSameSlotConflict(entry.diagnostics);
    if (sameSlot) {
      return {
        ...base,
        category: "same_slot",
        perk_name: sameSlot.join("、"),
        message: `「${sameSlot[0]}」与「${sameSlot[1]}」落在同一栏，不可能同时拥有。`
      };
    }
  }
  // 重复 perk 与资料库无关：写重了就是写重了，定义池认不认识都算数。
  if (context.duplicatePerkHashes.has(lineNumber)) {
    const perkHash = context.duplicatePerkHashes.get(lineNumber);
    const perkName = perkHash === undefined ? "" : perkDisplayName(perkHash, context.options);
    return {
      ...base,
      category: "duplicate_perk",
      perk_name: perkName,
      message: perkName
        ? `「${perkName}」在同一行里写了两次，这一行已跳过。`
        : "同一行里同一个 perk 写了两次，这一行已跳过。"
    };
  }
  return undefined;
}

/**
 * 作者把「每栏任选其一」摊开写成笛卡尔积时，会顺手多写几行（T64）。
 *
 * 实测 `DIMLGpigWeaponWishlist by moc.txt`：3 个 perk 及以上的行 7306 条，**每一条都被同一把枪
 * 的某条两 perk 行整个包含，0 例外**——要求越多能命中的越少，被更短的一行包含就等于不带来任何
 * 新命中。归约那段注释里的实测（Aegis 863/863、小棒猪 257/257）说的是同一件事。
 *
 * 这类行里有一部分自己就矛盾（一行写了同一栏的两个 perk，作者把「任选其一」当成了「都可以要」），
 * 从前会被逐行报成「不可能同时拥有」，于是一份正常文件看起来坏了一大半（那份文件报了 7291 行）。
 *
 * 所以要按**一把枪**看，而不是按行看：这把枪留下的行本身就是一组完整的「每栏任选其一」时，
 * 被丢掉的那一行只要内容已被留下的某一行整个包含，就只是这组候选摊开时的冗余——
 * 「丢掉它不改变任何匹配」是可验证的，报成问题反而是误导。
 *
 * 返回每行写到的 perk（供 `isCoveredByKeptRow` 比对）；不构成一组候选时返回 null。
 * 「单独一条 Roll」不必另设守卫：共享的归约判据只对**至少两条**组合才给得出池子，一条写得再全也归约不成。
 */
function expansionRowsFor(
  entries: ReadonlyArray<DiagnosedDimWishlistRule<DimWishlistRule>>
): number[][] | null {
  if (!formsCompleteProduct(dimColumnRequirementSets(entries))) return null;
  return entries.map((entry) => entry.rule.perk_hashes);
}

/**
 * 被丢掉那一行写到的 perk 是不是已经全在留下的某一行里——是的话丢掉它不改变任何匹配。
 * 留下的行都通过了完整候选判定，每行必然带着 perk（没有任何栏位要求的行凑不出候选池），
 * 所以这里不必考虑「空行覆盖一切」。
 */
function isCoveredByKeptRow(perkHashes: readonly number[], keptPerkHashes: readonly number[]): boolean {
  return keptPerkHashes.every((hash) => perkHashes.includes(hash));
}

/**
 * 「作者确实写全了一组候选」——把池子反过来摊开，能一条不差地复原出这些规则。
 *
 * **为什么不直接用 `reduceCombosToColumnPool` 有没有返回值**：它自己会先去掉冗余超集再比数量，
 * 于是「一条只写了半栏的规则」会让整组看起来凑巧可归约（数量相等），那是它的已知宽松处。
 * 拿这个宽松结论去删数据太危险，所以这里额外要求：没有重复行、每条规则都恰好覆盖池子的每一栏、
 * 且规则条数等于各栏候选数之积。只有真成立时才认为「丢行把一组候选拆残了」。
 *
 * 混了武器级规则（没有任何栏位要求）时不按候选集合判，直接返回 false —— 那种规则不参与归约，
 * 也不该被归约的结论牵连。
 */
function formsCompleteProduct(
  sets: ReadonlyArray<Array<{ slot: string; hashes: number[] }>>
): boolean {
  if (sets.some((set) => set.length === 0)) return false;
  const pool = reduceCombosToColumnPool(sets);
  if (!pool) return false;
  if (new Set(sets.map((set) => JSON.stringify(set))).size !== sets.length) return false;
  const slots = pool.columns.map((column) => column.slot).sort();
  const covered = sets.every((set) => {
    const setSlots = set.map((requirement) => requirement.slot).sort();
    return setSlots.length === slots.length
      && setSlots.every((slot, index) => slot === slots[index]);
  });
  if (!covered) return false;
  return pool.columns.reduce((total, column) => total * column.candidates.length, 1) === sets.length;
}

/**
 * 同一行里两个 perk 落在同一栏——一把枪一栏只能有一个 perk，这种组合不可能存在。
 *
 * 归栏已经按书写顺序消歧，所以走到这里有两种情况：作者把**同一栏**写了两个 perk
 * （把「任选其一」当成「都可以要」），或书写顺序与栏位顺序矛盾——两种都是真的不可能同时拥有。
 * 只对落在**标准栏位**的 perk 判：`special` 栏位（大师、起源特性等）不受此限。
 */
function findSameSlotConflict(diagnostics: ReadonlyArray<DimWishlistPerkDiagnostic>): string[] | undefined {
  const namesBySlot = new Map<string, string[]>();
  for (const perk of diagnostics) {
    if (perk.status !== "exact" || !isRecommendationRequirementSlot(perk.slot)) continue;
    const names = namesBySlot.get(perk.slot) ?? [];
    names.push(perk.name);
    namesBySlot.set(perk.slot, names);
  }
  for (const names of namesBySlot.values()) if (names.length > 1) return names;
  return undefined;
}

function firstLineNumber(rules: readonly DimWishlistRule[]): number {
  return rules.find((rule) => rule.line_number !== undefined)?.line_number ?? 0;
}
