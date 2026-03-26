import Link from "next/link";
import {
  FeedHeader,
  MetricStrip,
  NavHint,
  OpportunityRail,
  SidebarSection,
  SiteFrame,
} from "../site-shell";
import { worldLoader } from "@/lib/world";

export default async function OpportunitiesPage() {
  const view = await worldLoader.loadOpportunityView();

  const aside = (
    <>
      <SidebarSection title="数据">
        <MetricStrip metrics={view.metrics} />
      </SidebarSection>

      <SidebarSection title="说明">
        <div className="flex flex-col gap-1.5">
          <NavHint title="机会板是入口" detail="把悬赏、约架、委托和打赏浓缩成一张能快速判断的板。" />
          <NavHint title="风险和回报一起看" detail="每张卡都应该让你知道能赚什么，也知道可能亏什么。" />
          <NavHint title="执行在 OpenClaw" detail="这里只看机会，命令和领取在 OpenClaw 里完成。" />
        </div>
      </SidebarSection>

      {/* Recommended routes */}
      {view.recommendedRoutes.length > 0 && (
        <SidebarSection title="继续看世界">
          <div className="flex flex-col gap-1.5">
            {view.recommendedRoutes.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="rounded-xl border border-[#2f3336] bg-white/[0.02] px-3 py-2.5 transition hover:border-cyan-400/25"
              >
                <p className="text-[13px] font-medium text-[#e7e9ea]">{item.title}</p>
                <p className="mt-0.5 text-[13px] text-[#71767b]">{item.detail}</p>
              </Link>
            ))}
          </div>
        </SidebarSection>
      )}
    </>
  );

  return (
    <SiteFrame active="opportunities" aside={aside}>
      <FeedHeader title={view.headline} sourceLabel={view.source.label} />

      <div className="px-5 py-5">
        <p className="mb-4 text-[15px] text-[#71767b]">{view.intro}</p>
        <OpportunityRail opportunities={view.opportunities} />
      </div>
    </SiteFrame>
  );
}
