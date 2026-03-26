import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AddressChip,
  EventCard,
  FeedHeader,
  NavHint,
  PersonaBars,
  SidebarSection,
  SiteFrame,
} from "../../site-shell";
import { worldLoader } from "@/lib/world";

type PetPageProps = Readonly<{ params: Promise<{ petId: string }> }>;

export default async function PetPage({ params }: PetPageProps) {
  const { petId } = await params;
  if (!petId) notFound();

  const view = await worldLoader.loadPetView(petId);
  const { pet } = view;

  const aside = (
    <>
      <SidebarSection title="性格">
        <PersonaBars
          values={[
            { label: "忠诚", value: pet.personality.loyalty, tone: "cyan" },
            { label: "怨气", value: pet.personality.resentment, tone: "rose" },
            { label: "野心", value: pet.personality.ambition, tone: "violet" },
            { label: "热度", value: pet.personality.heat, tone: "amber" },
          ]}
        />
      </SidebarSection>

      <SidebarSection title="预算">
        <div className="flex flex-col gap-2 text-[13px]">
          {([
            ["可用", `${pet.budget.spendableBudget} 罐头`],
            ["单笔上限", String(pet.budget.singleTxLimit)],
            ["日上限", String(pet.budget.dailyLimit)],
          ] as const).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-[#71767b]">{k}</span>
              <span className="text-[#e7e9ea]">{v}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-[#2f3336] pt-2">
            <span className="text-[#71767b]">可领取</span>
            <span className="text-amber-400">{pet.claimableBalance} 罐头</span>
          </div>
        </div>
      </SidebarSection>

      <SidebarSection title="策略">
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[12px] text-cyan-300">
            {pet.strategyMode}
          </span>
          <span className="rounded-full border border-[#2f3336] px-2.5 py-1 text-[12px] text-[#71767b]">
            {pet.autonomyLevel}
          </span>
          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[12px] text-amber-300">
            {pet.targetPreference}
          </span>
        </div>
        {pet.recommendations.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {pet.recommendations.map((rec) => (
              <NavHint key={rec} title="推荐动作" detail={rec} />
            ))}
          </div>
        )}
      </SidebarSection>

      <SidebarSection title="主人">
        <p className="text-[14px] text-[#e7e9ea] mb-2">{pet.ownerLabel}</p>
        <Link href={`/players/${pet.ownerWalletAddress}`}>
          <AddressChip value={pet.ownerWalletAddress} />
        </Link>
      </SidebarSection>
    </>
  );

  return (
    <SiteFrame active="pet" aside={aside}>
      <FeedHeader title={view.headline} sourceLabel={view.source.label} />

      {/* Profile card */}
      <div className="flex gap-4 border-b border-[#2f3336] px-4 py-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-xl font-bold text-cyan-300 ring-2 ring-cyan-400/20">
          {pet.name.slice(0, 2)}
        </div>
        <div className="flex-1">
          <h2 className="text-[20px] font-bold text-[#e7e9ea]">{pet.name}</h2>
          <p className="text-[15px] text-[#71767b]">{pet.species} · Lv.{pet.level}</p>
          <p className="mt-2 text-[15px] leading-6 text-[#71767b]">{view.intro}</p>
        </div>
      </div>

      {view.relatedStories.length > 0 ? (
        <>
          {view.relatedStories.map((story) => (
            <EventCard key={story.id} story={story} />
          ))}
        </>
      ) : (
        <div className="px-4 py-12 text-center text-[14px] text-[#71767b]">
          这只宠物还没有留下任何痕迹。
        </div>
      )}
    </SiteFrame>
  );
}
