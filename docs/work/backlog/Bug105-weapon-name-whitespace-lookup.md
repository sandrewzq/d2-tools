# Bug #105 武器名中间多一个空格，导入就报「找不到可核对的武器」

## 症状

导入 `LGpig推荐表_导入模板.csv`（344 行）时提示「29 行异常将忽略」，其中 23 行给的结论是：

> 无法根据官方中文名称找到可核对的武器；请补充武器 ID。

这 23 行的武器名去掉空格后，**每一条**都能在资料库里精确命中。例如文件里写 `黑桃 A`，官方名是 `黑桃A`；写 `迪凯特 02`，官方名是 `迪凯特02`。

29 = 23（名字对不上）+ 6（同武器同来源重复，那 6 行是重名问题，见 Bug #106）。

## 根因

同一件事——「这个名字是不是那件装备」——在应用里有两套口径：

| 位置 | 口径 |
|---|---|
| 校验侧 `normalizeName` | NFKC + 小写 + 删掉所有标点、空格、空白 |
| 查找侧 `normalizeSearchText` | 只 `trim` + 小写 |

校验侧认 `黑桃 A`，查找侧不认。而导入的顺序是**先查 hash、后做校验**：

`collectWeaponRecommendationDefinitionHashes`（`packages/services/src/community/weaponRecommendationKnowledge.ts:289`）先按行里的武器名取定义 hash，再用这批 hash 加载官方定义，作为校验期唯一的定义池。名字查不到 hash 的行装不进池子，校验期遍历池子自然找不到它，只能报「找不到可核对的武器」——提示指的方向（名字不对）和真实原因（查找口径太窄）正好相反。

两条取 hash 的通路都会落空：

- `searchItems` → SQLite 的 `searchHashes` 用 `instr(search_text, ?) > 0`，连续子串匹配，中间多一个空格就断。
- `getItemHashesByExactName` → `WHERE name = ? OR search_text = ?`，等值比对，同样落空。

**不能靠「删掉中文与字母数字之间的空格」这条规则修。** 资料库里有 12 条官方中文名自带空格（`5p 3AR`、`星旅者 7M`、`布瑞科技RWP Mk.II`……），按位置猜空格只会把本来对的名字改错。

## 修法

把「查表用的名字规范化」收敛成一份实现，两侧共用。

- 新增 `packages/services/src/gameData/lookupText.ts:9` 的 `normalizeLookupText`：NFKC + 小写 + 删掉 `[\p{P}\p{Z}\s]+`。规则与原来的校验侧逐字相同。
- 校验侧 `normalizeName`（`weaponRecommendationKnowledge.ts:1124`）改成它的别名，行为不变。
- 查找侧加**规范化名兜底**，原样比对仍排在最前，命中不了才用折叠后的名字补一轮：
  - `searchHashes` 追加 `OR hash IN (...)`，把折叠后匹配到的 hash 并进同一条查询，一起参与排序与代表版本折叠。
  - `queryItemHashesByExactName` 在原有等值查询之后补一轮折叠名等值查表。
  - 折叠表**惰性构建**：`search_documents` 里 kind=item 的全部名字建一次 `Map<折叠名, hash[]>`，本机 14406 行实测约 13ms，一个索引实例只建一次（`sqliteSearchIndex.ts:279`）。
- `memoryCatalog.ts`、`jsonCatalog.ts` 的 `getItemHashesByExactName` 同步改用同一份折叠，三个 catalog 实现口径一致。
- `searchIndex.ts` 的接口注释从「精确官方名」改成说明折叠规则。

## 影响面

只动 `packages/services` 的查找与校验口径，没有改导入流程、表头契约和错误文案。修好之后这 23 行会进入正常的逐行校验——**perk 栏位、大师、起源特性这些字段是第一次真正被校验**，之前它们在名字这一步就被拦下了。如果其中某行还有别的字段问题，会以新的提示出现，那属于新问题，不是本 Bug 没修干净。

## 回归覆盖

`packages/services/test/gameData.sqliteSearchIndex.test.ts` 新增一个用例：夹具里加一件官方名连写的装备（`Compact02`），断言 `Compact 02`、`compact-02` 两种写法在「取 hash」和「搜索」两个接口上都能命中。用例写在现有测试文件里，没有新增测试文件。

## 尚未验证

需要先 build，再拿同一份 CSV 走一次真实导入，确认 23 行消失、总量对得上。**本地尚未运行**：未运行本地自动化验证，由后续本地测试、CI 或 Release 负责。
