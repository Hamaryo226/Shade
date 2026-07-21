export interface CommandOption {
  name: string;
  type: number;
  value?: string;
  options?: CommandOption[];
}

export interface InteractionMember {
  user: { id: string };
  roles: string[];
  permissions: string;
}

export interface ApplicationCommandInteraction {
  type: 2;
  id: string;
  token: string;
  guild_id: string;
  channel_id: string;
  member: InteractionMember;
  data: {
    name: string;
    options?: CommandOption[];
    resolved?: {
      roles?: Record<string, { id: string; name: string; position: number; managed: boolean }>;
      channels?: Record<string, { id: string }>;
    };
  };
}

export interface MessageComponentInteraction {
  type: 3;
  id: string;
  token: string;
  guild_id: string;
  channel_id: string;
  member: InteractionMember;
  message: { id: string };
  data: { custom_id: string; component_type: number };
}

export function findOption(options: CommandOption[] | undefined, name: string): CommandOption | undefined {
  return options?.find((option) => option.name === name);
}

export function getSubcommand(options: CommandOption[] | undefined): CommandOption | undefined {
  return options?.find((option) => option.type === 1);
}
