export type HealthStatus = {
  ok: true;
  service: "d2-service";
  version: string;
  timestamp: string;
};

export function getHealth(version = "0.0.3"): HealthStatus {
  return {
    ok: true,
    service: "d2-service",
    version,
    timestamp: new Date().toISOString()
  };
}
