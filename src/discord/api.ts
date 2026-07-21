import type { Env } from "../types";

const API_BASE = "https://discord.com/api/v10";

export class DiscordApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`Discord API error ${status}: ${body}`);
  }
}

async function discordRequest(env: Env, path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${env.DISCORD_TOKEN}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new DiscordApiError(response.status, body);
  }
  return response;
}

export interface DiscordRole {
  id: string;
  name: string;
  position: number;
  managed: boolean;
}

export async function getGuildRoles(env: Env, guildId: string): Promise<DiscordRole[]> {
  const response = await discordRequest(env, `/guilds/${guildId}/roles`);
  return response.json();
}

/** Returns the bot's own highest role position in the given guild. */
export async function getBotTopRolePosition(env: Env, guildId: string): Promise<number> {
  const [member, roles] = await Promise.all([
    discordRequest(env, `/guilds/${guildId}/members/${env.DISCORD_APPLICATION_ID}`).then((r) => r.json()) as Promise<{
      roles: string[];
    }>,
    getGuildRoles(env, guildId),
  ]);
  const roleById = new Map(roles.map((role) => [role.id, role]));
  // @everyone is always present implicitly at position 0 even though it's not in member.roles.
  let topPosition = 0;
  for (const roleId of member.roles) {
    const role = roleById.get(roleId);
    if (role && role.position > topPosition) topPosition = role.position;
  }
  return topPosition;
}

export async function addRoleToMember(env: Env, guildId: string, userId: string, roleId: string): Promise<void> {
  await discordRequest(env, `/guilds/${guildId}/members/${userId}/roles/${roleId}`, { method: "PUT" });
}

export async function removeRoleFromMember(env: Env, guildId: string, userId: string, roleId: string): Promise<void> {
  await discordRequest(env, `/guilds/${guildId}/members/${userId}/roles/${roleId}`, { method: "DELETE" });
}

export async function createChannelMessage(
  env: Env,
  channelId: string,
  body: { embeds?: unknown[]; components?: unknown[] },
): Promise<{ id: string }> {
  const response = await discordRequest(env, `/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return response.json();
}

export async function editChannelMessage(
  env: Env,
  channelId: string,
  messageId: string,
  body: { components: unknown[] },
): Promise<void> {
  await discordRequest(env, `/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function createFollowupMessage(
  env: Env,
  interactionToken: string,
  body: { content: string; flags?: number },
): Promise<void> {
  await fetch(`${API_BASE}/webhooks/${env.DISCORD_APPLICATION_ID}/${interactionToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
