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
    
    const start = Date.now();
    const reply = await interaction.deferReply({ ephemeral: hidden });
    const end = Date.now();
    
    const apiLatency = end - start;
    const wsLatency = interaction.client.ws.ping;
    
    // Check external API latency
    const apiStart = Date.now();
    try {
      await axios.get('https://api.github.com');
    } catch (error) {
      // Ignore error, just for timing
    }
    const apiEnd = Date.now();
    const externalApiLatency = apiEnd - apiStart;
    
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🏓 Pong!')
      .setDescription('Bot latency statistics')
      .addFields(
        { name: '🤖 Bot Latency', value: `${apiLatency}ms`, inline: true },
        { name: '🌐 WebSocket', value: `${wsLatency}ms`, inline: true },
        { name: '🔗 API Latency', value: `${externalApiLatency}ms`, inline: true }
      )
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  }
} as Command;
