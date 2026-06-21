import { useEffect, useState } from "react";
import { api } from "../api/client";
import { normalizeAiSettings } from "./aiSettings";

export function AiSettingsPanel(props: {
  onSaved: () => void;
}) {
  const [provider, setProvider] = useState("none");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [enableLightgg, setEnableLightgg] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);

  useEffect(() => {
    async function load() {
      setError("");

      try {
        const config = await api.getConfig();
        const ai = normalizeAiSettings(config.ai);
        setProvider(ai.provider || "none");
        setApiKey(ai.api_key);
        setModel(ai.model);
        setBaseUrl(ai.base_url);
        setEnableLightgg(ai.enable_lightgg ?? false);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "AI 配置读取失败");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, []);

  async function save() {
    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      const current = await api.getConfig();
      await api.saveConfig({
        ...current,
        ai: normalizeAiSettings({
          provider,
          api_key: apiKey,
          model,
          base_url: baseUrl,
          enable_lightgg: enableLightgg
        })
      });
      setMessage("AI 配置已保存。");
      props.onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "AI 配置保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveAndTest() {
    setIsTesting(true);
    setMessage("");
    setError("");

    try {
      const current = await api.getConfig();
      await api.saveConfig({
        ...current,
        ai: normalizeAiSettings({
          provider,
          api_key: apiKey,
          model,
          base_url: baseUrl,
          enable_lightgg: enableLightgg
        })
      });
      const result = await api.testAiConnection();
      setMessage(`${result.message} ${result.provider} / ${result.model}`);
      props.onSaved();
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : "AI 连接测试失败");
    } finally {
      setIsTesting(false);
    }
  }

  const disabled = provider === "none";
  const lightggEnabled = provider === "openai_responses" && !disabled;

  async function clearCache() {
    setIsClearingCache(true);
    setMessage("");
    setError("");

    try {
      await api.clearLightggCache();
      setMessage("light.gg 缓存已清除。");
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "清除缓存失败");
    } finally {
      setIsClearingCache(false);
    }
  }

  return (
    <section className="tool-panel">
      <div>
        <h2>AI 配置</h2>
        <p>AI 配置保存在本机，后续用于装备分析、perk 解读和仓库建议。</p>
      </div>
      <label>
        AI 提供方
        <select disabled={isLoading || isSaving || isTesting} value={provider} onChange={(event) => setProvider(event.target.value)}>
          <option value="none">不启用 AI</option>
          <option value="openai_responses">OpenAI Responses API（推荐）</option>
          <option value="openai_chat">OpenAI Chat Completions</option>
          <option value="openai_compatible">OpenAI 兼容接口</option>
          <option value="anthropic">Anthropic Claude</option>
        </select>
      </label>
      <label>
        API Key
        <input
          disabled={isLoading || isSaving || isTesting || disabled}
          placeholder="填写你的 AI API Key"
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
        />
      </label>
      <label>
        模型
        <input
          disabled={isLoading || isSaving || isTesting || disabled}
          placeholder="例如：gpt-4.1 / gpt-4.1-mini / deepseek-chat / claude-sonnet-4-5"
          value={model}
          onChange={(event) => setModel(event.target.value)}
        />
      </label>
      <label>
        接口地址
        <input
          disabled={isLoading || isSaving || isTesting || disabled}
          placeholder="OpenAI/Claude 官方可留空；兼容接口填写 https://.../v1"
          value={baseUrl}
          onChange={(event) => setBaseUrl(event.target.value)}
        />
      </label>
      <p className="muted-copy">
        DeepSeek、硅基流动、通义千问兼容模式等请选择 OpenAI 兼容接口，并填写对应平台的接口地址。
      </p>
      <label className="checkbox-row">
        <input
          checked={enableLightgg}
          disabled={isLoading || isSaving || isTesting || !lightggEnabled}
          type="checkbox"
          onChange={(event) => setEnableLightgg(event.target.checked)}
        />
        启用 light.gg 实时分析（仅 OpenAI Responses API）
      </label>
      {lightggEnabled ? (
        <p className="muted-copy">
          开启后，武器详情和资料库会自动通过 AI 查询 light.gg 社区推荐。每次查询都会产生 OpenAI 费用，结果会本地缓存 24 小时。
        </p>
      ) : (
        <p className="muted-copy">light.gg 实时分析需要选择 OpenAI Responses API 并提供有效模型。</p>
      )}
      <div className="button-row">
        <button type="button" disabled={isLoading || isSaving || isTesting} onClick={() => void save()}>
          {isSaving ? "保存中..." : "保存 AI 配置"}
        </button>
        <button type="button" disabled={isLoading || isSaving || isTesting || disabled} onClick={() => void saveAndTest()}>
          {isTesting ? "测试中..." : "保存并测试连接"}
        </button>
        <button type="button" disabled={isLoading || isSaving || isTesting || isClearingCache || !lightggEnabled} onClick={() => void clearCache()}>
          {isClearingCache ? "清除中..." : "清除 light.gg 缓存"}
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="notice">{message}</p> : null}
    </section>
  );
}
