import { useEffect, useMemo, useState } from "react";
import { api, type D2Config } from "../api/client";
import {
  getAiLightggSupportSettings,
  normalizeAiSettings,
  protocolLabel
} from "../utils/aiSettings";

export function AiSettingsPanel(props: {
  onSaved: () => void;
}) {
  const [protocol, setProtocol] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [enableLightgg, setEnableLightgg] = useState(false);
  const [forceLightgg, setForceLightgg] = useState(false);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [modelListMessage, setModelListMessage] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);

  const draftAiSettings = useMemo(() => normalizeAiSettings({
    protocol,
    provider: "",
    api_key: apiKey,
    model,
    base_url: baseUrl,
    enable_lightgg: enableLightgg,
    force_lightgg: forceLightgg
  }), [protocol, apiKey, model, baseUrl, enableLightgg, forceLightgg]);

  const lightggSupport = getAiLightggSupportSettings(draftAiSettings);
  const disabled = !draftAiSettings.protocol;
  const lightggAvailable = lightggSupport.supported || forceLightgg;

  useEffect(() => {
    async function load() {
      setError("");

      try {
        const config = await api.getConfig();
        const ai = normalizeAiSettings(config.ai);
        setProtocol(ai.protocol || "");
        setApiKey(ai.api_key);
        setModel(ai.model);
        setBaseUrl(ai.base_url);
        setEnableLightgg(ai.enable_lightgg ?? false);
        setForceLightgg(ai.force_lightgg ?? false);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "AI 配置读取失败");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, []);

  useEffect(() => {
    if (lightggSupport.supported && forceLightgg) {
      setForceLightgg(false);
      return;
    }
    if (!lightggAvailable && enableLightgg) {
      setEnableLightgg(false);
    }
  }, [enableLightgg, forceLightgg, lightggAvailable, lightggSupport.supported]);

  useEffect(() => {
    if (!draftAiSettings.protocol || !draftAiSettings.api_key) {
      setModelOptions([]);
      setModelListMessage("");
      return;
    }

    let cancelled = false;
    setIsLoadingModels(true);
    setModelListMessage("");

    void api.listAiModels(buildDraftConfig(draftAiSettings))
      .then((result) => {
        if (cancelled) return;
        setModelOptions(result.models);
        setModelListMessage(result.message);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setModelOptions([]);
        setModelListMessage(loadError instanceof Error ? loadError.message : "模型列表读取失败，但仍可手动输入。");
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoadingModels(false);
      });

    return () => {
      cancelled = true;
    };
  }, [draftAiSettings.protocol, draftAiSettings.api_key, draftAiSettings.base_url]);

  async function refreshModels() {
    if (!draftAiSettings.protocol || !draftAiSettings.api_key) return;
    setIsLoadingModels(true);
    setModelListMessage("");

    try {
      const result = await api.listAiModels(buildDraftConfig(draftAiSettings));
      setModelOptions(result.models);
      setModelListMessage(result.message);
    } catch (loadError) {
      setModelOptions([]);
      setModelListMessage(loadError instanceof Error ? loadError.message : "模型列表读取失败，但仍可手动输入。");
    } finally {
      setIsLoadingModels(false);
    }
  }

  async function save() {
    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      const current = await api.getConfig();
      await api.saveConfig({
        ...current,
        ai: draftAiSettings
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
        ai: draftAiSettings
      });
      const result = await api.testAiConnection();
      setMessage(`${result.message} ${protocolLabel(result.protocol)} / ${result.model}`);
      props.onSaved();
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : "AI 连接测试失败");
    } finally {
      setIsTesting(false);
    }
  }

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
        API 格式
        <select disabled={isLoading || isSaving || isTesting} value={protocol} onChange={(event) => setProtocol(event.target.value)}>
          <option value="">不启用 AI</option>
          <option value="openai_chat_completions">OpenAI Chat Completions</option>
          <option value="openai_responses">OpenAI Responses</option>
          <option value="anthropic_messages">Anthropic Messages</option>
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
        Base URL
        <input
          disabled={isLoading || isSaving || isTesting || disabled}
          placeholder="支持填写服务根地址，或直接填写 /chat/completions /responses /messages 完整地址"
          value={baseUrl}
          onChange={(event) => setBaseUrl(event.target.value)}
        />
      </label>
      <p className="muted-copy">
        根地址和完整接口地址都兼容。程序会按当前 API 格式自动识别或补齐请求地址。
      </p>
      <label>
        模型
        <div className="button-row">
          <input
            disabled={isLoading || isSaving || isTesting || disabled}
            list="ai-model-options"
            placeholder="优先读取目标服务模型列表，也可以直接手动输入"
            value={model}
            onChange={(event) => setModel(event.target.value)}
          />
          <button type="button" disabled={isLoading || isSaving || isTesting || disabled || isLoadingModels || !draftAiSettings.api_key} onClick={() => void refreshModels()}>
            {isLoadingModels ? "刷新中..." : "刷新模型"}
          </button>
        </div>
        <datalist id="ai-model-options">
          {modelOptions.map((option) => <option key={option} value={option} />)}
        </datalist>
      </label>
      {modelListMessage ? <p className="muted-copy">{modelListMessage}</p> : null}

      <label className="checkbox-row">
        <input
          checked={enableLightgg}
          disabled={isLoading || isSaving || isTesting || !lightggAvailable}
          type="checkbox"
          onChange={(event) => setEnableLightgg(event.target.checked)}
        />
        启用 light.gg 实时分析
      </label>
      {lightggAvailable ? (
        <p className="muted-copy">
          {lightggSupport.supported
            ? "当前 API 格式默认支持 light.gg 实时分析。结果会本地缓存 24 小时。"
            : "当前通过强制开启尝试 light.gg 实时分析。仅当目标服务额外兼容 Responses 能力时才可能成功。"}
        </p>
      ) : (
        <p className="muted-copy">{lightggSupport.reason}</p>
      )}
      {!lightggSupport.supported && lightggSupport.canForce ? (
        <details>
          <summary>强制开启</summary>
          <label className="checkbox-row">
            <input
              checked={forceLightgg}
              disabled={isLoading || isSaving || isTesting || disabled}
              type="checkbox"
              onChange={(event) => setForceLightgg(event.target.checked)}
            />
            强制开启 light.gg 实时分析
          </label>
          <p className="muted-copy">
            仅适合你明确知道目标服务额外支持 `/responses` 和网页搜索能力时使用。普通 Chat Completions / Anthropic Messages 配置并不会因为强制开启而自动获得该能力。
          </p>
        </details>
      ) : null}

      <div className="button-row">
        <button type="button" disabled={isLoading || isSaving || isTesting} onClick={() => void save()}>
          {isSaving ? "保存中..." : "保存 AI 配置"}
        </button>
        <button type="button" disabled={isLoading || isSaving || isTesting || disabled} onClick={() => void saveAndTest()}>
          {isTesting ? "测试中..." : "保存并测试连接"}
        </button>
        <button type="button" disabled={isLoading || isSaving || isTesting || isClearingCache || !lightggAvailable} onClick={() => void clearCache()}>
          {isClearingCache ? "清除中..." : "清除 light.gg 缓存"}
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="notice">{message}</p> : null}
    </section>
  );
}

function buildDraftConfig(ai: D2Config["ai"]): D2Config {
  return {
    bungie: {
      api_key: "",
      client_id: "",
      client_secret: "",
      redirect_uri: "https://127.0.0.1:28780/oauth/callback"
    },
    data: {
      data_dir: "",
      manifest_language: "zh-chs"
    },
    ai,
    features: {
      write_actions_enabled: false
    }
  };
}
