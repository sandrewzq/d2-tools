export type KohinataTaskGroupView = {
  title: string;
  items: string[];
};

export type KohinataTaskPanelViewProps = {
  pageLabel: string;
  pageFacts: string[];
  draft: string;
  statusMessage?: string;
  contextTitle: string;
  recognizedStepCount: number;
  linkedItemCount: number;
  taskGroups: KohinataTaskGroupView[];
  contextGroups: KohinataTaskGroupView[];
  canParse: boolean;
  canMatch: boolean;
  canCreateDraft: boolean;
  canSaveDraft: boolean;
  onDraftChange: (value: string) => void;
  onSaveContext: () => void;
  onClearContext: () => void;
  onParse: () => void;
  onMatch: () => void;
  onCreateDraft: () => void;
  onSaveDraft: () => void;
  onReviewGaps: () => void;
};

export function KohinataTaskPanelView(props: KohinataTaskPanelViewProps) {
  return (
    <section className="assistant-task-panel" data-scroll-region="pane">
      <div className="assistant-context-card">
        <strong>当前上下文</strong>
        <span>{props.pageLabel}</span>
        <small>{props.pageFacts.join("；") || "当前页面暂无可用上下文。"}</small>
      </div>
      <label className="assistant-task-editor">
        <span>粘贴任务文本或攻略</span>
        <textarea
          value={props.draft}
          onChange={(event) => props.onDraftChange(event.target.value)}
          placeholder="粘贴任务步骤、攻略正文、配装说明或视频文案。任务助手会提取步骤，并匹配当前账号里提到的装备。"
          rows={7}
        />
      </label>
      <div className="button-row">
        <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={!props.draft.trim()} onClick={props.onSaveContext}>
          保存上下文
        </button>
        <button type="button" data-ui-kind="button" data-control-variant="secondary" disabled={!props.draft.trim()} onClick={props.onClearContext}>
          清空
        </button>
      </div>
      <div className="button-row">
        <button type="button" onClick={props.onParse} disabled={!props.canParse}>解析攻略</button>
        <button type="button" onClick={props.onMatch} disabled={!props.canMatch}>对照账号</button>
        <button type="button" onClick={props.onCreateDraft} disabled={!props.canCreateDraft}>生成草稿</button>
        <button type="button" onClick={props.onSaveDraft} disabled={!props.canSaveDraft}>保存草稿</button>
        <button type="button" data-ui-kind="button" data-control-variant="secondary" onClick={props.onReviewGaps}>查看缺口</button>
      </div>
      {props.statusMessage ? <p className="status-message status-neutral">{props.statusMessage}</p> : null}
      <div className="assistant-context-card">
        <strong>{props.contextTitle}</strong>
        <small>已识别 {props.recognizedStepCount} 个攻略步骤，关联 {props.linkedItemCount} 件账号装备。</small>
      </div>
      <TaskGroupTree title="小日向任务状态" groups={props.taskGroups} open />
      <TaskGroupTree title="任务 / 攻略上下文" groups={props.contextGroups} />
      <p className="assistant-task-note">
        这棵树只整理你粘贴的任务和攻略，不会猜测外部数据；可保存方案草稿和 AI 问答节点可基于同一页面上下文继续问缺口和刷取建议。
      </p>
    </section>
  );
}

function TaskGroupTree(props: {
  title: string;
  groups: KohinataTaskGroupView[];
  open?: boolean;
}) {
  return (
    <div className="assistant-task-tree">
      <h3>{props.title}</h3>
      {props.groups.map((group) => (
        <details key={group.title} open={props.open}>
          <summary>{group.title}</summary>
          <ul>
            {group.items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </details>
      ))}
    </div>
  );
}
