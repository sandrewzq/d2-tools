import type {
  WeeklyFarmingCatalogActivity,
  WeeklyFarmingCatalogResource,
  WeeklyFarmingPatternProgress,
  WeeklyFarmingRequest,
  WeeklyFarmingActivityKind,
  WeeklyFarmingRotationActivity
} from "@d2-tools/core/weekly/farming";
import type { DefinitionComponentData, DefinitionRecord } from "@d2-tools/core/manifest/definitions";

export type ActivityLootDatasetItem = {
  item_hash: number;
  item_variant: "normal" | "adept" | "timelost" | "harrowed" | "reprised" | "other";
  /** 与 `WeeklyFarmingCatalogItem` 同一口径：数据集只到活动级（T91 第 12 节）。 */
  drop_scope: "activity";
  pattern_record_hash?: number;
};

export type ActivityLootDatasetActivity = {
  key: string;
  activity_hash: number;
  activity_kind: WeeklyFarmingActivityKind;
  names: string[];
  source_hash: number;
  source_label: string;
  source_url: string;
  source_license: string;
  evidence_note: string;
  generated_at: string;
  items: ActivityLootDatasetItem[];
};

export type ActivityLootDatasetV1 = {
  schema: "activity-loot.v1";
  revision: string;
  manifest_version: string;
  activities: ActivityLootDatasetActivity[];
};

/**
 * 关系由 scripts/generate-activity-loot.mjs 从 Bungie Collectible 的
 * sourceString / sourceHash 推出。署名只写这条真实来源：生成脚本本身就是出处，
 * 数据集没有再引用别的第三方索引。它确认「来自该活动」，不声称具体遭遇战；
 * 带（专家）/（失时）这类后缀的变体按武器计一次，只登记基础版本。
 */
const generatorScriptUrl = "https://github.com/sandrewzq/d2-tools/blob/main/scripts/generate-activity-loot.mjs";
const sourceLicense = "Bungie Manifest";

/** 与 `WeeklyFarmingCatalogItem` 的联合类型一致，供数据集校验使用。 */
const itemVariantValues = new Set(["normal", "adept", "timelost", "harrowed", "reprised", "other"]);
/** 掉落定位只到活动级，生成脚本也只产出这一个取值（T91 第 12 节）。 */
const dropScopeValues = new Set(["activity"]);
// #region activity-loot-dataset
// 本区由 scripts/generate-activity-loot.mjs 生成，手工改动会在下次生成时被覆盖。
const datasetRevision = "2026-09-18.1";
const datasetGeneratedAt = "2026-09-18";

