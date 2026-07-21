import type { Env } from "../types";
import type { MessageComponentInteraction } from "../discord/interactionTypes";
import { parseCustomId } from "../discord/components";
import { addRoleToMember, removeRoleFromMember, createFollowupMessage, DiscordApiError } from "../discord/api";

const EPHEMERAL = 64;
const DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE = 5;

export interface ButtonClickResult {
  response: unknown;
  background: Promise<void>;
}

export function dispatchMessageComponent(env: Env, interaction: MessageComponentInteraction): ButtonClickResult {
  const roleId = parseCustomId(interaction.data.custom_id);

  if (!roleId) {
    return {
      response: { type: 4, data: { content: "This button is not recognized.", flags: EPHEMERAL } },
      background: Promise.resolve(),
    };
  }

  const alreadyHasRole = interaction.member.roles.includes(roleId);
  const background = toggleRole(env, interaction, roleId, alreadyHasRole);

  return {
    response: { type: DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE, data: { flags: EPHEMERAL } },
    background,
  };
}

async function toggleRole(
  env: Env,
  interaction: MessageComponentInteraction,
  roleId: string,
  alreadyHasRole: boolean,
): Promise<void> {
  const userId = interaction.member.user.id;
  try {
    if (alreadyHasRole) {
      await removeRoleFromMember(env, interaction.guild_id, userId, roleId);
      await createFollowupMessage(env, interaction.token, { content: `Removed <@&${roleId}>.`, flags: EPHEMERAL });
    } else {
      await addRoleToMember(env, interaction.guild_id, userId, roleId);
      await createFollowupMessage(env, interaction.token, { content: `Granted <@&${roleId}>.`, flags: EPHEMERAL });
    }
  } catch (error) {
    const message =
      error instanceof DiscordApiError
        ? `Couldn't update your role (Discord returned ${error.status}). The bot's role may no longer outrank this role.`
        : "Couldn't update your role due to an unexpected error.";
    await createFollowupMessage(env, interaction.token, { content: message, flags: EPHEMERAL });
  }
}
