import type { AccountItemSummary } from "../../../api/client";

export type AssistantTaskStep = {
  id: string;
  text: string;
};

export type AssistantTaskLinkedItem = {
  hash: number;
  name: string;
  group_label: string;
  item_type?: string;
};

export type AssistantTaskTreeGroup = {
  title: string;
  items: string[];
};

export type AssistantTaskContext = {
  title: string;
  rawText: string;
  steps: AssistantTaskStep[];
  linkedItems: AssistantTaskLinkedItem[];
  aiQuestions: string[];
  treeGroups: AssistantTaskTreeGroup[];
};

export function buildAssistantTaskContext(input: {
  text: string;
  accountItems: AccountItemSummary[];
  pageContextFacts: string[];
}): AssistantTaskContext {
  const lines = input.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const title = lines[0] ?? "未命名任务 / 攻略";
  const steps = extractSteps(lines);
  const linkedItems = findLinkedItems(input.text, input.accountItems);
  const aiQuestions = [
    "根据当前账号数据，哪些攻略要求已经满足？",
    "哪些装备、属性或模组还缺，需要优先去刷？",
    "把这份攻略整理成可执行的配装检查清单。"
  ];
  const taskItems = lines.length
    ? lines.slice(0, 6)
    : ["粘贴任务文本或攻略后，这里会显示原文摘要。"];
  const stepItems = steps.length
    ? steps.map((step) => step.text)
    : ["暂未识别到步骤，可以按每行一条、数字编号或短横线书写。"];
  const itemNodes = linkedItems.length
    ? linkedItems.map((item) => `${item.name}${item.item_type ? ` / ${item.item_type}` : ""}`)
    : ["暂未从账号装备中匹配到攻略提到的物品。"];

  return {
    title,
    rawText: input.text,
    steps,
    linkedItems,
    aiQuestions,
    treeGroups: [
      { title: "任务文本", items: taskItems },
      { title: "攻略步骤", items: stepItems },
      { title: "关联装备", items: itemNodes },
      { title: "AI 问答", items: [...aiQuestions, ...input.pageContextFacts.slice(0, 3)] }
    ]
  };
}

function extractSteps(lines: string[]): AssistantTaskStep[] {
  return lines
    .slice(1)
    .map(cleanStepLine)
    .filter(Boolean)
    .map((text, index) => ({
      id: `step-${index + 1}`,
      text
    }));
}

function cleanStepLine(line: string): string {
  return line
    .replace(/^(?:[-*•]\s*|\d+[.、)]\s*|第[一二三四五六七八九十\d]+步[:：]?\s*)/, "")
    .trim();
}

function findLinkedItems(text: string, accountItems: AccountItemSummary[]): AssistantTaskLinkedItem[] {
  const normalizedText = text.toLocaleLowerCase();
  const seen = new Set<number>();
  const linked: AssistantTaskLinkedItem[] = [];

  for (const item of accountItems) {
    const name = item.name.trim();
    if (!name || seen.has(item.hash)) continue;
    if (!normalizedText.includes(name.toLocaleLowerCase())) continue;
    seen.add(item.hash);
    linked.push({
      hash: item.hash,
      name: item.name,
      group_label: groupLabel(item.group_key),
      item_type: item.item_type
    });
  }

  return linked.slice(0, 12);
}

function groupLabel(group: AccountItemSummary["group_key"]): string {
  if (group === "weapons") return "武器";
  if (group === "armor") return "护甲";
  if (group === "equipment") return "装备";
  return "其他";
}