export const activityLootDatasetV1: ActivityLootDatasetV1 = {
  schema: "activity-loot.v1",
  revision: datasetRevision,
  manifest_version: "244213.26.06.29.2000-1-bnet.65864",
  activities: [
    {
      key: "dungeon-300092127",
      activity_hash: 300092127,
      activity_kind: "dungeon",
      names: ["晚星之主"],
      source_hash: 2463956052,
      source_label: "Bungie Collectible：来源:晚星之主",
      source_url: generatorScriptUrl,
      source_license: sourceLicense,
      evidence_note: "当前 Manifest sourceHash 2463956052；仅确认活动级来源。",
      generated_at: datasetGeneratedAt,
      items: [
        { item_hash: 1111334348, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 2452936816, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 2452936817, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 2460368549, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 3102162710, item_variant: "normal", drop_scope: "activity" }
      ]
    },
    {
      key: "dungeon-313828469",
      activity_hash: 313828469,
      activity_kind: "dungeon",
      names: ["深渊机灵"],
      source_hash: 3288974535,
      source_label: "Bungie Collectible：来源:“深渊机灵”地牢",
      source_url: generatorScriptUrl,
      source_license: sourceLicense,
      evidence_note: "当前 Manifest sourceHash 3288974535；仅确认活动级来源。",
      generated_at: datasetGeneratedAt,
      items: [
        { item_hash: 1081724548, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 1585307805 },
        { item_hash: 1441805468, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 2287287549, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 2988180391, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 3625452995, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 4274165888, item_variant: "normal", drop_scope: "activity" }
      ]
    },
    {
      key: "dungeon-1077850348",
      activity_hash: 1077850348,
      activity_kind: "dungeon",
      names: ["预言"],
      source_hash: 506073192,
      source_label: "Bungie Collectible：来源:“预言”地牢",
      source_url: generatorScriptUrl,
      source_license: sourceLicense,
      evidence_note: "当前 Manifest sourceHash 506073192；仅确认活动级来源。",
      generated_at: datasetGeneratedAt,
      items: [
        { item_hash: 140914741, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 507038823, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 1091550016, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 1096206669, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 1200824700, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 1271343896, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 1476654960, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 1567585973, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 1626503676, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 2481758391, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 2742490609, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 2831259642, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 2831259643, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 2855157553, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 3326850591, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 3629968765, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 3669616453, item_variant: "normal", drop_scope: "activity" }
      ]
    },
    {
      key: "dungeon-1262462921",
      activity_hash: 1262462921,
      activity_kind: "dungeon",
      names: ["守望者尖塔"],
      source_hash: 1597738585,
      source_label: "Bungie Collectible：来源:“守望者尖塔”地牢",
      source_url: generatorScriptUrl,
      source_license: sourceLicense,
      evidence_note: "当前 Manifest sourceHash 1597738585；仅确认活动级来源。",
      generated_at: datasetGeneratedAt,
      items: [
        { item_hash: 355893876, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 408862798, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 1555959830, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 3418719964, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 3814261872, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 4070357005, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 4174431791, item_variant: "normal", drop_scope: "activity" }
      ]
    },
    {
      key: "dungeon-2004855007",
      activity_hash: 2004855007,
      activity_kind: "dungeon",
      names: ["战争领主的废墟"],
      source_hash: 613435025,
      source_label: "Bungie Collectible：来源:“战争领主的废墟”地牢",
      source_url: generatorScriptUrl,
      source_license: sourceLicense,
      evidence_note: "当前 Manifest sourceHash 613435025；仅确认活动级来源。",
      generated_at: datasetGeneratedAt,
      items: [
        { item_hash: 1054567917, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 2525261820, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 2554513694, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 3886719505, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 4119503981, item_variant: "normal", drop_scope: "activity" }
      ]
    },
    {
      key: "dungeon-2582501063",
      activity_hash: 2582501063,
      activity_kind: "dungeon",
      names: ["异端深渊"],
      source_hash: 1745960977,
      source_label: "Bungie Collectible：来源:“异端深渊”地牢",
      source_url: generatorScriptUrl,
      source_license: sourceLicense,
      evidence_note: "当前 Manifest sourceHash 1745960977；仅确认活动级来源。",
      generated_at: datasetGeneratedAt,
      items: [
        { item_hash: 208088207, item_variant: "normal", drop_scope: "activity" }
      ]
    },
    {
      key: "dungeon-2727361621",
      activity_hash: 2727361621,
      activity_kind: "dungeon",
      names: ["平衡"],
      source_hash: 3247513834,
      source_label: "Bungie Collectible：来源:平衡",
      source_url: generatorScriptUrl,
      source_license: sourceLicense,
      evidence_note: "当前 Manifest sourceHash 3247513834；仅确认活动级来源。",
      generated_at: datasetGeneratedAt,
      items: [
        { item_hash: 71057630, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 954563454, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 1085743380, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 1685137410, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 1863583117, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 2863808104, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 2873508409, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 4062069077, item_variant: "normal", drop_scope: "activity" }
      ]
    },
    {
      key: "dungeon-2823159265",
      activity_hash: 2823159265,
      activity_kind: "dungeon",
      names: ["二象性"],
      source_hash: 1282207663,
      source_label: "Bungie Collectible：来源:地牢“二象性”",
      source_url: generatorScriptUrl,
      source_license: sourceLicense,
      evidence_note: "当前 Manifest sourceHash 1282207663；仅确认活动级来源。",
      generated_at: datasetGeneratedAt,
      items: [
        { item_hash: 234411205, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 1400385226, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 1745368385, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 2194955522, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 2547048326 },
        { item_hash: 2263839058, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 1968204778 },
        { item_hash: 2862666249, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 3664831848, item_variant: "normal", drop_scope: "activity" }
      ]
    },
    {
      key: "dungeon-3834447244",
      activity_hash: 3834447244,
      activity_kind: "dungeon",
      names: ["分离教义"],
      source_hash: 2607970476,
      source_label: "Bungie Collectible：来源:分离教义",
      source_url: generatorScriptUrl,
      source_license: sourceLicense,
      evidence_note: "当前 Manifest sourceHash 2607970476；仅确认活动级来源。",
      generated_at: datasetGeneratedAt,
      items: [
        { item_hash: 331231237, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 388390591, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 1700366811, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 2213885190, item_variant: "normal", drop_scope: "activity" }
      ]
    },
    {
      key: "dungeon-4078656646",
      activity_hash: 4078656646,
      activity_kind: "dungeon",
      names: ["贪婪之握"],
      source_hash: 675740011,
      source_label: "Bungie Collectible：来源:“贪婪之握”地牢",
      source_url: generatorScriptUrl,
      source_license: sourceLicense,
      evidence_note: "当前 Manifest sourceHash 675740011；仅确认活动级来源。",
      generated_at: datasetGeneratedAt,
      items: [
        { item_hash: 386864872, item_variant: "reprised", drop_scope: "activity" },
        { item_hash: 944708986, item_variant: "reprised", drop_scope: "activity" },
        { item_hash: 1518956169, item_variant: "reprised", drop_scope: "activity" },
        { item_hash: 1648948519, item_variant: "reprised", drop_scope: "activity" }
      ]
    },
    {
      key: "raid-107319834",
      activity_hash: 107319834,
      activity_kind: "raid",
      names: ["克洛塔的末日"],
      source_hash: 1897187034,
      source_label: "Bungie Collectible：来源:“克洛塔的末日”突袭",
      source_url: generatorScriptUrl,
      source_license: sourceLicense,
      evidence_note: "当前 Manifest sourceHash 1897187034；仅确认活动级来源。",
      generated_at: datasetGeneratedAt,
      items: [
        { item_hash: 120706239, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 1741156110 },
        { item_hash: 833898322, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 1294327154 },
        { item_hash: 1034055198, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 1098171824, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 3250738778 },
        { item_hash: 1432682459, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 583710954 },
        { item_hash: 2828278545, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 3859670341 },
        { item_hash: 3163900678, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 411909019 },
        { item_hash: 3319810952, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 3319810953, item_variant: "normal", drop_scope: "activity" }
      ]
    },
    {
      key: "raid-119944200",
      activity_hash: 119944200,
      activity_kind: "raid",
      names: ["利维坦，星之塔"],
      source_hash: 1675483099,
      source_label: "Bungie Collectible：来源:利维坦,星之塔突袭巢穴。",
      source_url: generatorScriptUrl,
      source_license: sourceLicense,
      evidence_note: "当前 Manifest sourceHash 1675483099；仅确认活动级来源。",
      generated_at: datasetGeneratedAt,
      items: [
        { item_hash: 2084611899, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 4288031461, item_variant: "normal", drop_scope: "activity" }
      ]
    },
    {
      key: "raid-548750096",
      activity_hash: 548750096,
      activity_kind: "raid",
      names: ["往日之苦"],
      source_hash: 4246883461,
      source_label: "Bungie Collectible：来源:在“往日之苦”突袭中获得。",
      source_url: generatorScriptUrl,
      source_license: sourceLicense,
      evidence_note: "当前 Manifest sourceHash 4246883461；仅确认活动级来源。",
      generated_at: datasetGeneratedAt,
      items: [
        { item_hash: 1664372054, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 1931556011, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 2186258845, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 2753269585, item_variant: "normal", drop_scope: "activity" }
      ]
    },
    {
      key: "raid-910380154",
      activity_hash: 910380154,
      activity_kind: "raid",
      names: ["深岩墓室"],
      source_hash: 1405897559,
      source_label: "Bungie Collectible：来源:“深岩墓室”突袭",
      source_url: generatorScriptUrl,
      source_license: sourceLicense,
      evidence_note: "当前 Manifest sourceHash 1405897559；仅确认活动级来源。",
      generated_at: datasetGeneratedAt,
      items: [
        { item_hash: 1392919471, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 3370786210 },
        { item_hash: 2399110176, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 2990047042, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 924334687 },
        { item_hash: 3281285075, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 200612470 },
        { item_hash: 3366545721, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 399865831 },
        { item_hash: 4230965989, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 633869177 },
        { item_hash: 4248569242, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 4170453731 }
      ]
    },
    {
      key: "raid-960175301",
      activity_hash: 960175301,
      activity_kind: "raid",
      names: ["忧愁王冠"],
      source_hash: 3147603678,
      source_label: "Bungie Collectible：由突袭“忧愁王冠”获得。",
      source_url: generatorScriptUrl,
      source_license: sourceLicense,
      evidence_note: "当前 Manifest sourceHash 3147603678；仅确认活动级来源。",
      generated_at: datasetGeneratedAt,
      items: [
        { item_hash: 1286686760, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 1496419775, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 2338088853, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 3861448240, item_variant: "normal", drop_scope: "activity" }
      ]
    },
    {
      key: "raid-1042180643",
      activity_hash: 1042180643,
      activity_kind: "raid",
      names: ["救赎花园"],
      source_hash: 1491707941,
      source_label: "Bungie Collectible：来源:“救赎花园”突袭",
      source_url: generatorScriptUrl,
      source_license: sourceLicense,
      evidence_note: "当前 Manifest sourceHash 1491707941；仅确认活动级来源。",
      generated_at: datasetGeneratedAt,
      items: [
        { item_hash: 48643186, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 2901344468 },
        { item_hash: 147444292, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 2171799573 },
        { item_hash: 963574173, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 2901344468 },
        { item_hash: 1992309064, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 1824795112 },
        { item_hash: 2145441168, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 2313049397 },
        { item_hash: 2209003210, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 758530795 },
        { item_hash: 2241507890, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 4226043524 },
        { item_hash: 2408405461, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 4226043524 },
        { item_hash: 2720651699, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 758530795 },
        { item_hash: 2721249463, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 950932825 },
        { item_hash: 3385326721, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 1824795112 },
        { item_hash: 3454326177, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 2171799573 },
        { item_hash: 3621336854, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 22095468 },
        { item_hash: 4020742303, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 2313049397 },
        { item_hash: 4095896073, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 22095468 }
      ]
    },
    {
      key: "raid-1044919065",
      activity_hash: 1044919065,
      activity_kind: "raid",
      names: ["永恒沙漠"],
      source_hash: 596084342,
      source_label: "Bungie Collectible：来源:“永恒沙漠”突袭",
      source_url: generatorScriptUrl,
      source_license: sourceLicense,
      evidence_note: "当前 Manifest sourceHash 596084342；仅确认活动级来源。",
      generated_at: datasetGeneratedAt,
      items: [
        { item_hash: 688593230, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 1090936013, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 1202007252, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 1435808083, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 1553681400, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 2725426834, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 3241217409, item_variant: "normal", drop_scope: "activity" }
      ]
    },
    {
      key: "raid-1374392663",
      activity_hash: 1374392663,
      activity_kind: "raid",
      names: ["国王的陨落"],
      source_hash: 160129377,
      source_label: "Bungie Collectible：来源:“国王的陨落”突袭",
      source_url: generatorScriptUrl,
      source_license: sourceLicense,
      evidence_note: "当前 Manifest sourceHash 160129377；仅确认活动级来源。",
      generated_at: datasetGeneratedAt,
      items: [
        { item_hash: 431721920, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 437884069 },
        { item_hash: 1321506184, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 750389420 },
        { item_hash: 1802135586, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 1937552980, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 3650227809 },
        { item_hash: 2221264583, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 2069837521 },
        { item_hash: 3228096719, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 3255215894 },
        { item_hash: 3969066556, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 2546821156 }
      ]
    },
    {
      key: "raid-1441982566",
      activity_hash: 1441982566,
      activity_kind: "raid",
      names: ["门徒誓约"],
      source_hash: 1007078046,
      source_label: "Bungie Collectible：来源:“门徒誓约”突袭",
      source_url: generatorScriptUrl,
      source_license: sourceLicense,
      evidence_note: "当前 Manifest sourceHash 1007078046；仅确认活动级来源。",
      generated_at: datasetGeneratedAt,
      items: [
        { item_hash: 613334176, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 422252754 },
        { item_hash: 768621510, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 2896258222 },
        { item_hash: 999767358, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 989023188 },
        { item_hash: 2534546147, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 876397380 },
        { item_hash: 3428521585, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 3868889639 },
        { item_hash: 3505113722, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 3886416794, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 1057921323 }
      ]
    },
    {
      key: "raid-1541433876",
      activity_hash: 1541433876,
      activity_kind: "raid",
      names: ["救赎的边缘"],
      source_hash: 2700267533,
      source_label: "Bungie Collectible：来源:“救赎的边缘”突袭",
      source_url: generatorScriptUrl,
      source_license: sourceLicense,
      evidence_note: "当前 Manifest sourceHash 2700267533；仅确认活动级来源。",
      generated_at: datasetGeneratedAt,
      items: [
        { item_hash: 445197843, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 2043998246 },
        { item_hash: 535198113, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 1077926398 },
        { item_hash: 859869931, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 3842096181 },
        { item_hash: 1258168956, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 519472433 },
        { item_hash: 1770490683, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 3208349713 },
        { item_hash: 3284383335, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 3569407878, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 2577052324 }
      ]
    },
    {
      key: "raid-2122313384",
      activity_hash: 2122313384,
      activity_kind: "raid",
      names: ["最后一愿"],
      source_hash: 2455011338,
      source_label: "Bungie Collectible：来源:最后一愿突袭。",
      source_url: generatorScriptUrl,
      source_license: sourceLicense,
      evidence_note: "当前 Manifest sourceHash 2455011338；仅确认活动级来源。",
      generated_at: datasetGeneratedAt,
      items: [
        { item_hash: 568515759, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 2610512925 },
        { item_hash: 601592879, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 2906615623 },
        { item_hash: 654370424, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 1029956969 },
        { item_hash: 686951703, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 2360742598 },
        { item_hash: 2069224589, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 2545083870, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 2585307516 },
        { item_hash: 3799980700, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 3363925957 },
        { item_hash: 4094657108, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 4104745812 }
      ]
    },
    {
      key: "raid-2381413764",
      activity_hash: 2381413764,
      activity_kind: "raid",
      names: ["梦魇根源"],
      source_hash: 3190710249,
      source_label: "Bungie Collectible：来源:“梦魇根源”突袭",
      source_url: generatorScriptUrl,
      source_license: sourceLicense,
      evidence_note: "当前 Manifest sourceHash 3190710249；仅确认活动级来源。",
      generated_at: datasetGeneratedAt,
      items: [
        { item_hash: 135029084, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 700218081 },
        { item_hash: 231031173, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 1164396532 },
        { item_hash: 484515708, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 3743137436 },
        { item_hash: 1471212226, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 3838502045 },
        { item_hash: 1491665733, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 417302779 },
        { item_hash: 2972949637, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 2742412203 },
        { item_hash: 3371017761, item_variant: "normal", drop_scope: "activity" }
      ]
    },
    {
      key: "raid-2693136600",
      activity_hash: 2693136600,
      activity_kind: "raid",
      names: ["利维坦"],
      source_hash: 2653618435,
      source_label: "Bungie Collectible：来源:利维坦突袭。",
      source_url: generatorScriptUrl,
      source_license: sourceLicense,
      evidence_note: "当前 Manifest sourceHash 2653618435；仅确认活动级来源。",
      generated_at: datasetGeneratedAt,
      items: [
        { item_hash: 1018072983, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 1128225405, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 2505533224, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 3325744914, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 3380742308, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 3691881271, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 3906942101, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 3954531357, item_variant: "normal", drop_scope: "activity" }
      ]
    },
    {
      key: "raid-3089205900",
      activity_hash: 3089205900,
      activity_kind: "raid",
      names: ["世界吞噬者，利维坦"],
      source_hash: 2937902448,
      source_label: "Bungie Collectible：来源:世界吞噬者,利维坦突袭巢穴。",
      source_url: generatorScriptUrl,
      source_license: sourceLicense,
      evidence_note: "当前 Manifest sourceHash 2937902448；仅确认活动级来源。",
      generated_at: datasetGeneratedAt,
      items: [
        { item_hash: 2707464805, item_variant: "normal", drop_scope: "activity" },
        { item_hash: 3886263130, item_variant: "normal", drop_scope: "activity" }
      ]
    },
    {
      key: "raid-3881495763",
      activity_hash: 3881495763,
      activity_kind: "raid",
      names: ["玻璃拱顶"],
      source_hash: 2065138144,
      source_label: "Bungie Collectible：来源:“玻璃拱顶”突袭",
      source_url: generatorScriptUrl,
      source_license: sourceLicense,
      evidence_note: "当前 Manifest sourceHash 2065138144；仅确认活动级来源。",
      generated_at: datasetGeneratedAt,
      items: [
        { item_hash: 471518543, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 274032278 },
        { item_hash: 694500607, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 906267194 },
        { item_hash: 2171478765, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 322872771 },
        { item_hash: 2265407516, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 494198570 },
        { item_hash: 3186018373, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 1897800107 },
        { item_hash: 3197270240, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 906267194 },
        { item_hash: 3444688218, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 1897800107 },
        { item_hash: 3653573172, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 720869656 },
        { item_hash: 3654744298, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 274032278 },
        { item_hash: 3844610113, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 720869656 },
        { item_hash: 4050645223, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 494198570 },
        { item_hash: 4184168210, item_variant: "normal", drop_scope: "activity", pattern_record_hash: 322872771 },
        { item_hash: 4289226715, item_variant: "normal", drop_scope: "activity" }
      ]
    }
  ]
};
// #endregion activity-loot-dataset

