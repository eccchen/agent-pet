"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  createApiClient,
  type AuthSession,
  type CommandType,
  type PetBudget,
  type PlayerEvent,
  type PlayerSnapshot,
} from "../lib/api";
import {
  appShellReducer,
  clearPersistedSession,
  createAppShellState,
  readPersistedSession,
  writePersistedSession,
} from "../lib/app-shell";

const defaultWalletAddress = "0x881c6722397bf536edc1b766b10386aab62e4fa9";
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:3001";

type PendingAction =
  | "challenge"
  | "verify"
  | "bootstrap"
  | "refresh"
  | "restore"
  | "budget"
  | "command"
  | "withdraw"
  | "reinvest"
  | null;

const commandDeck: Array<{ key: CommandType; label: string; detail: string }> = [
  { key: "earn", label: "Earn", detail: "Run the safe income loop." },
  { key: "taunt", label: "Taunt", detail: "Push attention and stir the timeline." },
  { key: "ally", label: "Ally", detail: "Invest in social alignment." },
  { key: "revenge", label: "Revenge", detail: "Escalate a higher-risk retaliation." },
  { key: "stay_low", label: "Stay low", detail: "Throttle visibility and bank small gains." },
];

const statusCopy: Record<
  ReturnType<typeof createAppShellState>["status"],
  { label: string; description: string }
> = {
  disconnected: {
    label: "Disconnected",
    description: "Start with a wallet challenge or restore a saved session.",
  },
  challenged: {
    label: "Challenge ready",
    description: "Signature proof is queued and waiting for verification.",
  },
  authenticated: {
    label: "Authenticated",
    description: "A local session exists. Bootstrapping the player snapshot is next.",
  },
  bootstrapped: {
    label: "Bootstrapped",
    description: "The player snapshot is loaded and the home shell is live.",
  },
};

