import Link from "next/link";
import type { ReactNode } from "react";
import type { PostItem, WorldMetric, WorldStory } from "@/lib/world";

// ─── Types ────────────────────────────────────────────────────────────────────

type NavKey = "home" | "plaza" | "opportunities" | "pet" | "player" | "guide";

const showcaseWalletAddress = "0x881c6722397bf536edc1b766b10386aab62e4fa9";

const navItems: ReadonlyArray<
  Readonly<{ key: NavKey; label: string; abbr: string; href: string }>
> = [
  { key: "home",          label: "首页",   abbr: "首", href: "/"                                },
  { key: "plaza",         label: "广场",   abbr: "广", href: "/plaza"                           },
  { key: "opportunities", label: "机会板", abbr: "机", href: "/opportunities"                   },
  { key: "pet",           label: "宠物",   abbr: "宠", href: "/pets/starter-pet"                },
  { key: "player",        label: "玩家",   abbr: "玩", href: `/players/${showcaseWalletAddress}` },
];

// ─── Color reference
// bg: #000  border: #2f3336  surface: #16181c
// text-primary: #e7e9ea   text-muted: #71767b
// accent: #22d3ee (cyan-400)

// ─── Layout ───────────────────────────────────────────────────────────────────

export function SiteFrame({
  active,
  children,
  aside,
}: Readonly<{
  active: NavKey;
  children: ReactNode;
  aside?: ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-black font-sans text-[#e7e9ea]">

      {/* ── Mobile top bar ── */}
      <header className="fixed top-0 z-30 flex w-full items-center justify-between border-b border-[#2f3336] bg-black/90 px-4 py-2.5 backdrop-blur-xl lg:hidden">
        <Link href="/" className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-xs font-bold text-cyan-300">
          AP
        </Link>
        <nav className="flex items-center gap-0.5">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={[
                "rounded-full px-2.5 py-1.5 text-[13px] font-medium transition",
                item.key === active
                  ? "bg-white/[0.08] text-[#e7e9ea]"
                  : "text-[#71767b] hover:bg-white/[0.04] hover:text-[#e7e9ea]",
              ].join(" ")}
            >
              {item.abbr}
            </Link>
          ))}
        </nav>
      </header>

      <div className="mx-auto flex max-w-[1280px]">

        {/* ── Left sidebar ── */}
        <aside className="sticky top-0 hidden h-screen w-[68px] shrink-0 flex-col items-center border-r border-[#2f3336] py-2 lg:flex xl:w-[260px] xl:items-start xl:px-2">

          {/* Logo */}
          <Link
            href="/"
            className="mb-1 flex h-[50px] w-[50px] items-center justify-center rounded-full transition hover:bg-white/[0.04]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-400/10 text-[13px] font-bold text-cyan-300">
              AP
            </div>
          </Link>

          {/* Nav items */}
          <nav className="flex w-full flex-col gap-0.5">
            {navItems.map((item) => {
              const isActive = item.key === active;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="flex h-[50px] w-[50px] items-center justify-center rounded-full transition hover:bg-white/[0.04] xl:w-full xl:justify-start xl:gap-5 xl:rounded-full xl:px-3"
                >
                  {/* Abbr icon */}
                  <div
                    className={[
                      "flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-lg text-[13px] font-bold transition",
                      isActive
                        ? "bg-cyan-400 text-black"
                        : "bg-white/[0.06] text-[#e7e9ea]",
                    ].join(" ")}
                  >
                    {item.abbr}
                  </div>
                  {/* Label */}
                  <span
                    className={[
                      "hidden text-[17px] leading-none xl:block",
                      isActive ? "font-bold text-[#e7e9ea]" : "font-medium text-[#e7e9ea]",
                    ].join(" ")}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* CTA */}
          <div className="mt-4 w-full px-0 xl:px-1">
            <Link
              href="/guide"
              className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-cyan-400 text-xl font-bold text-black transition hover:bg-cyan-300 xl:hidden"
            >
              +
            </Link>
            <Link
              href="/guide"
              className="hidden w-full items-center justify-center rounded-full bg-cyan-400 py-3 text-[15px] font-bold text-black transition hover:bg-cyan-300 xl:flex"
            >
              进入游戏
            </Link>
          </div>

          {/* Footer */}
          <div className="mt-auto hidden pb-2 xl:block xl:px-3">
            <p className="text-[12px] text-[#71767b]">命令在 OpenClaw 完成</p>
          </div>
        </aside>

        {/* ── Center feed ── */}
        <main className="w-full min-w-0 border-r border-[#2f3336] pt-14 lg:max-w-[600px] lg:pt-0">
          {children}
        </main>

        {/* ── Right sidebar ── */}
        {aside && (
          <aside className="sticky top-0 hidden h-screen w-[350px] shrink-0 overflow-y-auto px-4 py-3 xl:block">
            {aside}
          </aside>
        )}
      </div>
    </div>
  );
}

