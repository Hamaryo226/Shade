import { getBotTopRolePosition, createChannelMessage, editChannelMessage, DiscordApiError } from "../discord/api";
import { buildActionRows, buildCustomId, parseEmojiInput, MAX_BUTTONS_PER_MENU } from "../discord/components";
import { canManageRole } from "../permissions";
import { getMenu, putMenu, deleteMenu, listMenus } from "../kv";
import type { Env, RoleMenu } from "../types";
import { findOption, type ApplicationCommandInteraction, type CommandOption } from "../discord/interactionTypes";

const EPHEMERAL = 64;

function reply(content: string) {
  return { type: 4, data: { content, flags: EPHEMERAL } };
}

function optionValue(options: CommandOption[] | undefined, name: string): string | undefined {
  return findOption(options, name)?.value;
}

export async function handleCreate(env: Env, interaction: ApplicationCommandInteraction, options: CommandOption[]) {
  const title = optionValue(options, "title")!;
  const description = optionValue(options, "description")!;
  const channelId = optionValue(options, "channel") ?? interaction.channel_id;

  let message: { id: string };
  try {
    message = await createChannelMessage(env, channelId, {
      embeds: [{ title, description }],
      components: [],
    });
  } catch (error) {
    if (error instanceof DiscordApiError) {
      return reply(`Failed to create the menu message: ${error.message}`);
    }
    throw error;
  }

  const menu: RoleMenu = { guildId: interaction.guild_id, channelId, buttons: [] };
  await putMenu(env, message.id, menu);

  return reply(
    `Role menu created in <#${channelId}> (message ID \`${message.id}\`). Use \`/rolemenu add message_id:${message.id} ...\` to bind roles.`,
  );
}

export async function handleAdd(env: Env, interaction: ApplicationCommandInteraction, options: CommandOption[]) {
  const messageId = optionValue(options, "message_id")!;
  const emojiInput = optionValue(options, "emoji")!;
  const roleId = optionValue(options, "role")!;
  const role = interaction.data.resolved?.roles?.[roleId];

  const menu = await getMenu(env, messageId);
  if (!menu) return reply(`No role menu is registered for message ID \`${messageId}\`.`);
  if (!role) return reply("Could not resolve the selected role.");
  if (role.managed) return reply(`\`${role.name}\` is managed by an integration and can't be assigned manually.`);
  if (menu.buttons.some((button) => button.roleId === roleId)) {
    return reply(`\`${role.name}\` is already bound on this menu.`);
  }
  if (menu.buttons.length >= MAX_BUTTONS_PER_MENU) {
    return reply(`This menu already has the maximum of ${MAX_BUTTONS_PER_MENU} buttons.`);
  }

  const botTopPosition = await getBotTopRolePosition(env, interaction.guild_id);
  if (!canManageRole(botTopPosition, role.position)) {
    return reply(
      `I can't manage \`${role.name}\` because it's positioned at or above my highest role. Move my bot role above it in Server Settings → Roles.`,
    );
  }

  const button = {
    customId: buildCustomId(roleId),
    roleId,
    emoji: parseEmojiInput(emojiInput),
    label: role.name,
  };
  menu.buttons.push(button);

  try {
    await editChannelMessage(env, menu.channelId, messageId, { components: buildActionRows(menu.buttons) });
  } catch (error) {
    if (error instanceof DiscordApiError) {
      return reply(`Failed to update the menu message: ${error.message}`);
    }
    throw error;
  }
  await putMenu(env, messageId, menu);

  return reply(`Bound \`${role.name}\` to this menu.`);
}

export async function handleRemove(env: Env, _interaction: ApplicationCommandInteraction, options: CommandOption[]) {
  const messageId = optionValue(options, "message_id")!;
  const roleId = optionValue(options, "role")!;

  const menu = await getMenu(env, messageId);
  if (!menu) return reply(`No role menu is registered for message ID \`${messageId}\`.`);

  const remaining = menu.buttons.filter((button) => button.roleId !== roleId);
  if (remaining.length === menu.buttons.length) {
    return reply(`That role isn't bound on this menu.`);
  }
  menu.buttons = remaining;

  try {
    await editChannelMessage(env, menu.channelId, messageId, { components: buildActionRows(menu.buttons) });
  } catch (error) {
    if (error instanceof DiscordApiError) {
      return reply(`Failed to update the menu message: ${error.message}`);
    }
    throw error;
  }
  await putMenu(env, messageId, menu);

  return reply(`Removed the binding from this menu.`);
}

export async function handleDelete(env: Env, _interaction: ApplicationCommandInteraction, options: CommandOption[]) {
  const messageId = optionValue(options, "message_id")!;
  const menu = await getMenu(env, messageId);
  if (!menu) return reply(`No role menu is registered for message ID \`${messageId}\`.`);
  await deleteMenu(env, messageId);
  return reply(`Deleted the registration for menu \`${messageId}\` (the Discord message itself was left untouched).`);
}

export async function handleList(env: Env, _interaction: ApplicationCommandInteraction, options: CommandOption[]) {
  const messageId = optionValue(options, "message_id");

  if (messageId) {
    const menu = await getMenu(env, messageId);
    if (!menu) return reply(`No role menu is registered for message ID \`${messageId}\`.`);
    const lines = menu.buttons.map((button) => `• <@&${button.roleId}> (\`${button.customId}\`)`);
    return reply(`Menu \`${messageId}\`:\n${lines.length ? lines.join("\n") : "(no bindings yet)"}`);
  }

  const menus = await listMenus(env);
  if (menus.length === 0) return reply("No role menus registered yet.");
  const lines = menus.map(({ messageId: id, menu }) => `• \`${id}\` — ${menu.buttons.length} binding(s)`);
  return reply(`Registered role menus:\n${lines.join("\n")}`);
}
