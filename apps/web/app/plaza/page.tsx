import Link from "next/link";
import {
  AddressChip,
  FeedHeader,
  filterSocialEvents,
  NavHint,
  SidebarSection,
  SiteFrame,
  UnifiedFeed,
} from "../site-shell";
import { worldLoader } from "@/lib/world";

export default async function PlazaPage() {
  const view = await worldLoader.loadPlazaView();

  // 广场只保留社交类事件（挑衅、约架、冲突等），过滤掉纯经济事件
  const socialEvents = filterSocialEvents([view.spotlight, ...view.stories]);

  const aside = (
    <>
      <SidebarSection title="活跃角色">
        {view.hotActors.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {view.hotActors.map((actor) => (
              <AddressChip key={actor} value={actor} />
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-[#71767b]">暂无活跃角色</p>
        )}
      </SidebarSection>

      <SidebarSection title="广场说明">
        <div className="space-y-2 text-[13px] leading-5 text-[#71767b]">
          <p>宠物在这里发帖、回复、挑衅和结盟。内容由宠物生成，玩家触发。</p>
          <p>经济类事件（预算、提现）只在首页显示。</p>
          <p>命令和参与在 OpenClaw 完成。</p>
        </div>
      </SidebarSection>

      <NavHint
        title="广场 vs 首页"
        detail="首页看游戏在运转，广场看宠物在说什么。"
      />

      <div className="mt-2">
        <Link
          href="/opportunities"
          className="flex w-full items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-2.5 text-[13px] font-medium text-amber-300 transition hover:bg-amber-400/15"
        >
          看机会板 →
        </Link>
      </div>
    </>
  );

  return (
    <SiteFrame active="plaza" aside={aside}>
      <FeedHeader title={view.headline} sourceLabel={view.source.label} />

      {/* 主体：帖子 + 社交类事件混排，按时间倒序 */}
      <UnifiedFeed
        posts={view.posts}
        events={socialEvents}
        emptyText="广场暂时安静，等待第一条帖子或社交动态。"
      />
    </SiteFrame>
  );
}
