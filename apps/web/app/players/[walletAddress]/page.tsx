import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AddressChip,
  EventCard,
  FeedHeader,
  NavHint,
  SidebarSection,
  SiteFrame,
} from "../../site-shell";
import { worldLoader } from "@/lib/world";

type PlayerPageProps = Readonly<{ params: Promise<{ walletAddress: string }> }>;

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { walletAddress } = await params;
  if (!walletAddress) notFound();

  const view = await worldLoader.loadPlayerView(walletAddress);
  const { player } = view;

  const aside = (
    <>
      <SidebarSection title="资产">
        <div className="flex flex-col gap-2 text-[13px]">
          {([
            ["主余额", `${player.budget} 罐头`],
            ["收益池", `${player.profitPool} 罐头`],
          ] as const).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-[#71767b]">{k}</span>
              <span className="text-[#e7e9ea]">{v}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-[#2f3336] pt-2">
            <span className="text-[#71767b]">可领取</span>
            <span className="text-amber-400">{player.claimableBalance} 罐头</span>
          </div>
        </div>
      </SidebarSection>

      {player.pets.length > 0 && (
        <SidebarSection title={`旗下宠物`}>
          <div className="flex flex-col">
            {player.pets.map((pet) => (
              <Link
                key={pet.id}
                href={`/pets/${pet.id}`}
                className="rounded-xl px-3 py-2.5 transition hover:bg-white/[0.04]"
              >
                <p className="text-[15px] font-semibold text-[#e7e9ea]">{pet.name}</p>
                <p className="text-[13px] text-[#71767b]">{pet.strategy}</p>
              </Link>
            ))}
          </div>
        </SidebarSection>
      )}

      <SidebarSection title="关于">
        <p className="mb-2 text-[13px] leading-5 text-[#71767b]">{player.focus}</p>
        <NavHint
          title={`${player.displayName} · ${player.clan}`}
          detail="适合围绕预算和热度做长期选择"
        />
      </SidebarSection>
    </>
  );

  return (
    <SiteFrame active="player" aside={aside}>
      <FeedHeader title={view.headline} sourceLabel={view.source.label} />

      {/* Profile card */}
      <div className="flex gap-4 border-b border-[#2f3336] px-4 py-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-violet-400/10 text-xl font-bold text-violet-300 ring-2 ring-violet-400/20">
          {player.displayName.slice(0, 2)}
        </div>
        <div className="flex-1">
          <h2 className="text-[20px] font-bold text-[#e7e9ea]">{player.displayName}</h2>
          <p className="text-[15px] text-[#71767b]">{player.clan}</p>
          <div className="mt-2">
            <AddressChip value={player.walletAddress} />
          </div>
          <p className="mt-2 text-[15px] leading-6 text-[#71767b]">{view.intro}</p>
        </div>
      </div>

      {player.recentStories.length > 0 ? (
        <>
          {player.recentStories.map((story) => (
            <EventCard key={story.id} story={story} />
          ))}
        </>
      ) : (
        <div className="px-4 py-12 text-center text-[14px] text-[#71767b]">
          这位玩家还没有留下任何痕迹。
        </div>
      )}
    </SiteFrame>
  );
}
