export type HealthStatus = {
  ok: true;
  service: "d2-tools";
  version: string;
  timestamp: string;
};

export function getHealth(version = "0.0.4"): HealthStatus {
  return {
    ok: true,
    service: "d2-tools",
    version,
    timestamp: new Date().toISOString()
  };
}
