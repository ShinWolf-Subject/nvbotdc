import { 
  SlashCommandBuilder, 
  SlashCommandSubcommandsOnlyBuilder,
  ChatInputCommandInteraction,
  PermissionResolvable,
  AutocompleteInteraction
} from 'discord.js';

export interface Command {
  data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void> | void;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void> | void;
  cooldown?: number;
  permissions?: PermissionResolvable[];
}

export interface Event {
  name: string;
  once?: boolean;
  execute: (...args: any[]) => Promise<void> | void;
}

export interface Config {
  token: string;
  clientId: string;
  guildId: string;
  mongoUri: string;
  logLevel: string;
  defaultPrefix: string;
}
