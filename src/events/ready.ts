import { Events, ActivityType } from 'discord.js';
import { Event } from '../types';
import { logger } from '../utils/logger';

export default {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    logger.colorfulBox('BOT IS ONLINE', [
      `Logged in as: ${client.user?.tag}`,
      `ID: ${client.user?.id}`,
      `Servers: ${client.guilds.cache.size}`,
      `Users: ${client.users.cache.size}`,
      `Commands: ${client.application?.commands.cache.size || 0}`
    ]);

    // Set bot status
    client.user?.setPresence({
      activities: [{
        name: 'your commands',
        type: ActivityType.Listening
      }],
      status: 'online'
    });

    logger.event('READY', `Bot is ready in ${client.guilds.cache.size} servers`);
  }
} as Event;
