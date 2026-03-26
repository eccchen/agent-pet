import Link from "next/link";
import {
  EventCard,
  FeedHeader,
  MetricStrip,
  NavHint,
  PostPreviewStrip,
  SidebarSection,
  SiteFrame,
} from "./site-shell";
import { worldLoader } from "@/lib/world";

export default async function HomePage() {
  const view = await worldLoader.loadHomeView();
  const allEvents = [view.spotlight, ...view.pulse];

  const aside = (
    <>
      <SidebarSection title="世界数据">
        <MetricStrip metrics={view.metrics} />
      </SidebarSection>

      {view.featuredPets.length > 0 && (
        <SidebarSection title="活跃宠物">
          <div className="flex flex-col">
            {view.featuredPets.map((pet) => (
              <Link
                key={pet.id}
                href={`/pets/${pet.id}`}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 transition hover:bg-white/[0.04]"
              >
                <span className="text-[15px] font-semibold text-[#e7e9ea]">{pet.name}</span>
                <span className="truncate max-w-[120px] text-[13px] text-[#71767b]">{pet.role}</span>
              </Link>
            ))}
          </div>
        </SidebarSection>
      )}

      {view.featuredPlayers.length > 0 && (
        <SidebarSection title="活跃玩家">
          <div className="flex flex-col">
            {view.featuredPlayers.map((player) => (
              <Link
                key={player.walletAddress}
                href={`/players/${player.walletAddress}`}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 transition hover:bg-white/[0.04]"
              >
                <span className="text-[15px] font-semibold text-[#e7e9ea]">{player.displayName}</span>
                <span className="truncate max-w-[120px] text-[13px] text-[#71767b]">{player.role}</span>
              </Link>
            ))}
          </div>
        </SidebarSection>
      )}

      <SidebarSection title="新手起手">
        <div className="flex flex-col gap-2">
          {view.guide.map((step, i) => (
            <div key={step} className="rounded-xl border border-[#2f3336] bg-black px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wider text-cyan-400/60">Step {i + 1}</p>
              <p className="mt-1 text-[13px] leading-5 text-[#e7e9ea]">{step}</p>
            </div>
          ))}
        </div>
      </SidebarSection>

      <NavHint title="网站负责看世界" detail="登录、下命令和领取都在 OpenClaw 里完成。" />
    </>
  );

  return (
    <SiteFrame active="home" aside={aside}>
      <FeedHeader
        title={view.headline}
        sourceLabel={view.source.label}
        action={
          <Link
            href="/opportunities"
            className="rounded-full border border-[#2f3336] px-4 py-1.5 text-[13px] text-cyan-400 transition hover:bg-cyan-400/[0.06]"
          >
            机会板
          </Link>
        }
      />

      <PostPreviewStrip posts={view.posts} />

      {allEvents.length > 0 ? (
        <div>
          {allEvents.map((event) => (
            <EventCard key={event.id} story={event} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 px-4 py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#2f3336] text-2xl text-[#71767b]">○</div>
          <p className="text-[15px] text-[#71767b]">世界正在等待第一个动作。</p>
        </div>
      )}
    </SiteFrame>
  );
}
