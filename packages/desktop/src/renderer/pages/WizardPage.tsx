import { useEffect, useState } from "react";
import { api } from "../api/client";

export function WizardPage(props: {
  canCancel?: boolean;
  onCancel?: () => void;
  onSaved: () => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadExistingConfig() {
      setError("");

      try {
        const current = await api.getConfig();
        setApiKey(current.bungie.api_key);
        setClientId(current.bungie.client_id);
        setClientSecret(current.bungie.client_secret);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "配置读取失败");
      } finally {
        setIsLoading(false);
      }
    }

    void loadExistingConfig();
  }, []);

  async function save() {
    setIsSaving(true);
    setError("");

    try {
    const current = await api.getConfig();
    await api.saveConfig({
      ...current,
      bungie: {
        ...current.bungie,
        api_key: apiKey.trim(),
        client_id: clientId.trim(),
        client_secret: clientSecret.trim()
      }
    });
      setMessage("配置已保存。下一步将接入 Bungie 登录。");
      props.onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "配置保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="page">
      <h1>{props.canCancel ? "Bungie 配置" : "欢迎使用 d2-service"}</h1>
      <p>这是本地 Destiny 2 工具，配置和 token 都保存在你的电脑里。</p>
      <label>
        Bungie API Key
        <input
          disabled={isLoading}
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
        />
      </label>
      <label>
        Bungie Client ID
        <input
          disabled={isLoading}
          value={clientId}
          onChange={(event) => setClientId(event.target.value)}
        />
      </label>
      <label>
        Bungie Client Secret
        <input
          disabled={isLoading}
          value={clientSecret}
          onChange={(event) => setClientSecret(event.target.value)}
          type="password"
        />
      </label>
      <div className="button-row">
        <button type="button" disabled={isLoading || isSaving} onClick={save}>
          {isSaving ? "保存中..." : "保存配置"}
        </button>
        {props.canCancel ? (
          <button type="button" className="secondary-button" onClick={props.onCancel}>
            返回
          </button>
        ) : null}
      </div>
      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="notice">{message}</p> : null}
    </main>
  );
}