export function BootstrapPanel() {
  const api = useMemo(() => createApiClient({ baseUrl: apiBaseUrl }), []);
  const [state, dispatch] = useReducer(appShellReducer, defaultWalletAddress, createAppShellState);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [events, setEvents] = useState<readonly PlayerEvent[]>([]);
  const [budgetDraft, setBudgetDraft] = useState<PetBudget>({
    spendableBudget: 1000,
    singleTxLimit: 50,
    dailyLimit: 200,
  });
  const [profitAmount, setProfitAmount] = useState("40");
  const [displayIdDraft, setDisplayIdDraft] = useState("");
  const restoredSessionRef = useRef(false);

  const starterPet = state.player?.pets[0] ?? null;

  useEffect(() => {
    if (!starterPet) {
      return;
    }

    setBudgetDraft(starterPet.budget);
  }, [starterPet?.budget.dailyLimit, starterPet?.budget.singleTxLimit, starterPet?.budget.spendableBudget]);

  useEffect(() => {
    if (restoredSessionRef.current) {
      return;
    }

    restoredSessionRef.current = true;

    const restoredSession = readPersistedSession(window.localStorage);
    if (!restoredSession) {
      return;
    }

    dispatch({ type: "session-authenticated", session: restoredSession });
    setPendingAction("restore");
    void loadDashboard(restoredSession);
  }, []);

  async function loadDashboard(nextSession: AuthSession) {
    try {
      const [player, nextEvents] = await Promise.all([
        api.getMe(nextSession.token),
        api.listEvents(nextSession.token),
      ]);

      dispatch({ type: "player-loaded", player });
      setEvents(nextEvents);
    } catch (nextError) {
      clearPersistedSession(window.localStorage);
      dispatch({ type: "session-cleared" });
      dispatch({
        type: "error-set",
        error: formatError(nextError, "Saved session expired. Sign in again."),
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function mutateAndRefresh(
    action: PendingAction,
    run: (session: AuthSession, player: PlayerSnapshot) => Promise<unknown>,
  ) {
    if (!state.session || !state.player) {
      dispatch({ type: "error-set", error: "Load the player home before mutating game state." });
      return;
    }

    setPendingAction(action);
    dispatch({ type: "error-cleared" });

    try {
      await run(state.session, state.player);
      await loadDashboard(state.session);
    } catch (nextError) {
      dispatch({ type: "error-set", error: formatError(nextError, "Action failed") });
      setPendingAction(null);
    }
  }

  async function handleCreateChallenge() {
    setPendingAction("challenge");
    dispatch({ type: "error-cleared" });

    try {
      const nextChallenge = await api.createChallenge(state.walletAddress);
      dispatch({ type: "challenge-issued", challenge: nextChallenge });
    } catch (nextError) {
      dispatch({ type: "error-set", error: formatError(nextError, "Challenge request failed") });
    } finally {
      setPendingAction(null);
    }
  }

  async function handleVerifyChallenge() {
    if (!state.challenge) {
      dispatch({ type: "error-set", error: "Create a challenge first." });
      return;
    }

    setPendingAction("verify");
    dispatch({ type: "error-cleared" });

    try {
      const nextSession = await api.verifyChallenge(
        state.challenge.walletAddress,
        `signed:${state.challenge.nonce}`,
      );
      writePersistedSession(window.localStorage, nextSession);
      dispatch({ type: "session-authenticated", session: nextSession });
    } catch (nextError) {
      dispatch({ type: "error-set", error: formatError(nextError, "Verification failed") });
    } finally {
      setPendingAction(null);
    }
  }

  async function handleBootstrapPlayer() {
    if (!state.session) {
      dispatch({ type: "error-set", error: "Verify the wallet challenge first." });
      return;
    }

    setPendingAction("bootstrap");
    dispatch({ type: "error-cleared" });

    try {
      await api.bootstrapPlayer(state.session.token);
    } catch {
      // player may already exist — continue to load dashboard
    }

    await loadDashboard(state.session);
  }

  async function handleRefreshPlayer() {
    if (!state.session) {
      dispatch({ type: "error-set", error: "No active session to refresh." });
      return;
    }

    setPendingAction("refresh");
    dispatch({ type: "error-cleared" });
    await loadDashboard(state.session);
  }

  const status = statusCopy[state.status];
  const isBusy = pendingAction !== null;
  const hasSession = state.session !== null;
  const hasPlayer = state.player !== null;

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-cyan-300/15 bg-slate-950/80 p-6 shadow-[0_30px_90px_rgba(2,6,23,0.45)] backdrop-blur-xl sm:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(125,211,252,0.08),transparent_28%)]" />
      <div className="relative flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/80">Player Home Shell</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              The first home state now covers auth, budget tuning, command issuing, and event history.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              This panel no longer stops at session restore. It can move profit, change pet budget
              constraints, dispatch starter commands, and read back the resulting event stream.
            </p>
          </div>

          <StateBadge status={status.label} description={status.description} action={pendingAction} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Live shell</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{status.label}</h3>
              </div>
              <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-cyan-100">
                {state.walletAddress.slice(0, 10)}...{state.walletAddress.slice(-4)}
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <Metric label="Wallet" value={state.walletAddress} muted />
              <Metric label="Session" value={state.session ? "Saved locally" : "Not saved"} />
              <Metric label="Treasury" value={`${state.player?.budget ?? 0}`} />
              <Metric label="Profit pool" value={`${state.player?.profitPool ?? 0}`} />
            </div>

            <div className="mt-5 rounded-[24px] border border-cyan-300/10 bg-slate-900/70 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Current loop</p>
                  <p className="mt-2 text-sm text-slate-300">Challenge, restore, mutate a pet, and verify the event log.</p>
                </div>
                <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                  {pendingAction ? `${pendingAction}...` : "Idle"}
                </div>
              </div>

              <ol className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  ["1", "Authenticate", "Challenge and verify the wallet session."],
                  ["2", "Bootstrap", "Hydrate the player snapshot and starter pet."],
                  ["3", "Operate", "Tune budget, move profit, and issue commands."],
                ].map(([index, title, detail]) => (
                  <li key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.24em] text-cyan-200/80">Step {index}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{detail}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Command deck</p>
            <div className="mt-4 flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm text-slate-200">
                Wallet address
                <input
                  value={state.walletAddress}
                  onChange={(event) => dispatch({ type: "wallet-changed", walletAddress: event.target.value })}
                  className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                  spellCheck={false}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <ActionButton
                  label={pendingAction === "challenge" ? "Requesting..." : "Create challenge"}
                  onClick={handleCreateChallenge}
                  disabled={isBusy}
                />
                <ActionButton
                  label={pendingAction === "verify" ? "Verifying..." : "Verify"}
                  onClick={handleVerifyChallenge}
                  disabled={isBusy || !state.challenge}
                />
                <ActionButton
                  label={pendingAction === "bootstrap" || pendingAction === "restore" ? "Bootstrapping..." : "Bootstrap"}
                  onClick={handleBootstrapPlayer}
                  disabled={isBusy || !hasSession}
                  primary
                />
                <ActionButton
                  label={pendingAction === "refresh" ? "Refreshing..." : "Refresh"}
                  onClick={handleRefreshPlayer}
                  disabled={isBusy || !hasPlayer}
                />
              </div>
            </div>
          </div>
        </div>

        {state.error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {state.error}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-3">
          <InfoCard title="Starter pet" eyebrow="Core unit">
            {starterPet ? (
              <div className="space-y-3 text-sm text-slate-200">
                <p className="text-lg font-semibold text-white">{starterPet.name}</p>
                <p className="text-slate-300">{starterPet.species} / level {starterPet.level}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat label="Spendable" value={`${starterPet.budget.spendableBudget}`} />
                  <Stat label="Single tx" value={`${starterPet.budget.singleTxLimit}`} />
                  <Stat label="Daily" value={`${starterPet.budget.dailyLimit}`} />
                </div>
                <p className="break-all text-xs text-slate-400">
                  Chain sync: {starterPet.chainSync.syncStatus} / {starterPet.chainSync.onchainId}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No player created yet.</p>
            )}
          </InfoCard>

          <InfoCard title="Profit actions" eyebrow="Treasury flow">
            {hasPlayer && starterPet ? (
              <div className="space-y-4">
                <label className="flex flex-col gap-2 text-sm text-slate-200">
                  Amount
                  <input
                    value={profitAmount}
                    onChange={(event) => setProfitAmount(event.target.value)}
                    className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ActionButton
                    label="Reinvest"
                    disabled={isBusy}
                    onClick={() => {
                      const amount = Number(profitAmount);
                      if (!amount || amount <= 0) {
                        dispatch({ type: "error-set", error: "Enter a valid amount greater than 0." });
                        return;
                      }
                      mutateAndRefresh("reinvest", (session) =>
                        api.reinvestProfit(session.token, starterPet.id, amount),
                      );
                    }}
                    primary
                  />
                  <ActionButton
                    label="Withdraw"
                    disabled={isBusy}
                    onClick={() => {
                      const amount = Number(profitAmount);
                      if (!amount || amount <= 0) {
                        dispatch({ type: "error-set", error: "Enter a valid amount greater than 0." });
                        return;
                      }
                      mutateAndRefresh("withdraw", (session) =>
                        api.withdrawProfit(session.token, amount),
                      );
                    }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Bootstrap the player before moving profit.</p>
            )}
          </InfoCard>

          <InfoCard title="显示 ID" eyebrow="身份标识">
          {hasPlayer ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">
                当前：<span className="text-white">{state.player?.displayId ? `@${state.player.displayId}` : "未设置"}</span>
              </p>
              <label className="flex flex-col gap-2 text-sm text-slate-200">
                新 ID（字母、数字、下划线、中文，最多 32 位）
                <input
                  value={displayIdDraft}
                  onChange={(e) => setDisplayIdDraft(e.target.value)}
                  placeholder="your_handle"
                  className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                />
              </label>
              <ActionButton
                label="保存 ID"
                disabled={isBusy || !displayIdDraft.trim()}
                onClick={() =>
                  mutateAndRefresh("budget", (session) =>
                    api.setDisplayId(session.token, displayIdDraft.trim()),
                  )
                }
                primary
              />
            </div>
          ) : (
            <p className="text-sm text-slate-400">Bootstrap 玩家后可设置显示 ID。</p>
          )}
        </InfoCard>

        <InfoCard title="Chain sync" eyebrow="Adapter">
            {state.player ? (
              <div className="space-y-3 text-sm text-slate-200">
                <p className="break-all"><span className="text-slate-400">Player sync:</span> {state.player.chainSync.onchainId}</p>
                <p><span className="text-slate-400">Status:</span> {state.player.chainSync.syncStatus}</p>
                <p><span className="text-slate-400">Last sync:</span> {state.player.chainSync.lastSyncedAt ?? "n/a"}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Chain metadata appears once the player is bootstrapped.</p>
            )}
          </InfoCard>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <InfoCard title="Budget controls" eyebrow="Pet policy">
            {starterPet ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <BudgetField
                    label="Spendable"
                    value={budgetDraft.spendableBudget}
                    onChange={(value) => setBudgetDraft((current) => ({ ...current, spendableBudget: value }))}
                  />
                  <BudgetField
                    label="Single tx"
                    value={budgetDraft.singleTxLimit}
                    onChange={(value) => setBudgetDraft((current) => ({ ...current, singleTxLimit: value }))}
                  />
                  <BudgetField
                    label="Daily"
                    value={budgetDraft.dailyLimit}
                    onChange={(value) => setBudgetDraft((current) => ({ ...current, dailyLimit: value }))}
                  />
                </div>
                <ActionButton
                  label={pendingAction === "budget" ? "Saving..." : "Save budget"}
                  disabled={isBusy}
                  onClick={() =>
                    mutateAndRefresh("budget", (session) =>
                      api.updatePetBudget(session.token, starterPet.id, budgetDraft),
                    )
                  }
                  primary
                />
              </div>
            ) : (
              <p className="text-sm text-slate-400">No pet budget to tune yet.</p>
            )}
          </InfoCard>

          <InfoCard title="Starter commands" eyebrow="Pet actions">
            {starterPet ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {commandDeck.map((command) => (
                  <button
                    key={command.key}
                    type="button"
                    disabled={isBusy}
                    onClick={() =>
                      mutateAndRefresh("command", (session) =>
                        api.issueCommand(session.token, starterPet.id, command.key),
                      )
                    }
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-cyan-300/30 hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <p className="text-sm font-semibold text-white">{command.label}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{command.detail}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Commands appear after the starter pet is loaded.</p>
            )}
          </InfoCard>
        </div>

        <InfoCard title="Recent events" eyebrow="Home feed">
          {events.length > 0 ? (
            <div className="grid gap-3">
              {events.slice(0, 8).map((event) => (
                <div key={event.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{event.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{event.detail}</p>
                    </div>
                    <div className="text-right text-xs uppercase tracking-[0.18em] text-cyan-100/70">
                      <p>{event.type}</p>
                      <p className="mt-1 text-slate-500">{event.createdAt}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No events yet. Authenticate and bootstrap the home to start the feed.</p>
          )}
        </InfoCard>
      </div>
    </section>
  );
}

function StateBadge({
  status,
  description,
  action,
}: Readonly<{ status: string; description: string; action: PendingAction }>) {
  return (
    <div className="max-w-sm rounded-[24px] border border-white/10 bg-slate-900/80 p-4 shadow-lg shadow-slate-950/20">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Shell status</p>
      <p className="mt-2 text-lg font-semibold text-white">{status}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
      <p className="mt-3 text-xs uppercase tracking-[0.22em] text-cyan-200/80">
        {action ? `Action: ${action}` : "Standing by"}
      </p>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  primary = false,
}: Readonly<{
  label: string;
  onClick: () => void;
  disabled: boolean;
  primary?: boolean;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-2xl px-5 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        primary
          ? "bg-cyan-300 text-slate-950 hover:bg-cyan-200"
          : "border border-white/10 bg-white/5 text-white hover:border-cyan-300/30 hover:bg-cyan-300/10",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function BudgetField({
  label,
  value,
  onChange,
}: Readonly<{
  label: string;
  value: number;
  onChange: (value: number) => void;
}>) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-200">
      {label}
      <input
        value={String(value)}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
      />
    </label>
  );
}

function InfoCard({
  title,
  eyebrow,
  children,
}: Readonly<{
  title: string;
  eyebrow: string;
  children: ReactNode;
}>) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{eyebrow}</p>
      <h3 className="mt-2 text-lg font-semibold text-white">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Metric({
  label,
  value,
  muted = false,
}: Readonly<{ label: string; value: string; muted?: boolean }>) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className={["mt-2 text-sm font-medium", muted ? "text-slate-300" : "text-white"].join(" ")}>{value}</p>
    </div>
  );
}

function Stat({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function formatError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
