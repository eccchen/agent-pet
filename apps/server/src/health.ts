export type HealthResponse = Readonly<{
  ok: true;
  service: string;
  env: string;
  uptimeSeconds: number;
}>;

export function createHealthResponse(
  service: string,
  env: string,
  uptimeSeconds = Math.round(process.uptime()),
): HealthResponse {
  return {
    ok: true,
    service,
    env,
    uptimeSeconds,
  };
}
