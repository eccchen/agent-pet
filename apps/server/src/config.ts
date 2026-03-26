import fs from "node:fs";
import path from "node:path";

export type ServerConfig = Readonly<{
  serviceName: string;
  env: string;
  port: number;
  statePath: string;
  requestLogging: boolean;
  authMode: "unsafe" | "eip191";
  challengePrefix: string;
  chainSyncMode: "local" | "xlayer";
  deploymentManifestPath: string | null;
  xlayerChainId: number;
  xlayerRpcUrl: string | null;
  petRegistryAddress: string | null;
  budgetVaultAddress: string | null;
  cannedTokenAddress: string | null;
  claimVaultAddress: string | null;
  claimSignerPrivateKey: string | null;
  claimIntentExpirySeconds: number;
  xIntegrationMode: "disabled" | "local_upload";
  systemAgentsEnabled: boolean;
  systemAgentTickIntervalMs: number;
}>;

const defaultPort = 3001;
const defaultStatePath = ".data/server-state.json";
const defaultChallengePrefix = "Sign this wallet challenge";

function readAuthMode(value: string | undefined): "unsafe" | "eip191" {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "unsafe" || normalized === "eip191") {
    return normalized;
  }

  if (!normalized) {
    throw new Error("AUTH_MODE must be explicitly set to 'unsafe' or 'eip191'.");
  }

  throw new Error(`Unsupported AUTH_MODE: ${value}`);
}

function readChainSyncMode(value: string | undefined): "local" | "xlayer" {
  return value === "xlayer" ? "xlayer" : "local";
}

function readXIntegrationMode(value: string | undefined): "disabled" | "local_upload" {
  return value === "local_upload" ? "local_upload" : "disabled";
}

function readNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") {
    return true;
  }

  if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") {
    return false;
  }

  return fallback;
}

type DeploymentManifest = Readonly<{
  chainId?: number;
  registry?: string;
  vault?: string;
  token?: string;
  claimVault?: string;
  rpcUrl?: string;
}>;

function readDeploymentManifest(
  manifestPath: string | undefined,
): Readonly<{
  deploymentManifestPath: string | null;
  manifest: DeploymentManifest | null;
}> {
  const rawPath = manifestPath?.trim();
  if (!rawPath) {
    return {
      deploymentManifestPath: null,
      manifest: null,
    };
  }

  const resolvedPath = path.resolve(rawPath);
  try {
    const raw = fs.readFileSync(resolvedPath, "utf8");
    return {
      deploymentManifestPath: resolvedPath,
      manifest: JSON.parse(raw) as DeploymentManifest,
    };
  } catch {
    return {
      deploymentManifestPath: resolvedPath,
      manifest: null,
    };
  }
}

export function loadConfig(env = process.env): ServerConfig {
  const manifestState = readDeploymentManifest(env.DEPLOYMENT_MANIFEST_PATH);

  return {
    serviceName: env.SERVICE_NAME ?? "agent-game-server",
    env: env.NODE_ENV ?? "development",
    port: readNumber(env.PORT, defaultPort),
    statePath: env.STATE_PATH ?? defaultStatePath,
    requestLogging: readBoolean(env.REQUEST_LOGGING, true),
    authMode: readAuthMode(env.AUTH_MODE),
    challengePrefix: env.CHALLENGE_PREFIX ?? defaultChallengePrefix,
    chainSyncMode: readChainSyncMode(env.CHAIN_SYNC_MODE),
    deploymentManifestPath: manifestState.deploymentManifestPath,
    xlayerChainId: readNumber(env.XLAYER_CHAIN_ID, Number(manifestState.manifest?.chainId ?? 196)),
    xlayerRpcUrl: env.XLAYER_RPC_URL ?? manifestState.manifest?.rpcUrl ?? null,
    petRegistryAddress: env.PET_REGISTRY_ADDRESS ?? manifestState.manifest?.registry ?? null,
    budgetVaultAddress: env.BUDGET_VAULT_ADDRESS ?? manifestState.manifest?.vault ?? null,
    cannedTokenAddress: env.CANNED_TOKEN_ADDRESS ?? manifestState.manifest?.token ?? null,
    claimVaultAddress: env.CLAIM_VAULT_ADDRESS ?? manifestState.manifest?.claimVault ?? null,
    claimSignerPrivateKey: env.CLAIM_SIGNER_PRIVATE_KEY ?? null,
    claimIntentExpirySeconds: readNumber(env.CLAIM_INTENT_EXPIRY_SECONDS, 3600),
    xIntegrationMode: readXIntegrationMode(env.X_INTEGRATION_MODE),
    systemAgentsEnabled: readBoolean(env.SYSTEM_AGENTS_ENABLED, false),
    systemAgentTickIntervalMs: readNumber(env.SYSTEM_AGENT_TICK_INTERVAL_MS, 30000),
  };
}
