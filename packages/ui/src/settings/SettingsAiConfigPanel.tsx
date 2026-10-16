import { useEffect, useMemo, useState } from "react";
import {
  normalizeAiSettings,
  protocolLabel,
  type AiSettings
} from "@d2-tools/core/ai/settings";
import type { SettingsCopy } from "../i18n/types.js";
import { SettingsButton } from "./SettingsButton.js";
import { settingsText, settingsTemplate } from "./settingsCopy.js";

export type SettingsAiAdapter = {
  load: () => Promise<AiSettings>;
  save: (settings: AiSettings) => Promise<void>;
  listModels: (settings: AiSettings) => Promise<{ models: string[]; message: string }>;
  testConnection: () => Promise<{ protocol: string; model: string; message: string }>;
  onSaved?: () => void;
};

export function SettingsAiConfigPanel(props: { adapter: SettingsAiAdapter; copy: SettingsCopy }) {
  const copy = props.copy;
  const [protocol, setProtocol] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [dataSharingConsent, setDataSharingConsent] = useState(false);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [modelInputMode, setModelInputMode] = useState<"select" | "manual">("select");
  const [modelListMessage, setModelListMessage] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const connectionSettings = useMemo(() => normalizeAiSettings({
    protocol,
    api_key: apiKey,
    model,
    base_url: baseUrl
  }), [apiKey, baseUrl, model, protocol]);
  const settings = useMemo(() => ({
    ...connectionSettings,
    data_sharing_consent: dataSharingConsent
  }), [connectionSettings, dataSharingConsent]);
  const isConfigured = Boolean(connectionSettings.protocol && connectionSettings.api_key);
  const isBusy = isLoading || isSaving || isTesting;

  useEffect(() => {
    let cancelled = false;
    void props.adapter.load().then((config) => {
      if (cancelled) return;
      const loaded = normalizeAiSettings(config);
      setProtocol(loaded.protocol);
      setApiKey(loaded.api_key);
      setModel(loaded.model);
      setBaseUrl(loaded.base_url);
      setDataSharingConsent(loaded.data_sharing_consent);
    }).catch((loadError) => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : settingsText(copy, "AI 配置读取失败"));
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [props.adapter, copy]);

  useEffect(() => {
    if (!isConfigured) {
      setModelOptions([]);
      setModelListMessage("");
      return;
    }
    let cancelled = false;
    setIsLoadingModels(true);
    setModelListMessage("");
    void props.adapter.listModels(connectionSettings).then((result) => {
      if (cancelled) return;
      setModelOptions(result.models);
      setModelListMessage(result.message);
      if (modelInputMode === "select" && model && !result.models.includes(model)) setModel("");
    }).catch(() => {
      if (!cancelled) {
        setModelOptions([]);
        setModelListMessage(settingsText(copy, "目标服务未返回模型列表，请手动填写模型 ID。"));
      }
    }).finally(() => {
      if (!cancelled) setIsLoadingModels(false);
    });
    return () => { cancelled = true; };
  }, [connectionSettings, copy, isConfigured, model, modelInputMode, props.adapter]);

  async function refreshModels() {
    if (!isConfigured) return;
    setIsLoadingModels(true);
    setModelListMessage("");
    try {
      const result = await props.adapter.listModels(connectionSettings);
      setModelOptions(result.models);
      setModelListMessage(result.message);
      if (modelInputMode === "select" && model && !result.models.includes(model)) setModel("");
    } catch {
      setModelOptions([]);
      setModelListMessage(settingsText(copy, "目标服务未返回模型列表，请手动填写模型 ID。"));
    } finally {
      setIsLoadingModels(false);
    }
  }

  async function save() {
    setIsSaving(true);
    setMessage("");
    setError("");
    try {
      if (!canSaveAiSettings(settings)) {
        setError(settingsText(copy, "请先阅读并确认 AI 数据发送范围，再保存 AI 配置。"));
        return;
      }
      await props.adapter.save(settings);
      setMessage(settingsText(copy, "AI 配置已保存。"));
      props.adapter.onSaved?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : settingsText(copy, "AI 配置保存失败"));
    } finally {
      setIsSaving(false);
    }
  }

  async function saveAndTest() {
    setIsTesting(true);
    setMessage("");
    setError("");
    try {
      if (!canSaveAiSettings(settings)) {
        setError(settingsText(copy, "请先阅读并确认 AI 数据发送范围，再保存并测试连接。"));
        return;
      }
      await props.adapter.save(settings);
      const result = await props.adapter.testConnection();
      setMessage(settingsTemplate(copy, "{message} {protocol} / {model}", {
        message: result.message,
        protocol: protocolLabel(result.protocol),
        model: result.model
      }));
      props.adapter.onSaved?.();
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : settingsText(copy, "AI 连接测试失败"));
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <div className="settings-ai-form" data-reference-id="settings.ai.form">
      <label data-info-priority="support" data-text-tone="primary">{settingsText(copy, "API 格式")}
        <select data-ui-kind="field" disabled={isBusy} value={protocol} onChange={(event) => {
          setProtocol(event.target.value);
          setDataSharingConsent(false);
          setError("");
          setMessage("");
        }}>
          <option value="">{settingsText(copy, "不启用 AI")}</option>
          <option value="openai_chat_completions">OpenAI Chat Completions</option>
          <option value="openai_responses">OpenAI Responses</option>
          <option value="anthropic_messages">Anthropic Messages</option>
        </select>
      </label>
      <label data-info-priority="support" data-text-tone="primary">API Key
        <input data-ui-kind="field" disabled={isBusy || !settings.protocol} placeholder={settingsText(copy, "填写你的 AI API Key")} type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} />
      </label>
      <label data-info-priority="support" data-text-tone="primary">Base URL
        <input data-ui-kind="field" disabled={isBusy || !settings.protocol} placeholder={settingsText(copy, "支持填写服务根地址，或完整接口地址")} value={baseUrl} onChange={(event) => {
          setBaseUrl(event.target.value);
          setDataSharingConsent(false);
          setError("");
          setMessage("");
        }} />
      </label>
      <p className="settings-muted" data-ui-part="detail" data-info-priority="reading" data-text-tone="body">{settingsText(copy, "根地址和完整接口地址都兼容。程序会按当前 API 格式识别或补齐 /chat/completions、/responses 或 /messages 请求地址。")}</p>
      <label data-info-priority="support" data-text-tone="primary">{settingsText(copy, "模型")}
        <div className="settings-actions">
          {modelInputMode === "select" ? (
            <select className="settings-model-select" data-ui-kind="field" disabled={isBusy || !settings.protocol} value={modelOptions.includes(model) ? model : ""} onChange={(event) => setModel(event.target.value)}>
              <option value="">{modelOptions.length ? settingsText(copy, "请选择模型") : settingsText(copy, "先刷新模型列表")}</option>
              {modelOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          ) : <input data-ui-kind="field" disabled={isBusy || !settings.protocol} placeholder={settingsText(copy, "输入模型 ID，例如 gpt-5.4")} value={model} onChange={(event) => setModel(event.target.value)} />}
          <SettingsButton data-control-variant="secondary" disabled={isBusy || isLoadingModels || !isConfigured} onClick={() => void refreshModels()}>{isLoadingModels ? settingsText(copy, "刷新中...") : settingsText(copy, "刷新模型")}</SettingsButton>
          <SettingsButton data-control-variant="secondary" disabled={isBusy || !settings.protocol} onClick={() => setModelInputMode((current) => current === "select" ? "manual" : "select")}>{modelInputMode === "select" ? settingsText(copy, "手动输入模型 ID") : settingsText(copy, "改为下拉选择")}</SettingsButton>
        </div>
      </label>
      <p className="settings-muted" data-ui-part="detail" data-info-priority="reading" data-text-tone="body">{modelListMessage || settingsText(copy, "模型列表会在 API 格式、Key 或 Base URL 变化后重新读取；服务未返回列表时可手动填写模型 ID。")}</p>
      <div className="settings-ai-consent-notice" data-ui-kind="callout" data-callout-tone="info">
        <strong data-ui-part="value" data-info-priority="decision" data-text-tone="primary">{settingsText(copy, "AI 数据发送说明")}</strong>
        <p data-ui-part="detail" data-info-priority="reading" data-text-tone="body">{settingsText(copy, "AI 请求会从本机直接发送到当前 API 格式和 Base URL 对应的服务，不经过 d2-tools 自建服务器。")}</p>
        <dl>
          <div>
            <dt data-text-tone="primary">{settingsText(copy, "会发送")}</dt>
            <dd data-text-tone="body">{settingsText(copy, "你的问题、当前页面，以及分析所需的装备名称、Perk、光等、仓库 / 配装 / 商人 / 活动摘要和本地备注。")}</dd>
          </div>
          <div>
            <dt data-text-tone="primary">{settingsText(copy, "仅用于认证")}</dt>
            <dd data-text-tone="body">{settingsText(copy, "AI API Key 会作为认证请求头发送到当前服务，但不会写入模型提示正文。")}</dd>
          </div>
          <div>
            <dt data-text-tone="primary">{settingsText(copy, "不会放入提示")}</dt>
            <dd data-text-tone="body">{settingsText(copy, "Bungie Token、Client Secret、Bungie API Key、AI API Key、账号名、Membership ID、角色 ID、装备实例 ID 和物品 Hash。")}</dd>
          </div>
        </dl>
        <label className="setting-toggle settings-ai-consent" data-info-priority="decision" data-text-tone="primary">
          <input
            checked={dataSharingConsent}
            disabled={isBusy || !settings.protocol}
            onChange={(event) => {
              setDataSharingConsent(event.target.checked);
              setError("");
              setMessage("");
            }}
            type="checkbox"
          />
          <span>{settingsText(copy, "我已了解并同意将上述游戏数据发送到当前配置的 AI 服务")}</span>
        </label>
        <small data-ui-part="detail" data-info-priority="support" data-text-tone="meta">
          {!settings.protocol
            ? settingsText(copy, "当前未启用 AI；启用后需要确认。")
            : dataSharingConsent
              ? settingsText(copy, "已确认。更换 API 格式或 Base URL 后需要重新确认。")
              : settingsText(copy, "未确认前，AI 分析不会发送游戏数据。")}
        </small>
      </div>
      <div className="settings-actions settings-action-row">
        <SettingsButton data-control-variant="secondary" disabled={isBusy} onClick={() => void save()}>{isSaving ? settingsText(copy, "保存中...") : settingsText(copy, "保存 AI 配置")}</SettingsButton>
        <SettingsButton data-control-variant="primary" disabled={isBusy || !settings.protocol} onClick={() => void saveAndTest()}>{isTesting ? settingsText(copy, "测试中...") : settingsText(copy, "保存并测试连接")}</SettingsButton>
      </div>
      {error ? <p className="settings-feedback" data-ui-kind="callout" data-ui-part="state" data-info-priority="decision" data-text-tone="status" data-status="error" role="alert">{error}</p> : null}
      {message ? <p className="settings-feedback" data-ui-kind="callout" data-ui-part="state" data-info-priority="decision" data-text-tone="status" data-status="success" role="status" aria-live="polite">{message}</p> : null}
    </div>
  );
}

function canSaveAiSettings(settings: ReturnType<typeof normalizeAiSettings>): boolean {
  return !settings.protocol || settings.data_sharing_consent;
}
