import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

/**
 * 人工推荐表格的**文件层适配**（Bug #89）。
 *
 * 用户拿来的是一张「表」：可能是 CSV，也可能是在 Excel 里维护的 `.xlsx`。
 * 识别与展开只在本文件里发生——下游（表头识别、语义校验、来源切分、写库）
 * 一律只看到与 CSV 同形的分隔文本，见 `development.md` 的单向链路
 * 「来源格式 → 解析适配 → 来源实例与规则 → 事实 → 消费」。
 *
 * 为什么按**字节**而不是扩展名判：用户把 Excel 文件存成 `.csv` 名字、
 * 或把导出的 CSV 改叫 `.xlsx` 都很常见，按扩展名判会在最不该出错的地方出错。
 *
 * 这里手写最小 XLSX 读取而不引第三方依赖：需要的只是「ZIP 里的两个 XML」，
 * 引一个解析库要连带更新第三方许可证清单（`pnpm licenses:generate`），
 * 代价大于收益。
 */

const ZIP_LOCAL_FILE_SIGNATURE = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const OLE2_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0] as const;

/**
 * 读出一个表格文件的内容，返回**表头 + 数据行**的分隔文本。
 *
 * - Excel 工作簿（`.xlsx` / `.xlsm`）：取第一个工作表，按单元格引用还原列位置；
 * - 旧版二进制工作簿（`.xls`）：明确告知另存，不做半吊子解析；
 * - 其余：按 UTF-8 文本读（CSV）。
 */
export function readRecommendationTableText(path: string): string {
  const bytes = readFileSync(path);
  if (isZipArchive(bytes)) return xlsxToDelimitedText(bytes);
  if (isOle2Workbook(bytes)) {
    throw new Error("这是旧版 Excel 工作簿（.xls）：请在 Excel 里另存为 .xlsx 或 CSV 后再导入。");
  }
  return bytes.toString("utf8");
}

