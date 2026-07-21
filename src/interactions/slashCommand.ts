import type { Env } from "../types";
import { getSubcommand, type ApplicationCommandInteraction } from "../discord/interactionTypes";
import { hasManageRoles } from "../permissions";
import { handleAdd, handleCreate, handleDelete, handleList, handleRemove } from "../commands/rolemenu";

const EPHEMERAL = 64;

export async function dispatchApplicationCommand(env: Env, interaction: ApplicationCommandInteraction) {
  if (interaction.data.name !== "rolemenu") {
    return { type: 4, data: { content: "Unknown command.", flags: EPHEMERAL } };
  }

  if (!hasManageRoles(interaction.member.permissions)) {
    return { type: 4, data: { content: "You need the Manage Roles permission to use this command.", flags: EPHEMERAL } };
  }

  const subcommand = getSubcommand(interaction.data.options);
  if (!subcommand) {
    return { type: 4, data: { content: "Missing subcommand.", flags: EPHEMERAL } };
  }

  switch (subcommand.name) {
    case "create":
      return handleCreate(env, interaction, subcommand.options ?? []);
    case "add":
      return handleAdd(env, interaction, subcommand.options ?? []);
    case "remove":
      return handleRemove(env, interaction, subcommand.options ?? []);
    case "delete":
      return handleDelete(env, interaction, subcommand.options ?? []);
    case "list":
      return handleList(env, interaction, subcommand.options ?? []);
    default:
      return { type: 4, data: { content: "Unknown subcommand.", flags: EPHEMERAL } };
  }
}
