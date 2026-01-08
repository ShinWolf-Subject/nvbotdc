import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { config } from './config';
import { logger } from './utils/logger';
import { eventLoader } from './utils/eventLoader';
import { commandLoader } from './utils/commandLoader';

class DiscordBot extends Client {
  public commands: Collection<string, any>;
  
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration
      ]
    });
    
    this.commands = commandLoader.getCommands();
  }
  
  public async start() {
    try {
      logger.info('Starting bot...', 'BOT');
      
      // Load events
      await eventLoader.loadEvents(this);
      
      // Login to Discord
      await this.login(config.token);
      
      // Deploy commands (optional)
      await this.deployCommands();
      
    } catch (error) {
      logger.error(`Failed to start bot: ${error}`, 'BOT');
      process.exit(1);
    }
  }
  
  private async deployCommands() {
    if (!this.application) return;
    
    try {
      const commands = Array.from(this.commands.values()).map(cmd => cmd.data.toJSON());
      await this.application.commands.set(commands);
      logger.info(`Deployed ${commands.length} commands globally`, 'COMMAND-DEPLOY');
    } catch (error) {
      logger.error(`Failed to deploy commands: ${error}`, 'COMMAND-DEPLOY');
    }
  }
}

// Start the bot
const bot = new DiscordBot();
bot.start();

// Handle process events
process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled Promise Rejection: ${error}`, 'PROCESS');
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error}`, 'PROCESS');
  process.exit(1);
});