/** 分隔文本里一个值的安全写法：含分隔符 / 引号 / 换行时加引号并转义。 */
export function escapeDelimitedValue(value: string | number): string {
  const text = String(value ?? "");
  return /[",\r\n]/u.test(text) ? `"${text.replace(/"/gu, '""')}"` : text;
}

function isZipArchive(bytes: Buffer): boolean {
  return bytes.length >= 4 && bytes.readUInt32LE(0) === ZIP_LOCAL_FILE_SIGNATURE;
}

function isOle2Workbook(bytes: Buffer): boolean {
  return bytes.length >= 8 && OLE2_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

type ZipEntry = {
  name: string;
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
};

function readZipEntries(bytes: Buffer): ZipEntry[] {
  const directoryEnd = findEndOfCentralDirectory(bytes);
  if (directoryEnd < 0) throw new Error("这个表格文件已损坏：找不到 ZIP 目录记录。");
  const entryCount = bytes.readUInt16LE(directoryEnd + 10);
  let offset = bytes.readUInt32LE(directoryEnd + 16);
  const entries: ZipEntry[] = [];
  for (let index = 0; index < entryCount; index++) {
    if (offset + 46 > bytes.length || bytes.readUInt32LE(offset) !== ZIP_CENTRAL_DIRECTORY_SIGNATURE) {
      throw new Error("这个表格文件已损坏：ZIP 目录记录不完整。");
    }
    const nameLength = bytes.readUInt16LE(offset + 28);
    entries.push({
      name: bytes.toString("utf8", offset + 46, offset + 46 + nameLength),
      method: bytes.readUInt16LE(offset + 10),
      compressedSize: bytes.readUInt32LE(offset + 20),
      localHeaderOffset: bytes.readUInt32LE(offset + 42)
    });
    offset += 46 + nameLength + bytes.readUInt16LE(offset + 30) + bytes.readUInt16LE(offset + 32);
  }
  return entries;
}

function findEndOfCentralDirectory(bytes: Buffer): number {
  const minimumOffset = Math.max(0, bytes.length - 22 - 0xffff);
  for (let offset = bytes.length - 22; offset >= minimumOffset; offset--) {
    if (bytes.readUInt32LE(offset) === ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE) return offset;
  }
  return -1;
}

function readZipEntry(bytes: Buffer, entry: ZipEntry): Buffer {
  const headerOffset = entry.localHeaderOffset;
  if (bytes.readUInt32LE(headerOffset) !== ZIP_LOCAL_FILE_SIGNATURE) {
    throw new Error("这个表格文件已损坏：ZIP 条目头无效。");
  }
  const nameLength = bytes.readUInt16LE(headerOffset + 26);
  const extraLength = bytes.readUInt16LE(headerOffset + 28);
  const start = headerOffset + 30 + nameLength + extraLength;
  const data = bytes.subarray(start, start + entry.compressedSize);
  if (entry.method === 0) return data;
  if (entry.method === 8) {
    try {
      return inflateRawSync(data);
    } catch {
      throw new Error("这个表格文件已损坏：ZIP 条目无法解压。");
    }
  }
  throw new Error(`这个表格文件使用了不支持的压缩方式（${entry.method}）。`);
}

function xlsxToDelimitedText(bytes: Buffer): string {
  const entries = new Map(readZipEntries(bytes).map((entry) => [entry.name, entry]));
  const workbook = entries.get("xl/workbook.xml");
  if (!workbook) {
    throw new Error(
      "这个压缩包里没有 Excel 工作表（缺少 xl/workbook.xml）：如果是 .ods 等其它格式，请在表格软件里另存为 .xlsx 或 CSV。"
    );
  }
  const sheetPath = firstWorksheetPath(bytes, entries, readZipEntry(bytes, workbook).toString("utf8"));
  const sheet = entries.get(sheetPath);
  if (!sheet) throw new Error(`这个 Excel 工作簿缺少第一个工作表（${sheetPath}）。`);
  const sharedStrings = entries.get("xl/sharedStrings.xml");
  const rows = parseWorksheetRows(
    readZipEntry(bytes, sheet).toString("utf8"),
    sharedStrings ? parseSharedStrings(readZipEntry(bytes, sharedStrings).toString("utf8")) : []
  );
  return rowsToDelimitedText(rows);
}

/**
 * 第一个工作表：先按 `xl/workbook.xml` 的顺序取第一条 `<sheet>`，
 * 再用它引用的关系 ID 到 `xl/_rels/workbook.xml.rels` 换真实路径——
 * 工作表文件名不保证是 `sheet1.xml`，按名字猜会读到错误的那一张表。
 */
function firstWorksheetPath(
  bytes: Buffer,
  entries: Map<string, ZipEntry>,
  workbookXml: string
): string {
  const sheetTag = workbookXml.match(/<sheet\b[^>]*\/?>/u)?.[0] ?? "";
  const relationshipId = attributeValue(sheetTag, "r:id") ?? attributeValue(sheetTag, "id");
  const relationships = entries.get("xl/_rels/workbook.xml.rels");
  if (relationshipId && relationships) {
    const relsXml = readZipEntry(bytes, relationships).toString("utf8");
    const relTag = [...relsXml.matchAll(/<Relationship\b[^>]*\/?>/gu)]
      .map((match) => match[0])
      .find((tag) => attributeValue(tag, "Id") === relationshipId);
    const target = relTag ? attributeValue(relTag, "Target") : undefined;
    if (target) return normalizeWorksheetTarget(target);
  }
  return "xl/worksheets/sheet1.xml";
}

/** `Target` 可能是 `worksheets/sheet1.xml`（相对 `xl/`）或 `/xl/worksheets/sheet1.xml`（绝对）。 */
function normalizeWorksheetTarget(target: string): string {
  const trimmed = target.replace(/^\/+/u, "");
  return trimmed.startsWith("xl/") ? trimmed : `xl/${trimmed}`;
}

function parseSharedStrings(xml: string): string[] {
  const strings: string[] = [];
  for (const match of xml.matchAll(/<si\b[^>]*\/>|<si\b[^>]*>([\s\S]*?)<\/si>/gu)) {
    strings.push(runsText(match[1] ?? ""));
  }
  return strings;
}

function parseWorksheetRows(xml: string, sharedStrings: string[]): string[][] {
  const rows: string[][] = [];
  for (const rowMatch of xml.matchAll(/<row\b[^>]*\/>|<row\b[^>]*>([\s\S]*?)<\/row>/gu)) {
    const cells: string[] = [];
    let nextColumnIndex = 0;
    for (const cellMatch of (rowMatch[1] ?? "").matchAll(/<c\b([^>]*?)\/>|<c\b([^>]*?)>([\s\S]*?)<\/c>/gu)) {
      const attributes = cellMatch[1] ?? cellMatch[2] ?? "";
      const body = cellMatch[3] ?? "";
      const reference = attributeValue(attributes, "r");
      const columnIndex = reference ? columnIndexFromReference(reference) : nextColumnIndex;
      if (columnIndex === undefined) continue;
      nextColumnIndex = columnIndex + 1;
      cells[columnIndex] = cellText(attributeValue(attributes, "t"), body, sharedStrings);
    }
    rows.push(Array.from({ length: cells.length }, (_, index) => cells[index] ?? ""));
  }
  return rows;
}

function cellText(type: string | undefined, body: string, sharedStrings: string[]): string {
  if (type === "inlineStr") return runsText(body);
  const value = tagText(body, "v");
  if (type === "s") {
    const index = Number(value);
    return Number.isInteger(index) && index >= 0 && index < sharedStrings.length ? sharedStrings[index] : "";
  }
  if (type === "b") return value === "0" ? "FALSE" : value ? "TRUE" : "";
  if (type === "e") return "";
  return decodeXmlText(value);
}

/** 富文本单元格由多个 `<t>` 组成，拼接才是完整文本；`inlineStr` 的正文在 `<is>` 里。 */
function runsText(body: string): string {
  const container = tagText(body, "is");
  const source = container || body;
  const runs = [...source.matchAll(/<t\b[^>]*\/>|<t\b[^>]*>([\s\S]*?)<\/t>/gu)].map((match) => match[1] ?? "");
  return runs.length ? runs.map(decodeXmlText).join("") : decodeXmlText(source.replace(/<[^>]*>/gu, ""));
}

function tagText(body: string, tag: string): string {
  const match = body.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "u"));
  return match ? match[1] : "";
}

function attributeValue(attributes: string, name: string): string | undefined {
  const match = attributes.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`, "u"));
  return match ? decodeXmlText(match[1]) : undefined;
}

function columnIndexFromReference(reference: string): number | undefined {
  const letters = reference.match(/^[A-Za-z]+/u)?.[0];
  if (!letters) return undefined;
  let index = 0;
  for (const letter of letters.toUpperCase()) {
    index = index * 26 + (letter.charCodeAt(0) - 64);
  }
  return index - 1;
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&quot;/gu, "\"")
    .replace(/&apos;/gu, "'")
    .replace(/&#x([0-9a-fA-F]+);/gu, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/gu, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/gu, "&");
}

/**
 * 行补齐到**表头宽度**：表格文件里没有值的单元格会被整个省略，
 * 「末尾的备注是空的」与「这一行缺列」在文件里长得一模一样。
 * 不补齐的话，凡是最后一列留空的正常行都会被判成「列数不对」。
 *
 * 一个值都没有的行直接丢掉：Excel 里留下空行是常态，它与 CSV 里的空行是同一件事。
 */
function rowsToDelimitedText(rows: string[][]): string {
  const contentRows = rows.filter((row) => row.some((cell) => cell.trim()));
  if (!contentRows.length) throw new Error("这个 Excel 工作簿的第一个工作表是空的，没有可导入的内容。");
  const headerWidth = contentRows[0].length;
  return contentRows
    .map((row) => Array.from({ length: headerWidth }, (_, index) => row[index] ?? "")
      .map(escapeDelimitedValue)
      .join(","))
    .join("\r\n");
}
