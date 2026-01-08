import { Client, Events } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { logger } from './logger';

export class EventLoader {
  public async loadEvents(client: Client) {
    const eventsPath = join(__dirname, '../events');
    const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

    for (const file of eventFiles) {
      try {
        const event = require(join(eventsPath, file)).default;
        
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args));
        } else {
          client.on(event.name, (...args) => event.execute(...args));
        }

        logger.info(`Loaded event: ${event.name}`, 'EVENT-LOADER');
      } catch (error) {
        logger.error(`Failed to load event ${file}: ${error}`, 'EVENT-LOADER');
      }
    }

    logger.colorfulBox('EVENTS LOADED', [
      `Total Events: ${eventFiles.length}`,
      `Client Ready: ${client.isReady()}`,
      `Bot Tag: ${client.user?.tag || 'Not logged in'}`
    ]);
  }
}

export const eventLoader = new EventLoader();
