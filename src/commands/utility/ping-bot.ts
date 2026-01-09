import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder
} from 'discord.js';
import { Command } from '../../types';
import axios from 'axios';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Cek latensi bot dan API')
    .addBooleanOption(option =>
      option.setName('hidden')
      .setDescription('Sembunyikan balasan ini')
      .setRequired(false)
    ),
  cooldown: 5,
  async execute(interaction: ChatInputCommandInteraction) {
    const hidden = interaction.options.getBoolean('hidden') || false;
    
    const start = Date.now();
    await interaction.deferReply({ ephemeral: hidden });
    const botLatency = Date.now() - start;

    const wsLatency = interaction.client.ws.ping;
    
    let apiLatencyFromData = 'N/A';
    let apiUptimeFromData = 'N/A';
    
    try {
      const response = await axios.get('https://nvlabs.my.id/health');
      apiLatencyFromData = response.data.latency;
      apiUptimeFromData = response.data.uptime;
    } catch (error) {
      console.error('Gagal mengambil data API:', error);
      apiLatencyFromData = 'Error';
      apiUptimeFromData = 'Error';
    }
    
    const botUptime = Math.floor(process.uptime());
    
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🏓 Pong!')
      .setDescription('Statistik latensi sistem saat ini')
      .addFields(
        {
          name: 'Bot Latency',
          value: `\`${botLatency}ms\``,
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
          name: 'API Latency',
          value: `\`${apiLatencyFromData}\`ms`,
          inline: true
        },
        {
          name: 'API Uptime',
          value: `\`${apiUptimeFromData}\``,
          inline: true
        }
      )
      .setFooter({ text: `Diminta oleh ${interaction.user.tag}`, iconURL: 'https://nvlabs.my.id/files/my.png' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  }
} as Command;

