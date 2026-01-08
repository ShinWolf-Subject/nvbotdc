import { Collection } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { Command } from '../types';
import { logger } from './logger';

export class CommandLoader {
  private commands: Collection<string, Command> = new Collection();
  private cooldowns: Collection<string, Collection<string, number>> = new Collection();

  constructor() {
    this.loadCommands();
  }

  private async loadCommands() {
    const commandsPath = join(__dirname, '../commands');
    const categories = readdirSync(commandsPath);

    for (const category of categories) {
      const categoryPath = join(commandsPath, category);
      const commandFiles = readdirSync(categoryPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

      for (const file of commandFiles) {
        try {
          const command: Command = require(join(categoryPath, file)).default;
          if ('data' in command && 'execute' in command) {
            this.commands.set(command.data.name, command);
            logger.info(`Loaded command: ${command.data.name}`, 'COMMAND-LOADER');
          } else {
            logger.warn(`Command ${file} is missing required properties`, 'COMMAND-LOADER');
          }
        } catch (error) {
          logger.error(`Failed to load command ${file}: ${error}`, 'COMMAND-LOADER');
        }
      }
    }

    logger.colorfulBox('COMMANDS LOADED', [
      `Total Commands: ${this.commands.size}`,
      `Categories: ${categories.join(', ')}`,
      `Ready to serve! 🚀`
    ]);
  }

  public getCommands() {
    return this.commands;
  }

  public getCommand(name: string) {
    return this.commands.get(name);
  }

  public addCooldown(userId: string, commandName: string, cooldown: number) {
    if (!this.cooldowns.has(commandName)) {
      this.cooldowns.set(commandName, new Collection());
    }

    const now = Date.now();
    const timestamps = this.cooldowns.get(commandName)!;
    timestamps.set(userId, now);

    setTimeout(() => timestamps.delete(userId), cooldown * 1000);
  }

  public getCooldown(userId: string, commandName: string) {
    const command = this.commands.get(commandName);
    if (!command?.cooldown) return 0;

    const timestamps = this.cooldowns.get(commandName);
    if (!timestamps || !timestamps.has(userId)) return 0;

    const expirationTime = timestamps.get(userId)! + command.cooldown * 1000;
    const timeLeft = (expirationTime - Date.now()) / 1000;
    
    return Math.max(0, Math.ceil(timeLeft));
  }
}

export const commandLoader = new CommandLoader();
