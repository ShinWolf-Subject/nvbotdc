// src/commands/random/aqc.ts (Simple Version)
import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder
} from 'discord.js';
import axios from 'axios';
import { Command } from '../../types';
import { logger } from '../../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('anime-quote')
    .setDescription('Get random anime quotes')
    .addIntegerOption(option =>
      option.setName('count')
        .setDescription('Number of quotes (1-5)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(5)
    ),
  cooldown: 3,
  async execute(interaction: ChatInputCommandInteraction) {
    const count = interaction.options.getInteger('count') || 1;
    
    await interaction.deferReply();
    
    try {
      // Fetch dari API
      const response = await axios.get('https://nvlabs.my.id/nv/anime/randomquotes2');
      const quotes = response.data.data?.quotes || [];
      
      if (quotes.length === 0) {
        await interaction.editReply({
          content: '❌ Tidak ada quotes tersedia.'
        });
        return;
      }
      
      // Ambil quotes sesuai jumlah yang diminta
      const selectedQuotes = [];
      for (let i = 0; i < Math.min(count, 5); i++) {
        const randomIndex = Math.floor(Math.random() * quotes.length);
        selectedQuotes.push(quotes[randomIndex]);
      }
      
      // Buat embed
      const embed = new EmbedBuilder()
        .setColor(0xff6bc9)
        .setTitle(`🌸 ${selectedQuotes.length} Random Anime Quotes`)
        .setDescription('Berikut adalah beberapa quotes anime acak untukmu:')
        .setFooter({ text: 'Powered by NvLabs' })
        .setTimestamp();
      
      // Tambahkan setiap quote sebagai field
      selectedQuotes.forEach((quote, index) => {
        embed.addFields({
          name: `#${index + 1} - ${quote.character} (${quote.anime})`,
          value: `"${quote.quote}"${quote.episode ? `\n📺 Episode: ${quote.episode}` : ''}`,
          inline: false
        });
      });
      
      await interaction.editReply({ embeds: [embed] });
      
      logger.info(`Sent ${selectedQuotes.length} anime quotes`, 'AQC-SIMPLE');
      
    } catch (error) {
      logger.error(`Error: ${error}`, 'AQC-SIMPLE');
      
      await interaction.editReply({
        content: '❌ Gagal mengambil quotes. Silakan coba lagi.'
      });
    }
  }
} as Command;
