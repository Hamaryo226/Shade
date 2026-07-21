import type { DiscordEmoji, RoleButton } from "../types";

const CUSTOM_ID_PREFIX = "rolemenu:";

export const MAX_BUTTONS_PER_MENU = 25; // Discord limit: 5 action rows x 5 buttons
const BUTTONS_PER_ROW = 5;

export function buildCustomId(roleId: string): string {
  return `${CUSTOM_ID_PREFIX}${roleId}`;
}

export function parseCustomId(customId: string): string | null {
  if (!customId.startsWith(CUSTOM_ID_PREFIX)) return null;
  const roleId = customId.slice(CUSTOM_ID_PREFIX.length);
  return roleId.length > 0 ? roleId : null;
}

const CUSTOM_EMOJI_RE = /^<(a)?:(\w+):(\d+)>$/;

/** Accepts either a unicode emoji ("🎮") or Discord's custom emoji markup (<:name:id> / <a:name:id>). */
export function parseEmojiInput(input: string): DiscordEmoji {
  const trimmed = input.trim();
  const match = CUSTOM_EMOJI_RE.exec(trimmed);
  if (match) {
    const [, animated, name, id] = match;
    return { id, name, animated: Boolean(animated) };
  }
  return { name: trimmed };
}

export function buildActionRows(buttons: RoleButton[]) {
  const rows = [];
  for (let i = 0; i < buttons.length; i += BUTTONS_PER_ROW) {
    const rowButtons = buttons.slice(i, i + BUTTONS_PER_ROW).map((button) => ({
      type: 2, // BUTTON
      style: 1, // PRIMARY
      label: button.label,
      emoji: button.emoji,
      custom_id: button.customId,
    }));
    rows.push({ type: 1, components: rowButtons }); // ACTION_ROW
  }
  return rows;
}
