export interface DiscordEmoji {
  id?: string;
  name?: string;
  animated?: boolean;
}

export interface RoleButton {
  customId: string;
  roleId: string;
  emoji: DiscordEmoji;
  label: string;
}

export interface RoleMenu {
  guildId: string;
  channelId: string;
  buttons: RoleButton[];
}

export interface Env {
  ROLE_MENUS: KVNamespace;
  DISCORD_TOKEN: string;
  DISCORD_PUBLIC_KEY: string;
  DISCORD_APPLICATION_ID: string;
}
