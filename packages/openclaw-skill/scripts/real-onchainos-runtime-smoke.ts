import { loadOpenClawHostInvokerFromModule } from "../src/openclaw-host-smoke.js";
import { createOkxOpenClawWalletHost } from "../src/openclaw-host-bridge.js";
import { createOpenClawSkill } from "../src/skill.js";

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key]?.trim();
  if (value) {
    return value;
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new Error(`Missing required environment variable ${key}.`);
}

async function main() {
  const baseUrl = requireEnv("AGENT_GAME_BASE_URL", "http://127.0.0.1:3001");
  const modulePath = requireEnv(
    "OPENCLAW_INVOKE_SKILL_MODULE",
    "C:\\Users\\shine\\Desktop\\agent game\\.worktrees\\codex-initial\\packages\\openclaw-skill\\examples\\onchainos-cli-skill-host.mjs",
  );
  const command = requireEnv("OPENCLAW_RUNTIME_COMMAND", "earn") as
    | "earn"
    | "taunt"
    | "ally"
    | "revenge"
    | "stay_low";

  const host = await loadOpenClawHostInvokerFromModule(modulePath);
  const wallet = createOkxOpenClawWalletHost({ host });
  const skill = createOpenClawSkill({ baseUrl });

  const session = await skill.loginWithWallet(wallet);
  const player = await skill.bootstrap();
  const commandResult = await skill.command("starter-pet", command);
  const home = await skill.home();

  console.log(
    JSON.stringify(
      {
        walletAddress: session.walletAddress,
        player: {
          walletAddress: player.walletAddress,
          treasuryBalance: player.treasuryBalance,
          profitPool: player.profitPool,
          claimableBalance: player.claimableBalance,
        },
        commandResult: {
          profitPool: commandResult.player.profitPool,
          lastEventType: commandResult.event.type,
        },
        home: {
          availableCommands: home.availableCommands,
          feedCount: home.feed.length,
          messageCount: home.messageCenter.length,
          xEnabled: home.xAdapter.enabled,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
