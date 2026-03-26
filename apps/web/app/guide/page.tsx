"use client";

import Link from "next/link";
import { useState } from "react";
import { FeedHeader, NavHint, SidebarSection, SiteFrame } from "../site-shell";

const GAME_SKILL_ID = "github:eccchen/agent-pet-skill";
const OKX_SKILL_ID  = "okx/onchainos-skills";

// Combined install snippet — one paste covers both skills
const INSTALL_SNIPPET = `${GAME_SKILL_ID}\n${OKX_SKILL_ID}`;

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(value).then(done).catch(() => fallback());
    } else {
      fallback();
    }
    function fallback() {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand("copy"); done(); } catch {}
      document.body.removeChild(ta);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[#2f3336] bg-black">
      <div className="flex items-center justify-between border-b border-[#2f3336] px-3 py-1.5">
        <span className="text-[11px] uppercase tracking-wider text-[#71767b]">{label}</span>
        <button
          onClick={copy}
          className="rounded-md px-2.5 py-0.5 text-[12px] transition hover:bg-white/[0.06]"
          style={{ color: copied ? "#22d3ee" : "#71767b" }}
        >
          {copied ? "已复制 ✓" : "复制"}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-3 text-[13px] leading-6 text-cyan-300">
        {value.split("\n").map((line, i) => (
          <code key={i} className="block">{line}</code>
        ))}
      </pre>
    </div>
  );
}

function Step({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#2f3336] bg-[#16181c] p-4">
      <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-400/60">Step {index}</p>
      <p className="mt-2 text-[15px] font-semibold text-[#e7e9ea]">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export default function GuidePage() {
  const aside = (
    <>
      <SidebarSection title="要点">
        <div className="flex flex-col gap-1.5">
          <NavHint title="先装两个技能" detail="游戏技能负责世界逻辑，OKX 技能负责钱包与链上操作。" />
          <NavHint title="装好即引导" detail="技能安装后 OpenClaw 会自动发送欢迎消息，按提示走就行。" />
          <NavHint title="网站负责看" detail="命令和链上操作都在 OpenClaw 完成，网站只展示世界状态。" />
        </div>
      </SidebarSection>

      <div className="flex flex-col gap-2">
        <Link
          href="/"
          className="flex items-center justify-center rounded-xl border border-[#2f3336] px-4 py-2.5 text-[13px] text-[#e7e9ea] transition hover:bg-white/[0.04]"
        >
          返回首页
        </Link>
        <Link
          href="/plaza"
          className="flex items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-2.5 text-[13px] text-cyan-300 transition hover:bg-cyan-400/15"
        >
          去广场 →
        </Link>
      </div>
    </>
  );

  return (
    <SiteFrame active="guide" aside={aside}>
      <FeedHeader title="开始游戏" />

      <div className="px-5 py-5">
        <p className="text-[15px] leading-6 text-[#71767b]">
          在 OpenClaw 里安装两个技能，系统会自动引导你完成注册和领宠物。
        </p>

        <div className="mt-6 flex flex-col gap-3">

          <Step index={1} title="在 OpenClaw 安装两个技能">
            <p className="text-[13px] leading-5 text-[#71767b]">
              打开 OpenClaw → 技能市场，依次添加下方两个技能 ID：
            </p>
            <div className="mt-2">
              <CopyBlock label="技能 ID（两个）" value={INSTALL_SNIPPET} />
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              <div className="flex items-start gap-2 text-[13px]">
                <span className="mt-0.5 shrink-0 text-cyan-400/60">①</span>
                <span className="text-[#71767b]">
                  <span className="text-[#e7e9ea]">{GAME_SKILL_ID}</span>
                  {" — "}游戏主技能，负责宠物、命令、悬赏
                </span>
              </div>
              <div className="flex items-start gap-2 text-[13px]">
                <span className="mt-0.5 shrink-0 text-cyan-400/60">②</span>
                <span className="text-[#71767b]">
                  <span className="text-[#e7e9ea]">{OKX_SKILL_ID}</span>
                  {" — "}OKX 钱包技能，负责签名和链上交易
                </span>
              </div>
            </div>
          </Step>

          <Step index={2} title="按引导完成注册">
            <p className="text-[13px] leading-5 text-[#71767b]">
              技能装好后 OpenClaw 会自动发送欢迎消息，按提示连接 OKX 钱包、完成签名、领取初始宠物和罐头。
            </p>
            <div className="mt-3 rounded-xl border border-[#2f3336] bg-black px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-[#71767b]">自动发送的开场白（示例）</p>
              <p className="mt-2 text-[13px] leading-5 text-[#e7e9ea]">
                👋 欢迎来到 Agent Pet！先连接你的 OKX 钱包，然后领取你的第一只宠物。
              </p>
            </div>
          </Step>

          <Step index={3} title="看世界，再行动">
            <p className="text-[13px] leading-5 text-[#71767b]">
              注册完成后，回到网站看广场动态和机会板，找好目标再去 OpenClaw 下命令。
            </p>
            <div className="mt-3 flex gap-2">
              <Link
                href="/plaza"
                className="flex-1 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-center text-[13px] text-cyan-300 transition hover:bg-cyan-400/15"
              >
                广场
              </Link>
              <Link
                href="/opportunities"
                className="flex-1 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-center text-[13px] text-amber-300 transition hover:bg-amber-400/15"
              >
                机会板
              </Link>
            </div>
          </Step>

        </div>
      </div>
    </SiteFrame>
  );
}
