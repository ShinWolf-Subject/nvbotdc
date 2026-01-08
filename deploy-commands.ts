import { REST, Routes } from 'discord.js';
import { config } from './src/config';
import { commandLoader } from './src/utils/commandLoader';
import { logger } from './src/utils/logger';

async function deployCommands() {
  const commands = Array.from(commandLoader.getCommands().values()).map(cmd => cmd.data.toJSON());
  
  const rest = new REST({ version: '10' }).setToken(config.token);
  
  try {
    logger.info(`Started refreshing ${commands.length} application (/) commands.`, 'DEPLOY');
    
    const data: any = await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands }
    );
    
    logger.info(`Successfully reloaded ${data.length} application (/) commands.`, 'DEPLOY');
  } catch (error) {
    logger.error(`Failed to deploy commands: ${error}`, 'DEPLOY');
  }
}

deployCommands();
