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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    async function load() {
      setError("");

      try {
        const config = await api.getConfig();
        setProvider(config.ai.provider || "none");
        setApiKey(config.ai.api_key);
        setModel(config.ai.model);
        setBaseUrl(config.ai.base_url);
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
          base_url: baseUrl
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
          base_url: baseUrl
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
          <option value="openai">OpenAI 兼容接口</option>
          <option value="deepseek">DeepSeek</option>
          <option value="custom">自定义兼容接口</option>
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
          placeholder="例如：gpt-4.1 / deepseek-chat"
          value={model}
          onChange={(event) => setModel(event.target.value)}
        />
      </label>
      <label>
        接口地址
        <input
          disabled={isLoading || isSaving || isTesting || disabled}
          placeholder="OpenAI/DeepSeek 可留空；自定义填写 https://.../v1"
          value={baseUrl}
          onChange={(event) => setBaseUrl(event.target.value)}
        />
      </label>
      <div className="button-row">
        <button type="button" disabled={isLoading || isSaving || isTesting} onClick={() => void save()}>
          {isSaving ? "保存中..." : "保存 AI 配置"}
        </button>
        <button type="button" disabled={isLoading || isSaving || isTesting || disabled} onClick={() => void saveAndTest()}>
          {isTesting ? "测试中..." : "保存并测试连接"}
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="notice">{message}</p> : null}
    </section>
  );
}
