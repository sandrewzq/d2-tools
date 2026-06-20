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
      <h1>{props.canCancel ? "Bungie 配置" : "欢迎使用 d2-tools"}</h1>
      <p>这是本地 Destiny 2 工具，配置和 token 都保存在你的电脑里。</p>
      <section className="config-help" aria-label="Bungie 配置填写说明">
        <h2>不知道填哪个？</h2>
        <p>在 Bungie 应用页面里这样对应：</p>
        <dl>
          <div>
            <dt>应用程序介面金钥</dt>
            <dd>Bungie API Key</dd>
          </div>
          <div>
            <dt>开放授权 client_id</dt>
            <dd>Bungie Client ID</dd>
          </div>
          <div>
            <dt>开放授权 client_secret</dt>
            <dd>Bungie Client Secret</dd>
          </div>
        </dl>
        <p>
          不要填写“开放授权之授权 URI”，那是 Bungie 自动生成的授权地址。本工具回调地址固定是：
          <code>https://127.0.0.1:28780/oauth/callback</code>
        </p>
      </section>
      <label>
        Bungie API Key
        <input
          disabled={isLoading}
          placeholder="复制 Bungie 页面里的“应用程序介面金钥”"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
        />
      </label>
      <label>
        Bungie Client ID
        <input
          disabled={isLoading}
          placeholder="复制 Bungie 页面里的“开放授权 client_id”"
          value={clientId}
          onChange={(event) => setClientId(event.target.value)}
        />
      </label>
      <label>
        Bungie Client Secret
        <input
          disabled={isLoading}
          placeholder="复制 Bungie 页面里的“开放授权 client_secret”"
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
