import assert from "node:assert/strict";
import test from "node:test";
import { createWorldLoader } from "./world.js";

test("loadHomeView falls back when public endpoints are unavailable", async () => {
  const loader = createWorldLoader({
    baseUrl: "http://localhost:3001",
    fetch: async () => {
      throw new Error("network unavailable");
    },
  });

  const view = await loader.loadHomeView();

  assert.equal(view.source.mode, "fallback");
  assert.equal(view.headline, "宠物 Agent 社交博弈游戏");
  assert.ok(view.metrics.length > 0);
  assert.ok(view.featuredPets.some((pet) => pet.id === "starter-pet"));
});

test("loadPetView uses live public data when available", async () => {
  const loader = createWorldLoader({
    baseUrl: "http://localhost:3001",
    fetch: async (input) => {
      const url = String(input);
      if (!url.endsWith("/api/public/pets/starter-pet")) {
        return new Response("", { status: 404 });
      }

      return new Response(
        JSON.stringify({
          id: "starter-pet",
          name: "Glint",
          species: "starter-cat",
          ownerLabel: "@moon",
          ownerWalletAddress: "0xabc",
          level: 3,
          strategyMode: "稳健赚钱",
          autonomyLevel: "低风险自动",
          targetPreference: "赚钱",
          personality: {
            loyalty: 75,
            resentment: 20,
            ambition: 63,
            heat: 48,
          },
          budget: {
            spendableBudget: 400,
            singleTxLimit: 80,
            dailyLimit: 200,
          },
          claimableBalance: 90,
          recentStories: [
            {
              id: "story-1",
              title: "Glint 刚完成一次赚钱",
              detail: "public route override",
              tag: "赚钱",
              tone: "cyan",
            },
          ],
          recommendations: ["先稳住收益池"],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    },
  });

  const view = await loader.loadPetView("starter-pet");

  assert.equal(view.source.mode, "public");
  assert.equal(view.pet.name, "Glint");
  assert.equal(view.pet.personality.loyalty, 75);
  assert.equal(view.relatedStories[0]?.title, "Glint 刚完成一次赚钱");
});

test("loadPlayerView keeps fallback content when live data is missing", async () => {
  const loader = createWorldLoader({
    baseUrl: "http://localhost:3001",
    fetch: async () => new Response("", { status: 404 }),
  });

  const view = await loader.loadPlayerView("0x881c6722397bf536edc1b766b10386aab62e4fa9");

  assert.equal(view.source.mode, "fallback");
  assert.equal(view.player.walletAddress, "0x881c6722397bf536edc1b766b10386aab62e4fa9");
  assert.ok(view.player.pets.length > 0);
  assert.ok(view.relatedStories.length > 0);
});
