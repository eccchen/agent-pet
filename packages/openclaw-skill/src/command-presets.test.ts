import assert from "node:assert/strict";
import test from "node:test";

import {
  OPENCLAW_COMMAND_PRESETS,
  listOpenClawCommandPhrases,
  normalizeOpenClawCommand,
} from "./command-presets.js";

test("normalizeOpenClawCommand resolves canonical command ids and aliases", () => {
  assert.equal(normalizeOpenClawCommand("earn"), "earn");
  assert.equal(normalizeOpenClawCommand("赚钱"), "earn");
  assert.equal(normalizeOpenClawCommand("去赚钱"), "earn");
  assert.equal(normalizeOpenClawCommand("怼他"), "taunt");
  assert.equal(normalizeOpenClawCommand("结盟"), "ally");
  assert.equal(normalizeOpenClawCommand("复仇"), "revenge");
  assert.equal(normalizeOpenClawCommand("苟住"), "stay_low");
  assert.equal(normalizeOpenClawCommand("unknown"), null);
});

test("listOpenClawCommandPhrases exposes stable user-facing phrases", () => {
  const phrases = listOpenClawCommandPhrases();

  assert.deepEqual(
    phrases.map((item) => item.commandType),
    ["earn", "taunt", "ally", "revenge", "stay_low"],
  );
  assert.equal(phrases[0]?.examples.includes("赚钱"), true);
  assert.equal(phrases[1]?.examples.includes("怼他"), true);
  assert.equal(phrases[4]?.examples.includes("苟住"), true);
});

test("OPENCLAW_COMMAND_PRESETS keeps examples aligned with aliases", () => {
  for (const preset of OPENCLAW_COMMAND_PRESETS) {
    for (const example of preset.examples) {
      assert.equal(
        normalizeOpenClawCommand(example),
        preset.commandType,
        `example ${example} should resolve to ${preset.commandType}`,
      );
    }
  }
});