export function matchActivityLootDataset(
  rotation: readonly WeeklyFarmingRotationActivity[],
  dataset: ActivityLootDatasetV1 = activityLootDatasetV1
): Array<{ rotation: WeeklyFarmingRotationActivity; activity?: ActivityLootDatasetActivity }> {
  return rotation.map((entry) => ({
    rotation: entry,
    activity: dataset.activities.find((candidate) => activityMatches(candidate, entry))
  }));
}

export function collectActivityLootItemHashes(
  request: WeeklyFarmingRequest,
  dataset: ActivityLootDatasetV1 = activityLootDatasetV1
): number[] {
  assertValidActivityLootDataset(dataset);
  return uniqueNumbers(matchActivityLootDataset(request.activities, dataset)
    .flatMap((match) => match.activity?.items.map((item) => item.item_hash) ?? []));
}

/**
 * 按活动 Hash 查询受控掉落数据集的武器清单，供首页核心活动卡装配掉落池。
 * 数据集未覆盖该活动时返回空数组，调用方回退到现有奖励展示。
 */
export function lootPoolItemHashesForActivity(
  activityHash: number,
  dataset: ActivityLootDatasetV1 = activityLootDatasetV1
): number[] {
  const activity = dataset.activities.find((candidate) => (
    toUnsignedHash(candidate.activity_hash) === toUnsignedHash(activityHash)
  ));
  return activity ? activity.items.map((item) => toUnsignedHash(item.item_hash)) : [];
}

