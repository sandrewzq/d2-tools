export type NormalizedUpdateError = {
  userMessage: string;
  technicalMessage: string;
};

export function normalizeUpdateError(error: unknown): NormalizedUpdateError {
  const technicalMessage = error instanceof Error && error.message
    ? error.message
    : "更新检查失败";
  const normalizedMessage = technicalMessage.toUpperCase();

  if (includesAny(normalizedMessage, [
    "ERR_PROXY_CONNECTION_FAILED",
    "ERR_TUNNEL_CONNECTION_FAILED",
    "PROXY AUTHENTICATION REQUIRED",
    "HTTP 407"
  ])) {
    return {
      userMessage: "代理连接失败：请检查系统代理地址、账号和网络权限，或打开下载页手动安装最新版本。",
      technicalMessage
    };
  }

  if (includesAny(normalizedMessage, [
    "ERR_CERT",
    "CERT_HAS_EXPIRED",
    "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
    "SELF_SIGNED_CERT",
    "ERR_SSL",
    "TLS"
  ])) {
    return {
      userMessage: "安全连接验证失败：请检查系统时间、HTTPS 证书或代理软件的证书拦截设置，也可以打开下载页手动安装。",
      technicalMessage
    };
  }

  if (includesAny(normalizedMessage, ["LATEST.YML", "UPDATE INFO", "HTTP 404"])) {
    return {
      userMessage: "更新服务中没有找到适用于当前版本的更新信息。可以稍后重试，或打开下载页确认最新版本。",
      technicalMessage
    };
  }

  if (normalizedMessage.includes("NET::ERR_CONNECTION_CLOSED")) {
    return {
      userMessage: "更新服务连接失败：网络连接被中断。可以稍后重试，或打开下载页手动安装最新版本。",
      technicalMessage
    };
  }

  if (includesAny(normalizedMessage, [
    "ENOTFOUND",
    "ETIMEDOUT",
    "ECONNRESET",
    "ERR_NETWORK",
    "ERR_CONNECTION_TIMED_OUT",
    "ERR_NAME_NOT_RESOLVED"
  ])) {
    return {
      userMessage: "更新服务连接失败：当前网络无法稳定访问更新服务。可以稍后重试，或打开下载页手动安装最新版本。",
      technicalMessage
    };
  }

  return {
    userMessage: "更新检查失败。可以重试，或打开下载页手动安装最新版本。",
    technicalMessage
  };
}

function includesAny(value: string, candidates: string[]): boolean {
  return candidates.some((candidate) => value.includes(candidate));
}