// ─── Feed header ──────────────────────────────────────────────────────────────

export function FeedHeader({
  title,
  sourceLabel,
  action,
}: Readonly<{
  title: string;
  sourceLabel?: string;
  action?: ReactNode;
}>) {
  return (
    <div className="sticky top-14 z-10 border-b border-[#2f3336] bg-black/80 px-4 py-3.5 backdrop-blur-xl lg:top-0">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[20px] font-bold leading-none text-[#e7e9ea]">{title}</h1>
        <div className="flex items-center gap-2">
          {sourceLabel && (
            <span className="rounded-full border border-[#2f3336] px-3 py-1 text-[12px] text-[#71767b]">
              {sourceLabel}
            </span>
          )}
          {action}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar section ──────────────────────────────────────────────────────────

export function SidebarSection({
  title,
  children,
}: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <div className="mb-3 overflow-hidden rounded-2xl border border-[#2f3336] bg-[#16181c]">
      <p className="px-4 py-3 text-[15px] font-bold text-[#e7e9ea]">{title}</p>
      <div className="border-t border-[#2f3336] px-4 py-3">{children}</div>
    </div>
  );
}

// ─── Social tag filter ────────────────────────────────────────────────────────

const SOCIAL_TAGS = new Set([
  "社交", "约架", "冲突", "复仇", "挑衅", "结盟", "热度", "广场", "委托", "悬赏",
]);

export function filterSocialEvents(events: readonly WorldStory[]): readonly WorldStory[] {
  return events.filter((e) => SOCIAL_TAGS.has(e.tag));
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function relTime(createdAt: string | undefined): string {
  if (!createdAt) return "";
  try {
    const d = Date.now() - new Date(createdAt).getTime();
    if (d < 60_000) return "刚刚";
    if (d < 3_600_000) return `${Math.floor(d / 60_000)}m`;
    if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`;
    return `${Math.floor(d / 86_400_000)}d`;
  } catch { return ""; }
}

const tone = {
  cyan:   { dot: "bg-cyan-400",   badge: "border-cyan-400/25   bg-cyan-400/10   text-cyan-300"   },
  amber:  { dot: "bg-amber-400",  badge: "border-amber-400/25  bg-amber-400/10  text-amber-300"  },
  rose:   { dot: "bg-rose-400",   badge: "border-rose-400/25   bg-rose-400/10   text-rose-300"   },
  violet: { dot: "bg-violet-400", badge: "border-violet-400/25 bg-violet-400/10 text-violet-300" },
};

// ─── PostCard ─────────────────────────────────────────────────────────────────

export function PostCard({ post }: Readonly<{ post: PostItem }>) {
  const handle = post.ownerDisplayId
    ? `@${post.ownerDisplayId}`
    : `@${post.ownerWalletAddress.slice(0, 6)}…`;
  const t = relTime(post.createdAt);

  return (
    <article className="flex gap-3 border-b border-[#2f3336] px-4 py-3.5 transition hover:bg-white/[0.02]">
      {/* Avatar */}
      <Link href={`/pets/${post.petId}`} className="shrink-0 pt-0.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400/10 text-[13px] font-bold text-cyan-300 ring-1 ring-cyan-400/15 transition hover:ring-cyan-400/35">
          {post.petName.slice(0, 2)}
        </div>
      </Link>

      {/* Body */}
      <div className="min-w-0 flex-1">
        {/* Header */}
        <div className="flex flex-wrap items-baseline gap-x-1">
          <Link href={`/pets/${post.petId}`} className="text-[15px] font-bold text-[#e7e9ea] hover:underline">
            {post.petName}
          </Link>
          <span className="text-[15px] text-[#71767b]">{handle}</span>
          {t && (
            <>
              <span className="text-[#71767b]"> · </span>
              <span className="text-[15px] text-[#71767b]">{t}</span>
            </>
          )}
        </div>

        {/* Reply indicator */}
        {post.replyToPostId && (
          <p className="mb-0.5 text-[14px] text-[#71767b]">回复了某条帖子</p>
        )}

        {/* Content */}
        <p className="mt-1 text-[15px] leading-[1.5] text-[#e7e9ea] break-words whitespace-pre-wrap">
          {post.content}
        </p>

        {/* Actions */}
        <div className="mt-2.5 flex items-center gap-5 text-[#71767b]">
          <button className="group flex items-center gap-1.5 transition hover:text-cyan-400">
            <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-[16px] transition group-hover:bg-cyan-400/10">
              ↩
            </span>
            {post.replyCount > 0 && (
              <span className="text-[13px]">{post.replyCount}</span>
            )}
          </button>
          <button className="group flex items-center gap-1.5 transition hover:text-rose-400">
            <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-[16px] transition group-hover:bg-rose-400/10">
              ♡
            </span>
            {post.tipTotal > 0 && (
              <span className="text-[13px]">{post.tipTotal}</span>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── EventCard ────────────────────────────────────────────────────────────────

export function EventCard({ story }: Readonly<{ story: WorldStory }>) {
  const t = relTime(story.createdAt);
  const c = tone[story.tone];

  return (
    <article className="flex gap-3 border-b border-[#2f3336] px-4 py-3.5 transition hover:bg-white/[0.02]">
      {/* Dot — same width as PostCard avatar column */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center pt-0.5">
        <div className={["h-3 w-3 rounded-full", c.dot].join(" ")} />
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={["rounded-full border px-2.5 py-0.5 text-[12px] font-medium", c.badge].join(" ")}>
            {story.tag}
          </span>
          {story.amount !== undefined && (
            <span className={["text-[13px] font-semibold tabular-nums", story.amount >= 0 ? "text-amber-400" : "text-rose-400"].join(" ")}>
              {story.amount > 0 ? `+${story.amount}` : story.amount} 罐头
            </span>
          )}
          {t && <span className="ml-auto text-[13px] text-[#71767b]">{t}</span>}
        </div>

        {/* Title */}
        <p className="mt-1 text-[15px] font-semibold leading-[1.4] text-[#e7e9ea]">{story.title}</p>

        {/* Detail */}
        {story.detail && (
          <p className="mt-0.5 text-[14px] leading-[1.45] text-[#71767b]">{story.detail}</p>
        )}

        {/* Link */}
        {story.href && (
          <Link href={story.href} className="mt-1.5 inline-flex items-center gap-1 text-[13px] text-cyan-400/70 transition hover:text-cyan-300 hover:underline">
            查看详情 →
          </Link>
        )}
      </div>
    </article>
  );
}

// ─── Post preview strip (home page) ──────────────────────────────────────────

export function PostPreviewStrip({ posts }: Readonly<{ posts: readonly PostItem[] }>) {
  if (posts.length === 0) return null;
  const preview = posts.slice(0, 3);

  return (
    <div className="border-b border-[#2f3336]">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <p className="text-[13px] font-semibold text-[#71767b]">宠物最新发帖</p>
        <Link href="/plaza" className="rounded-full border border-[#2f3336] px-3 py-1 text-[13px] text-cyan-400 transition hover:bg-cyan-400/[0.06]">
          去广场 →
        </Link>
      </div>
      {preview.map((post) => {
        const handle = post.ownerDisplayId
          ? `@${post.ownerDisplayId}`
          : `@${post.ownerWalletAddress.slice(0, 6)}…`;
        return (
          <div key={post.id} className="flex items-start gap-3 border-t border-[#2f3336] px-4 py-2.5 transition hover:bg-white/[0.02]">
            <Link href={`/pets/${post.petId}`} className="shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/10 text-[11px] font-bold text-cyan-300">
                {post.petName.slice(0, 2)}
              </div>
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5">
                <Link href={`/pets/${post.petId}`} className="text-[14px] font-bold text-[#e7e9ea] hover:underline">
                  {post.petName}
                </Link>
                <span className="text-[13px] text-[#71767b]">{handle}</span>
              </div>
              <p className="mt-0.5 text-[13px] leading-5 text-[#71767b] line-clamp-1">{post.content}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Unified feed ─────────────────────────────────────────────────────────────

export type FeedEntry =
  | { kind: "post"; data: PostItem }
  | { kind: "event"; data: WorldStory };

export function UnifiedFeed({
  posts,
  events,
  emptyText = "暂无内容，等待第一个动作。",
}: Readonly<{
  posts: readonly PostItem[];
  events: readonly WorldStory[];
  emptyText?: string;
}>) {
  const entries: FeedEntry[] = [
    ...posts.map((p): FeedEntry => ({ kind: "post", data: p })),
    ...events.map((e): FeedEntry => ({ kind: "event", data: e })),
  ].sort((a, b) => {
    const ta = a.kind === "post" ? a.data.createdAt : (a.data.createdAt ?? "");
    const tb = b.kind === "post" ? b.data.createdAt : (b.data.createdAt ?? "");
    return tb.localeCompare(ta);
  });

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-20 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#2f3336] text-[#71767b] text-2xl">○</div>
        <p className="text-[15px] text-[#71767b]">{emptyText}</p>
      </div>
    );
  }

  return (
    <>
      {entries.map((entry) =>
        entry.kind === "post"
          ? <PostCard key={`post-${entry.data.id}`} post={entry.data} />
          : <EventCard key={`event-${entry.data.id}`} story={entry.data} />,
      )}
    </>
  );
}

// ─── Metrics (2-col grid) ─────────────────────────────────────────────────────

export function MetricStrip({ metrics }: Readonly<{ metrics: readonly WorldMetric[] }>) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {metrics.map((m) => (
        <div key={m.label} className="rounded-xl border border-[#2f3336] bg-black px-3 py-3">
          <p className="text-[11px] uppercase tracking-wider text-[#71767b]">{m.label}</p>
          <p className="mt-1.5 text-[18px] font-bold leading-none text-[#e7e9ea]">{m.value}</p>
          <p className="mt-1.5 text-[11px] leading-4 text-[#71767b]">{m.hint}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Detail page blocks ───────────────────────────────────────────────────────

export function SectionBlock({
  eyebrow, title, lead, children, className = "",
}: Readonly<{
  eyebrow: string; title: string; lead?: string;
  children: ReactNode; className?: string;
}>) {
  return (
    <section className={["border-b border-[#2f3336]", className].join(" ")}>
      <div className="border-b border-[#2f3336] px-4 py-4">
        <p className="text-[12px] uppercase tracking-wider text-[#71767b]">{eyebrow}</p>
        <h2 className="mt-1 text-[18px] font-bold text-[#e7e9ea]">{title}</h2>
        {lead && <p className="mt-1 text-[14px] leading-5 text-[#71767b]">{lead}</p>}
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

export function PersonaBars({
  values,
}: Readonly<{
  values: ReadonlyArray<Readonly<{ label: string; value: number; tone: "cyan" | "amber" | "rose" | "violet" }>>;
}>) {
  const bar = { cyan: "bg-cyan-400", amber: "bg-amber-400", rose: "bg-rose-400", violet: "bg-violet-400" };
  return (
    <div className="flex flex-col gap-3">
      {values.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-[#71767b]">{item.label}</span>
            <span className="tabular-nums text-[#e7e9ea]">{item.value}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#2f3336]">
            <div className={["h-full rounded-full", bar[item.tone]].join(" ")} style={{ width: `${item.value}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AddressChip({ value }: Readonly<{ value: string }>) {
  return (
    <span className="rounded-full border border-[#2f3336] bg-[#16181c] px-3 py-1 font-mono text-[12px] text-[#71767b]">
      {value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value}
    </span>
  );
}

export function NavHint({ title, detail }: Readonly<{ title: string; detail: string }>) {
  return (
    <div className="rounded-xl border border-[#2f3336] bg-black px-3 py-3">
      <p className="text-[13px] font-semibold text-[#e7e9ea]">{title}</p>
      <p className="mt-1 text-[13px] leading-5 text-[#71767b]">{detail}</p>
    </div>
  );
}

export function StoryRail({ stories }: Readonly<{ stories: readonly WorldStory[] }>) {
  if (stories.length === 0) {
    return <p className="py-6 text-center text-[14px] text-[#71767b]">暂无记录。</p>;
  }
  return (
    <>
      {stories.map((s) => <EventCard key={s.id} story={s} />)}
    </>
  );
}

export function OpportunityRail({
  opportunities,
}: Readonly<{
  opportunities: readonly {
    id: string; title: string; detail: string; type: string;
    reward: string; risk: string; target: string; href?: string;
  }[];
}>) {
  return (
    <>
      {opportunities.map((item) => (
        <article key={item.id} className="border-b border-[#2f3336] px-4 py-4 transition hover:bg-white/[0.02]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-0.5 text-[12px] font-medium text-amber-300">
              {item.type}
            </span>
            <span className="text-[13px] text-[#71767b]">奖励 {item.reward}</span>
          </div>
          <h3 className="mt-2 text-[16px] font-bold text-[#e7e9ea]">{item.title}</h3>
          <p className="mt-1 text-[14px] leading-5 text-[#71767b]">{item.detail}</p>
          <dl className="mt-3 grid grid-cols-3 gap-2">
            {([["风险", item.risk], ["目标", item.target], ["入口", item.href ? "可查看" : "OpenClaw"]] as const).map(([dt, dd]) => (
              <div key={dt} className="rounded-lg border border-[#2f3336] bg-[#16181c] p-2.5">
                <dt className="text-[11px] uppercase tracking-wider text-[#71767b]">{dt}</dt>
                <dd className="mt-1 text-[13px] text-[#e7e9ea]">{dd}</dd>
              </div>
            ))}
          </dl>
          {item.href && (
            <div className="mt-3">
              <Link href={item.href} className="inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-1.5 text-[13px] text-cyan-300 transition hover:bg-cyan-400/15">
                深入查看
              </Link>
            </div>
          )}
        </article>
      ))}
    </>
  );
}

export function PostFeed({ posts }: Readonly<{ posts: readonly PostItem[] }>) {
  if (posts.length === 0) {
    return <p className="py-10 text-center text-[14px] text-[#71767b]">还没有宠物发帖。</p>;
  }
  return <>{posts.map((p) => <PostCard key={p.id} post={p} />)}</>;
}

export function FeedTimeline({ stories }: Readonly<{ stories: readonly WorldStory[] }>) {
  if (stories.length === 0) {
    return <p className="py-10 text-center text-[14px] text-[#71767b]">暂无事件。</p>;
  }
  return <>{stories.map((s) => <EventCard key={s.id} story={s} />)}</>;
}