export function buildWeeklyFarmingCatalogResource(input: {
  request: WeeklyFarmingRequest;
  manifestVersion?: string;
  itemDefinitions: DefinitionComponentData;
  profileRecords?: PatternRecordMap;
  /**
   * 组件 901 合并后的角色作用域 Record。图样 record 有一部分是角色作用域，
   * 只读 900 时这些武器会一直显示「没返回」（T91 第 12 节）。
   */
  characterRecords?: PatternRecordMap;
  patternReadFailed?: boolean;
  now?: Date;
  dataset?: ActivityLootDatasetV1;
}): WeeklyFarmingCatalogResource {
  const dataset = input.dataset ?? activityLootDatasetV1;
  assertValidActivityLootDataset(dataset);
  const matches = matchActivityLootDataset(input.request.activities, dataset);
  const warnings: string[] = [];
  const activities: WeeklyFarmingCatalogActivity[] = matches.map(({ rotation, activity }) => {
    if (!activity) {
      warnings.push(`${rotation.title} 尚未进入 activity-loot.v1 受控数据集。`);
      return {
        key: `uncovered:${rotation.kind}:${normalizeActivityName(rotation.title)}`,
        kind: rotation.kind,
        title: rotation.title,
        rotation_source: rotation.source ?? "Bungie 当前轮换",
        related_hashes: rotation.related_hashes ?? [],
        coverage: "not_covered",
        coverage_note: "当前轮换已确认，但活动掉落关系尚未完成证据核对。",
        items: []
      };
    }

    const items = activity.items.flatMap((item) => {
      const definition = input.itemDefinitions[String(toUnsignedHash(item.item_hash))] as DefinitionRecord | undefined;
      const name = definition?.displayProperties?.name?.trim();
      if (!definition || !name) {
        warnings.push(`${rotation.title} 的装备 ${item.item_hash} 在当前资料库中不存在，已停止展示。`);
        return [];
      }
      if (definition.itemType !== 3) {
        warnings.push(`${rotation.title} 的 ${name} 当前不是武器定义，已停止展示。`);
        return [];
      }
      return [{
        hash: toUnsignedHash(item.item_hash),
        name,
        icon: definition.displayProperties?.icon,
        item_type: definition.itemTypeDisplayName,
        variant: item.item_variant,
        drop_scope: item.drop_scope,
        source_hash: activity.source_hash,
        source_label: activity.source_label,
        source_url: activity.source_url,
        source_license: activity.source_license,
        generated_at: activity.generated_at,
        pattern: buildPatternProgress(
          item.pattern_record_hash,
          input.profileRecords,
          input.characterRecords,
          input.patternReadFailed === true
        )
      }];
    });

    if (items.length !== activity.items.length) {
      warnings.push(`${rotation.title} 的受控掉落关系与当前资料库不完全一致。`);
    }
    return {
      key: activity.key,
      kind: activity.activity_kind,
      title: rotation.title,
      rotation_source: rotation.source ?? "Bungie 当前轮换",
      related_hashes: rotation.related_hashes ?? [],
      coverage: "confirmed_activity_source",
      coverage_note: `${activity.evidence_note} 不包含具体遭遇战分配。`,
      items
    };
  });

  if (input.patternReadFailed) {
    warnings.push("Bungie 图样进度读取失败；活动与装备来源仍可使用。 ");
  }
  if (input.manifestVersion && input.manifestVersion !== dataset.manifest_version) {
    warnings.push(`掉落关系核对于 ${dataset.manifest_version}；当前资料库为 ${input.manifestVersion}。装备 Hash 仍存在，但活动来源关系需要随下一版数据集重新核对。`);
  }
  const matchedCount = activities.filter((activity) => activity.coverage === "confirmed_activity_source").length;
  const status = activities.length === 0
    ? "unavailable"
    : matchedCount === activities.length && !warnings.length && !input.patternReadFailed
      ? "ready"
      : "partial";

  return {
    schema: dataset.schema,
    revision: dataset.revision,
    manifest_version: input.manifestVersion,
    verified_manifest_version: dataset.manifest_version,
    reset_at: input.request.reset_at,
    fetched_at: (input.now ?? new Date()).toISOString(),
    status,
    activities,
    warnings: uniqueStrings(warnings.map((warning) => warning.trim()).filter(Boolean))
  };
}

