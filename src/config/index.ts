import dotenv from 'dotenv';
dotenv.config();

export const config = {
  token: process.env.DISCORD_TOKEN || '',
  clientId: process.env.DISCORD_CLIENT_ID || '',
  guildId: process.env.DISCORD_GUILD_ID || '',
  mongoUri: process.env.MONGO_URI || '',
  logLevel: process.env.LOG_LEVEL || 'info',
  defaultPrefix: process.env.DEFAULT_PREFIX || '!'
} as const;
