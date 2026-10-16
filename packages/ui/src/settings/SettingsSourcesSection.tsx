import type { MouseEvent } from "react";
import type { SettingsCopy } from "../i18n/types.js";
import { settingsSourceCategoryLabels, settingsSourceEntries, type SettingsSourceEntry } from "./settingsSources.js";
import { settingsText, settingsTemplate } from "./settingsCopy.js";
import { SettingsButton } from "./SettingsButton.js";

export function SettingsSourcesSection({
  copy,
  onOpenLegalDocument,
  onOpenExternal
}: {
  copy: SettingsCopy;
  onOpenLegalDocument?: (document: "project-license" | "third-party-notices") => void;
  onOpenExternal?: (url: string) => void;
}) {
  return (
    <section className="settings-section" data-reference-id="settings.section.sources" data-surface="section" id="settings-sources" aria-labelledby="settings-menu-sources">
      <header className="settings-section-head" data-ui-kind="page-section">
        <div>
          <h2 data-ui-part="value" data-info-priority="display" data-text-tone="primary">{settingsText(copy, "数据来源、参考项目与鸣谢")}</h2>
          <p data-ui-part="detail" data-info-priority="reading" data-text-tone="body">{settingsText(copy, "这里区分事实数据来源、功能参考项目和运行时依赖，避免把社区推荐误认为官方结论。")}</p>
        </div>
      </header>
      <div className="settings-sources-notice" data-ui-kind="callout" data-callout-tone="info">
        <strong data-ui-part="value" data-info-priority="decision" data-text-tone="primary">{settingsText(copy, "来源边界")}</strong>
        <p data-ui-part="detail" data-info-priority="reading" data-text-tone="body">{settingsText(copy, "账号事实和实时轮换来自 Bungie；社区来源只提供推荐或参考资料。本地用户导入内容暂不列入这里。")}</p>
      </div>
      {(Object.keys(settingsSourceCategoryLabels) as Array<keyof typeof settingsSourceCategoryLabels>).map((category) => {
        const entries = settingsSourceEntries.filter((entry) => entry.category === category);
        return (
          <section className="settings-sources-group" data-surface="section" key={category}>
            <header className="settings-sources-group-head">
              <h3 data-ui-part="value" data-info-priority="context" data-text-tone="primary">{copy.sourceCategoryLabels[category] ?? settingsSourceCategoryLabels[category]}</h3>
              <span data-ui-part="label" data-info-priority="support" data-text-tone="meta">{copy.sourceEntryCount(entries.length)}</span>
            </header>
            <div className="settings-sources-list" data-surface="list">
              {entries.map((entry) => <SourceRow copy={copy} entry={entry} key={entry.id} onOpenExternal={onOpenExternal} />)}
            </div>
          </section>
        );
      })}
      <section className="settings-sources-credits" data-surface="section">
        <header className="settings-sources-group-head">
          <h3 data-ui-part="value" data-info-priority="context" data-text-tone="primary">{settingsText(copy, "鸣谢与许可边界")}</h3>
        </header>
        <p data-ui-part="detail" data-info-priority="reading" data-text-tone="body">{settingsText(copy, "感谢 Bungie、DIM、DIM Wish List Sources、D2ArmorPicker、d2-armor-solver、Roll Report、d2-additional-info、Starside 以及所有提供公开资料和项目维护的 Destiny 2 社区贡献者。")}</p>
        <p data-ui-part="detail" data-info-priority="support" data-text-tone="meta">{settingsText(copy, "参考项目不代表背书，也不等于运行时依赖；再分发遵循各来源的许可证和授权范围。本地用户导入内容暂不列入这里。")}</p>
        {onOpenLegalDocument ? (
          <div className="settings-actions" data-ui-part="action">
            <SettingsButton data-control-variant="secondary" onClick={() => onOpenLegalDocument("project-license")}>{settingsText(copy, "查看项目许可证")}</SettingsButton>
            <SettingsButton data-control-variant="secondary" onClick={() => onOpenLegalDocument("third-party-notices")}>{settingsText(copy, "查看第三方许可证")}</SettingsButton>
          </div>
        ) : null}
      </section>
      <p className="settings-sources-legal" data-ui-part="detail" data-info-priority="support" data-text-tone="meta">
        {settingsText(copy, "Destiny 2 及相关名称、标识为 Bungie, Inc. 的商标。d2-tools 是非官方社区工具，与 Bungie 无从属关系。")}
      </p>
    </section>
  );
}

function SourceRow({ copy, entry, onOpenExternal }: { copy: SettingsCopy; entry: SettingsSourceEntry; onOpenExternal?: (url: string) => void }) {
  const details = copy.sourceEntryDetails[entry.id];
  const handleExternalClick = (event: MouseEvent<HTMLAnchorElement>, url: string) => {
    if (!onOpenExternal) return;
    event.preventDefault();
    onOpenExternal(url);
  };
  return (
    <article className="settings-source-row" data-surface="row">
      <div className="settings-source-main">
        <strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">{details?.name ?? entry.name}</strong>
        <span data-ui-part="label" data-info-priority="support" data-text-tone="meta">{details?.role ?? entry.role}</span>
        <span data-ui-part="label" data-info-priority="support" data-text-tone="meta">{details?.relationship ?? entry.relationship}</span>
      </div>
      <div className="settings-source-detail">
        <span data-ui-part="label" data-info-priority="support" data-text-tone="meta">{settingsText(copy, "提供内容")}</span>
        <p data-ui-part="detail" data-info-priority="reading" data-text-tone="body">{details?.content ?? entry.content}</p>
      </div>
      <div className="settings-source-detail">
        <span data-ui-part="label" data-info-priority="support" data-text-tone="meta">{settingsText(copy, "使用位置")}</span>
        <p data-ui-part="detail" data-info-priority="reading" data-text-tone="body">{details?.usedIn ?? entry.usedIn}</p>
      </div>
      <div className="settings-source-links" data-ui-part="action">
        {entry.githubUrl ? <a href={entry.githubUrl} target="_blank" rel="noreferrer" onClick={(event) => handleExternalClick(event, entry.githubUrl!)}>GitHub</a> : null}
        {entry.onlineUrl ? <a href={entry.onlineUrl} target="_blank" rel="noreferrer" onClick={(event) => handleExternalClick(event, entry.onlineUrl!)}>{settingsText(copy, "在线访问")}</a> : null}
        <small>{settingsTemplate(copy, "许可：{license}", { license: details?.license ?? entry.license })}</small>
        <small>{details?.note ?? entry.note}</small>
      </div>
    </article>
  );
}