export function validateActivityLootDataset(dataset: ActivityLootDatasetV1): string[] {
  const errors: string[] = [];
  const activityKeys = new Set<string>();
  for (const activity of dataset.activities) {
    if (!activity.key.trim()) errors.push("活动 key 不能为空。");
    if (activityKeys.has(activity.key)) errors.push(`活动 key 重复：${activity.key}`);
    activityKeys.add(activity.key);
    if (!Number.isFinite(activity.activity_hash)) errors.push(`${activity.key} 缺少有效 activity_hash。`);
    if (!Number.isFinite(activity.source_hash)) errors.push(`${activity.key} 缺少有效 source_hash。`);
    if (!activity.activity_kind.trim()
      || (activity.activity_kind !== "raid" && activity.activity_kind !== "dungeon")) {
      errors.push(`${activity.key} 的 activity_kind 不是受支持的取值。`);
    }
    if (!activity.names.some((name) => name.trim())) errors.push(`${activity.key} 缺少可匹配的正式名称。`);
    if (!activity.source_url.startsWith("https://")) errors.push(`${activity.key} 缺少可追溯的 HTTPS 来源。`);
    if (!activity.source_license.trim()) errors.push(`${activity.key} 缺少来源许可说明。`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(activity.generated_at)) errors.push(`${activity.key} 的 generated_at 无效。`);
    if (!activity.items.length) errors.push(`${activity.key} 没有任何受控装备关系。`);
    const itemHashes = new Set<number>();
    for (const item of activity.items) {
      const hash = toUnsignedHash(item.item_hash);
      if (!hash) errors.push(`${activity.key} 存在无效装备 Hash。`);
      if (itemHashes.has(hash)) errors.push(`${activity.key} 重复登记装备 ${hash}。`);
      itemHashes.add(hash);
      // 取值是闭集合，数据集又是可手改的生成区，写错一个词界面会静默按未知值渲染。
      if (!itemVariantValues.has(item.item_variant)) {
        errors.push(`${activity.key} 的装备 ${hash} 用了未知 item_variant：${item.item_variant}`);
      }
      if (!dropScopeValues.has(item.drop_scope)) {
        errors.push(`${activity.key} 的装备 ${hash} 用了未知 drop_scope：${item.drop_scope}`);
      }
    }
  }
  return uniqueStrings(errors);
}

