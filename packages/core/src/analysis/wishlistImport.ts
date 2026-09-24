export type DimWishlistMode = "pve" | "pvp" | "general";

export type DimWishlistRule = {
  rule_stable_id?: string;
  item_hash: number;
  /**
   * 这条规则覆盖的全部武器 hash（T56 2026-09-24 家族全展开）。第一项**永远是** `item_hash`
   * （这条规则自己的那把枪），其余是同族的其它版本；声明版本优先与逐 hash 池子自检都在导入期算完。
   *
   * 只在导入期写入、落库时保留。读取期按它建「武器 → 规则」索引——没有它就只能回到
   * 「规则只对写出它的那个 hash 生效」，那正是旧口径的漏匹配。缺省时按 `[item_hash]` 理解。
   */
  item_hashes?: number[];
  perk_hashes: number[];
  kind?: "roll" | "weapon_only";
  mode: DimWishlistMode;
  note: string;
  tags?: string[];
  author?: string;
  source_note?: string;
  source_title?: string;
  source_description?: string;
  source_block_id?: string;
  /**
   * 该规则在源文件里的行号（1 起）。**只在解析结果上存在**，供导入期把问题指回原文件；
   * 落库时会随 `normalizeDimWishlist` 的逐字段重建而丢弃——存储里没有「第几行」这个概念。
   */
  line_number?: number;
};

export type DimWishlistSourceBlock = {
  id: string;
  title?: string;
  description?: string;
  note?: string;
  tags?: string[];
  author?: string;
};

export type DimWishlist = {
  title: string;
  description?: string;
  author?: string;
  source_blocks?: DimWishlistSourceBlock[];
  rules: DimWishlistRule[];
};

/**
 * 解析器在**行级**发现的问题。只有解析器看得到这两件事：语法不成立的行、以及在去重之前的重复 perk。
 * 归栏能不能成立要看官方定义池，那是导入期校验（服务层）的事，解析器不碰。
 */
export type DimWishlistParseIssue = {
  line_number: number;
  category: "unparseable_rule" | "duplicate_perk";
  /** 出问题的原文行，原样保留供预览展示。 */
  raw_line: string;
  /** 能认出是给哪把武器的就给，认不出（语法行）就没有。 */
  item_hash?: number;
  /** 重复 perk 这类问题要能说出是哪个 perk。 */
  perk_hash?: number;
};

/**
 * 导入期按行忽略的问题类别。**这里只有判据，没有文案**——面向用户的话由服务层生成。
 *
 * 语法类由解析器给出（`DimWishlistParseIssue`），归栏类由槽位诊断给出：
 * 两者都是「这一行按来源本意无法成立」，所以处理方式一致：跳过这一行，其余照常。
 */
export type DimWishlistImportIssueCategory =
  /** 这一行不符合规则语法（笔误、Hash 非法），读不进来。 */
  | "unparseable_rule"
  /** 同一行里同一个 perk 写了两次。 */
  | "duplicate_perk"
  /** 这个 perk 在这把枪的候选里找不到，多半是 Hash 或名字写错。 */
  | "unknown_perk"
  /** 同一行里两个 perk 落在同一栏，不可能同时拥有。 */
  | "same_slot"
  /** 丢掉问题行后，这把枪剩下的规则不再构成完整候选，因此整把枪的规则一起跳过。 */
  | "irreducible_weapon";

export type DimWishlistImportIssue = {
  category: DimWishlistImportIssueCategory;
  /** 1 起。整把枪作废这类问题记该武器第一条规则所在行。 */
  line_number: number;
  /** 出问题的武器名；定义池里查不到名字时为空串（不拿 Hash 冒充名字）。 */
  weapon_name: string;
  /** 出问题的 perk 名；与武器或 perk 无关的问题为空串。 */
  perk_name: string;
  /** 面向用户的一句话说明。 */
  message: string;
  /** 原文行。语法类问题只有把原文摆出来，用户才知道要改哪儿。 */
  raw_line?: string;
};

export type DimWishlistImportPreview = {
  token: string;
  file_name: string;
  title: string;
  rule_count: number;
  weapon_count: number;
  mode_counts: Record<DimWishlistMode, number>;
  authors: string[];
  tags: string[];
  fingerprint: string;
  /** 解析后**仍然有效**的规则数与被这些规则覆盖的武器数。 */
  importable_rule_count: number;
  importable_weapon_count: number;
  /** 按行忽略掉的规则数（真笔误）。 */
  skipped_row_count: number;
  /** 有行按笔误忽略掉的武器数。 */
  affected_weapon_count: number;
  /** 因「丢掉问题行后凑不成完整候选」而整体跳过的武器数。 */
  skipped_weapon_count: number;
  /**
   * 展开写法的冗余行数（T64）：同一把枪按「每栏任选其一」摊开写时多写的行——
   * 内容已被同一把枪留下的某一行整个包含，丢掉不改变任何匹配。它们**不写进库**，
   * 但也不是笔误，所以与 `skipped_row_count` 分开报。
   */
  merged_row_count: number;
  /** 有展开写法冗余行的武器数。 */
  merged_weapon_count: number;
  /** 每类问题的示例（服务层截断，条数另由 issue_count 给出）。 */
  issues: DimWishlistImportIssue[];
  issue_count: number;
  /** 这份预览是从链接读来的吗？是的话带上链接，确认时按链接来源落库、以后可以再同步。 */
  source_url?: string;
  final_url?: string;
};

