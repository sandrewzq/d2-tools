import { useState } from "react";
import { api } from "../api/client";

export function WizardPage({ onSaved }: { onSaved: () => void }) {
  const [apiKey, setApiKey] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [message, setMessage] = useState("");

  async function save() {
    const current = await api.getConfig();
    await api.saveConfig({
      ...current,
      bungie: {
        ...current.bungie,
        api_key: apiKey,
        client_id: clientId,
        client_secret: clientSecret
      }
    });
    setMessage("配置已保存。下一步将接入 Bungie 登录。");
    onSaved();
  }

  return (
    <main className="page">
      <h1>欢迎使用 d2-service</h1>
      <p>这是本地 Destiny 2 工具，配置和 token 都保存在你的电脑里。</p>
      <label>
        Bungie API Key
        <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} />
      </label>
      <label>
        Bungie Client ID
        <input value={clientId} onChange={(event) => setClientId(event.target.value)} />
      </label>
      <label>
        Bungie Client Secret
        <input
          value={clientSecret}
          onChange={(event) => setClientSecret(event.target.value)}
          type="password"
        />
      </label>
      <button type="button" onClick={save}>
        保存配置
      </button>
      {message ? <p className="notice">{message}</p> : null}
    </main>
  );
}
