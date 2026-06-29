import type { BuildGuideTaskState } from "../../../api/client";

export type KohinataTaskGroup = {
  title: string;
  items: string[];
};

export function formatKohinataTaskGroups(state: BuildGuideTaskState | null): KohinataTaskGroup[] {
  if (!state) {
    return [{ title: "小日向", items: ["粘贴攻略或配装说明后，可以解析攻略、对照账号并生成草稿。"] }];
  }

  return [
    { title: "原文", items: [state.raw_text] },
    {
      title: "解析攻略",
      items: state.parse_result
        ? [
          state.parse_result.requirement.class_name?.value ? `职业：${state.parse_result.requirement.class_name.value}` : "职业：未指定",
          state.parse_result.requirement.subclass?.value ? `子职业：${state.parse_result.requirement.subclass.value}` : "子职业：未指定",
          ...state.parse_result.requirement.exotic_armor.map((item) => `异域：${item.name}`),
          ...state.parse_result.requirement.weapons.map((item) => `武器：${item.name}`),
          ...state.parse_result.requirement.armor_stats.map((item) => `属性：${item.stat} ${item.minimum}`)
        ]
        : ["尚未解析"]
    },
    {
      title: "账号匹配",
      items: state.match_result
        ? [
          state.match_result.summary,
          ...state.match_result.matched_items.map((item) => `已拥有：${item.name}`),
          ...state.match_result.alternative_items.map((item) => `可替代：${item.name}，${item.reason}`)
        ]
        : ["尚未对照账号"]
    },
    {
      title: "查看缺口",
      items: state.match_result?.missing_requirements.length
        ? state.match_result.missing_requirements
        : ["暂无缺口或尚未对照账号"]
    },
    {
      title: "待确认",
      items: state.match_result?.needs_confirmation.length
        ? state.match_result.needs_confirmation
        : ["暂无待确认项"]
    },
    {
      title: "生成草稿",
      items: state.draft
        ? [
          state.draft.name,
          ...state.draft.items.map((item) => item.name),
          ...state.draft.missing_requirements.map((item) => `缺口：${item}`)
        ]
        : ["尚未生成草稿"]
    }
  ];
}
