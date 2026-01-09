import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../types';
import axios from 'axios';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency')
    .addBooleanOption(option =>
      option.setName('hidden')
      .setDescription('Make the response hidden')
      .setRequired(false)
    ),
  cooldown: 5,
  async execute(interaction: ChatInputCommandInteraction) {
    const hidden = interaction.options.getBoolean('hidden') || false;
    
    // 1. Measure Discord Interaction Latency
    const start = Date.now();
    await interaction.deferReply({ ephemeral: hidden });
    const apiLatency = Date.now() - start;

    const wsLatency = interaction.client.ws.ping;
    
    // 2. Measure External API Latency & Get Data in one go
    let externalApiLatency = 0;
    let externalUptime = 'N/A';
    
    try {
      const apiStart = Date.now();
      const response = await axios.get('https://nvlabs.my.id/health');
      externalApiLatency = Date.now() - apiStart;
      externalUptime = response.data.uptime || 'Unknown';
    } catch (error) {
      externalApiLatency = -1; // Indicates error
    }
    
    // 3. Format Bot Uptime (process.uptime is in seconds)
    const botUptime = Math.floor(process.uptime());
    
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🏓 Pong!')
      .setDescription('Bot latency statistics')
      .addFields(
        {
          name: 'Bot Latency',
          value: `\`${apiLatency}ms\``,
          inline: true
        },
        {
          name: 'WebSocket',
          value: `\`${wsLatency}ms\``,
          inline: true
        },
        {
          name: 'Bot Uptime',
          value: `\`${botUptime}s\``,
          inline: true
        },
        {
          name: 'External API',
          value: `\`${externalApiLatency === -1 ? 'Down' : externalApiLatency + 'ms'}\``,
          inline: true
        },
        {
          name: 'API Uptime',
          value: `\`${externalUptime}\``,
          inline: true
        }
      )
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  }
} as Command;