/**
 * 从链接读取的结果。**没变**与**有内容待确认**是两件事：
 * 没变时不该给用户一个「要不要覆盖」的问题——那会让人以为内容真的变了。
 */
export type DimWishlistLinkReadResult = {
  /** 链接对应的那份来源内容与库里完全一致。 */
  unchanged: boolean;
  source_url: string;
  /** 内容没变时，告诉用户库里是哪一份来源已经是这个内容。 */
  source_name: string;
  /** 内容有变化（或这是首次导入）时给出的预览；没变时为 null。 */
  preview: DimWishlistImportPreview | null;
};

export function parseDimWishlist(text: string): DimWishlist {
  return parseDimWishlistWithIssues(text).wishlist;
}

/**
 * 解析 + 行级问题清单。`parseDimWishlist` 只是它丢掉 issues 的薄壳——**只有一份语法实现**。
 */
export function parseDimWishlistWithIssues(text: string): {
  wishlist: DimWishlist;
  issues: DimWishlistParseIssue[];
} {
  // 解析器不造名字：没有 title: 声明就留空，来源名一律由用户在导入时输入。
  let title = "";
  let description = "";
  let author = "";
  let hasWishlistTitle = false;
  let sourceTitle = "";
  let sourceDescription = "";
  let blockMetadata: WishlistMetadata = {};
  let currentBlockId = "";
  let lineNumber = 0;
  const sourceBlocks: DimWishlistSourceBlock[] = [];
  const rules: DimWishlistRule[] = [];
  const issues: DimWishlistParseIssue[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    lineNumber += 1;
    const line = rawLine.trim();
    if (!line) continue;

    const comment = line.startsWith("//") ? line.slice(2).trim() : "";
    const declaration = comment || line;

    if (startsWithField(declaration, "title")) {
      const value = fieldValue(declaration);
      if (!hasWishlistTitle) {
        title = value || title;
        hasWishlistTitle = true;
      } else {
        sourceTitle = value;
        sourceDescription = "";
        blockMetadata = {};
        currentBlockId = "";
      }
      continue;
    }
    if (startsWithField(declaration, "description")) {
      if (sourceTitle) {
        sourceDescription = fieldValue(declaration);
        currentBlockId = "";
      }
      else description = fieldValue(declaration);
      continue;
    }
    if (startsWithField(declaration, "author")) {
      author = fieldValue(declaration);
      blockMetadata.author = author || blockMetadata.author;
      currentBlockId = "";
      continue;
    }

    if (comment) {
      const metadata = parseMetadata(comment);
      if (metadata.note || metadata.tags?.length || metadata.author) {
        blockMetadata = metadata;
        currentBlockId = "";
      }
      continue;
    }

    const match = line.match(/^dimwishlist:item=(\d+)&perks=([0-9,]*)(?:#(.*))?$/i);
    if (!match) {
      // 注释与 title/description/author 已在上面处理掉了，剩下两类：
      // 「看起来打算写成规则」的行（`dimwishlist:` 开头但语法不成立）与纯散文。
      // 只报前者——否则一份带说明头的文件会刷出满屏「问题行」，把真笔误淹掉。
      if (/^dimwishlist:/i.test(line)) {
        const looseHash = line.match(/item=(\d+)/);
        issues.push({
          line_number: lineNumber,
          category: "unparseable_rule",
          raw_line: line,
          ...(looseHash ? { item_hash: Number(looseHash[1]) } : {})
        });
      }
      continue;
    }

    const inlineMetadata = parseMetadata(match[3] ?? "");
    const metadata = mergeMetadata(blockMetadata, inlineMetadata);
    const itemHash = Number(match[1]);
    const writtenHashes = match[2].split(",").filter(Boolean).map(Number);
    const perkHashes = writtenHashes.filter(isUnsignedHash);
    if (isUnsignedHash(itemHash)) {
      // 重复 perk 只有在去重前才看得见，所以在这里记——下游拿到的规则已经是去重过的。
      const repeated = firstRepeatedHash(perkHashes);
      if (repeated !== undefined) {
        issues.push({
          line_number: lineNumber,
          category: "duplicate_perk",
          raw_line: line,
          item_hash: itemHash,
          perk_hash: repeated
        });
      }
      const sourceBlockId = ensureSourceBlock({
        currentBlockId,
        sourceBlocks,
        title: sourceTitle,
        description: sourceDescription,
        metadata: blockMetadata
      });
      if (sourceBlockId) currentBlockId = sourceBlockId;
      const note = inlineMetadata.note ?? "";
      rules.push({
        item_hash: itemHash,
        perk_hashes: [...new Set(perkHashes)],
        ...(perkHashes.length === 0 ? { kind: "weapon_only" as const } : {}),
        mode: modeFromMetadata([blockMetadata.note, note].filter(Boolean).join(" | "), metadata.tags ?? []),
        note,
        line_number: lineNumber,
        ...(inlineMetadata.tags?.length ? { tags: inlineMetadata.tags } : {}),
        ...(inlineMetadata.author ? { author: inlineMetadata.author } : {}),
        ...(sourceBlockId ? { source_block_id: sourceBlockId } : {})
      });
    } else {
      // 语法成立但 Hash 超出 32 位：同样是笔误行，报出来而不是静默丢掉。
      issues.push({ line_number: lineNumber, category: "unparseable_rule", raw_line: line });
    }
  }

  return {
    wishlist: {
      title,
      ...(description ? { description } : {}),
      ...(author ? { author } : {}),
      ...(sourceBlocks.length ? { source_blocks: sourceBlocks } : {}),
      rules
    },
    issues
  };
}

export function resolveDimWishlistRuleMetadata(
  wishlist: DimWishlist,
  rule: DimWishlistRule
): {
  note: string;
  tags: string[];
  author?: string;
  source_title?: string;
  source_description?: string;
} {
  const block = rule.source_block_id
    ? wishlist.source_blocks?.find((entry) => entry.id === rule.source_block_id)
    : undefined;
  return {
    note: [block?.note ?? rule.source_note, rule.note].filter(Boolean).join(" | "),
    tags: [...new Set([...(block?.tags ?? []), ...(rule.tags ?? [])])],
    ...(rule.author || block?.author || wishlist.author
      ? { author: rule.author || block?.author || wishlist.author }
      : {}),
    ...(block?.title || rule.source_title ? { source_title: block?.title || rule.source_title } : {}),
    ...(block?.description || rule.source_description
      ? { source_description: block?.description || rule.source_description }
      : {})
  };
}

type WishlistMetadata = {
  note?: string;
  tags?: string[];
  author?: string;
};

function parseMetadata(value: string): WishlistMetadata {
  const metadata: WishlistMetadata = {};
  for (const segment of value.split("|")) {
    const separator = segment.indexOf(":");
    if (separator < 0) continue;
    const key = segment.slice(0, separator).trim().toLowerCase();
    const decoded = decodeValue(segment.slice(separator + 1));
    if (!decoded) continue;
    if (key === "notes" || key === "note") metadata.note = decoded;
    if (key === "author") metadata.author = decoded;
    if (key === "tags") {
      metadata.tags = decoded.split(/[\s,]+/).map((tag) => tag.trim()).filter(Boolean);
    }
  }
  return metadata;
}

function mergeMetadata(left: WishlistMetadata, right: WishlistMetadata): WishlistMetadata {
  return {
    ...(left.note || right.note ? { note: [left.note, right.note].filter(Boolean).join(" | ") } : {}),
    ...(left.author || right.author ? { author: right.author || left.author } : {}),
    ...((left.tags?.length || right.tags?.length)
      ? { tags: [...new Set([...(left.tags ?? []), ...(right.tags ?? [])])] }
      : {})
  };
}

function ensureSourceBlock(input: {
  currentBlockId: string;
  sourceBlocks: DimWishlistSourceBlock[];
  title: string;
  description: string;
  metadata: WishlistMetadata;
}): string {
  if (input.currentBlockId) return input.currentBlockId;
  if (!input.title && !input.description && !input.metadata.note && !input.metadata.tags?.length && !input.metadata.author) {
    return "";
  }
  const id = `source-${input.sourceBlocks.length + 1}`;
  input.sourceBlocks.push({
    id,
    ...(input.title ? { title: input.title } : {}),
    ...(input.description ? { description: input.description } : {}),
    ...(input.metadata.note ? { note: input.metadata.note } : {}),
    ...(input.metadata.tags?.length ? { tags: input.metadata.tags } : {}),
    ...(input.metadata.author ? { author: input.metadata.author } : {})
  });
  return id;
}

function modeFromMetadata(note: string, tags: string[]): DimWishlistMode {
  const normalized = `${note} ${tags.join(" ")}`.toLowerCase();
  if (normalized.includes("pve")) return "pve";
  if (normalized.includes("pvp")) return "pvp";
  return "general";
}

function startsWithField(value: string, field: string): boolean {
  return value.toLowerCase().startsWith(`${field}:`);
}

function fieldValue(value: string): string {
  return decodeValue(value.slice(value.indexOf(":") + 1));
}

function decodeValue(value: string): string {
  const trimmed = value.trim();
  try {
    return decodeURIComponent(trimmed).trim();
  } catch {
    return trimmed;
  }
}

function isUnsignedHash(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;
}

/** 第一个重复出现的值；没有重复就是 undefined。 */
function firstRepeatedHash(values: readonly number[]): number | undefined {
  const seen = new Set<number>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return undefined;
}