function assertValidActivityLootDataset(dataset: ActivityLootDatasetV1): void {
  const errors = validateActivityLootDataset(dataset);
  if (errors.length) {
    throw new Error(`activity-loot.v1 校验失败：${errors.join("；")}`);
  }
}

/**
 * 一条 Record 进度。`state` 是 Bungie 的位域，`objectives` 只取图样进度需要的字段。
 */
type PatternRecordProgress = {
  state?: number;
  objectives?: Array<{
    progress?: number;
    completionValue?: number;
    complete?: boolean;
    visible?: boolean;
  }>;
};

type PatternRecordMap = Record<string, PatternRecordProgress>;

function buildPatternProgress(
  recordHash: number | undefined,
  profileRecords: PatternRecordMap | undefined,
  characterRecords: PatternRecordMap | undefined,
  readFailed: boolean
): WeeklyFarmingPatternProgress {
  // 数据集没给这把武器写图样记录，与「这把武器不可制作」是两回事：前者是缺数据，
  // 后者是确定的结论，报成后者会把「没查过」说成「不用查」（T91 第 6 节）。
  if (recordHash === undefined) return { status: "unavailable", reason: "pattern_not_mapped" };
  if (readFailed) return { status: "unavailable", record_hash: recordHash, reason: "read_failed" };
  // 图样 record 有账号作用域和角色作用域两种，后者只随组件 901 返回。本机 Manifest 里
  // 183 条武器模式 record 有 32 条是角色作用域，只看 900 会把它们一律报成「没返回」
  // （T91 第 12 节）。
  const key = String(toUnsignedHash(recordHash));
  const record = profileRecords?.[key] ?? characterRecords?.[key];
  if (!record) return { status: "unavailable", record_hash: recordHash, reason: "not_returned" };
  const state = record.state ?? 0;
  if ((state & 32) !== 0) {
    return { status: "unavailable", record_hash: recordHash, reason: "entitlement_unowned" };
  }
  // 位 2 是 Bungie 的 RewardUnavailable：记录自己说这一项的奖励当前不可用。
  if ((state & 2) !== 0) {
    return { status: "unavailable", record_hash: recordHash, reason: "reward_unavailable" };
  }
  if ((state & 8) !== 0 || (state & 16) !== 0) {
    return { status: "unavailable", record_hash: recordHash, reason: "record_hidden" };
  }
  const objective = record.objectives?.find((candidate) => (
    candidate.visible !== false
    && typeof candidate.completionValue === "number"
    && candidate.completionValue > 0
  ));
  if (!objective?.completionValue) {
    return { status: "unavailable", record_hash: recordHash, reason: "objective_missing" };
  }
  // 进度值缺失时不退回 0：`0 / N` 会被读成「一点没打」，实际是这次没读到（T91 第 12 节）。
  if (typeof objective.progress !== "number") {
    return { status: "unavailable", record_hash: recordHash, reason: "progress_missing" };
  }
  const completionValue = Math.max(1, objective.completionValue);
  const progress = Math.min(completionValue, Math.max(0, objective.progress));
  const complete = objective.complete === true || progress >= completionValue;
  return {
    status: complete ? "complete" : "in_progress",
    record_hash: toUnsignedHash(recordHash),
    progress,
    completion_value: completionValue,
    remaining: Math.max(0, completionValue - progress)
  };
}

function activityMatches(
  candidate: ActivityLootDatasetActivity,
  rotation: WeeklyFarmingRotationActivity
): boolean {
  if (candidate.activity_kind !== rotation.kind) return false;
  // 只认 Hash。名称子串回落会把「名字像」当成「是同一个活动」，进而把数据集没覆盖的
  // 活动报成已覆盖（T91 第 12 节）。
  const hashes = new Set((rotation.related_hashes ?? []).map(toUnsignedHash));
  return hashes.has(toUnsignedHash(candidate.activity_hash));
}

function normalizeActivityName(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[：:·'’“”\-\s]/g, "");
}

function toUnsignedHash(value: number): number {
  return Number(value) >>> 0;
}

function uniqueNumbers(values: number[]): number[] {
  return [...new Set(values.map(toUnsignedHash))];
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}
