import { describe, expect, it } from "vitest";
import { buildActionRows, buildCustomId, parseCustomId, parseEmojiInput } from "../src/discord/components";
import type { RoleButton } from "../src/types";

describe("custom_id encode/decode", () => {
  it("round-trips a role ID through buildCustomId/parseCustomId", () => {
    const customId = buildCustomId("123456789012345678");
    expect(parseCustomId(customId)).toBe("123456789012345678");
  });

  it("returns null for custom IDs not owned by this bot", () => {
    expect(parseCustomId("something-else:123")).toBeNull();
  });

  it("returns null for an empty role ID", () => {
    expect(parseCustomId("rolemenu:")).toBeNull();
  });
});

describe("parseEmojiInput", () => {
  it("treats plain text as a unicode emoji name", () => {
    expect(parseEmojiInput("🎮")).toEqual({ name: "🎮" });
  });

  it("parses a static custom emoji", () => {
    expect(parseEmojiInput("<:pepe:123456789012345678>")).toEqual({
      id: "123456789012345678",
      name: "pepe",
      animated: false,
    });
  });

  it("parses an animated custom emoji", () => {
    expect(parseEmojiInput("<a:party:987654321098765432>")).toEqual({
      id: "987654321098765432",
      name: "party",
      animated: true,
    });
  });
});

describe("buildActionRows", () => {
  function makeButton(i: number): RoleButton {
    return { customId: `rolemenu:${i}`, roleId: String(i), emoji: { name: "🎮" }, label: `Role ${i}` };
  }

  it("packs up to 5 buttons per row", () => {
    const rows = buildActionRows([makeButton(1), makeButton(2)]);
    expect(rows).toHaveLength(1);
    expect(rows[0].components).toHaveLength(2);
  });

  it("splits more than 5 buttons across multiple rows", () => {
    const buttons = Array.from({ length: 7 }, (_, i) => makeButton(i));
    const rows = buildActionRows(buttons);
    expect(rows).toHaveLength(2);
    expect(rows[0].components).toHaveLength(5);
    expect(rows[1].components).toHaveLength(2);
  });

  it("returns no rows for an empty button list", () => {
    expect(buildActionRows([])).toHaveLength(0);
  });
});
