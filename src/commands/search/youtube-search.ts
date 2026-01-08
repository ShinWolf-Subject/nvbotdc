// src/commands/search/yts.ts (Fixed)
import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js';
import axios from 'axios';
import { Command } from '../../types';
import { logger } from '../../utils/logger';

interface YouTubeVideo {
  title: string;
  channel: string;
  duration: string;
  views: string | number; // Bisa string atau number
  uploaded: string;
  imageUrl: string;
  url: string;
  videoId: string;
  timestamp: string;
  description: string;
}

export default {
  data: new SlashCommandBuilder()
    .setName('yts')
    .setDescription('Search YouTube videos')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('What to search on YouTube')
        .setRequired(true)
        .setMaxLength(100)
    ),
    cooldown: 5,
  
  async execute(interaction: ChatInputCommandInteraction) {
    const query = interaction.options.getString('query', true);
    const limit = interaction.options.getInteger('limit') || 5;
    const hidden = interaction.options.getBoolean('hidden') || false;
    
    await interaction.deferReply({ ephemeral: hidden });
    
    try {
      logger.info(`YouTube search: "${query}"`, 'YTS');
      
      // Encode query
      const encodedQuery = encodeURIComponent(query);
      const apiUrl = `https://nvlabs.my.id/nv/search/yt?q=${encodedQuery}`;
      
      // Fetch data dari API
      const response = await axios.get(apiUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'DiscordBot/1.0.0'
        }
      });
      
      const apiData = response.data;
      
      if (!apiData.success || !apiData.results || apiData.results.length === 0) {
        await interaction.editReply({
          content: `❌ Tidak ditemukan hasil untuk **${query}**`
        });
        return;
      }
      
      // Ambil results sesuai limit
      const videos: YouTubeVideo[] = apiData.results.slice(0, Math.min(limit, apiData.results.length));
      
      // Kirim hasil pertama
      await this.sendSearchResults(interaction, videos, query, 0, hidden);
      
      logger.info(`YouTube search completed: "${query}" - ${videos.length} results`, 'YTS');
      
    } catch (error) {
      logger.error(`YouTube search error: ${error}`, 'YTS');
      
      await interaction.editReply({
        content: '❌ Gagal mencari video. Silakan coba lagi nanti.'
      });
    }
  },
  
  async sendSearchResults(
    interaction: ChatInputCommandInteraction, 
    videos: YouTubeVideo[], 
    query: string, 
    currentIndex: number = 0,
    hidden: boolean = false
  ) {
    const video = videos[currentIndex];
    
    // Buat embed untuk video
    const embed = this.createVideoEmbed(video, query, currentIndex + 1, videos.length);
    
    // Buat buttons untuk navigation
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('prev_video')
          .setLabel('◀️ Previous')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentIndex === 0),
        new ButtonBuilder()
          .setCustomId('next_video')
          .setLabel('Next ▶️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentIndex === videos.length - 1),
        new ButtonBuilder()
          .setLabel('🎥 Watch')
          .setStyle(ButtonStyle.Link)
          .setURL(video.url),
        new ButtonBuilder()
          .setCustomId('show_all')
          .setLabel('📋 All Results')
          .setStyle(ButtonStyle.Primary)
      );
    
    // Kirim atau edit message
    const messageContent = {
      embeds: [embed],
      components: videos.length > 1 ? [row] : [row]
    };
    
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(messageContent);
    } else {
      await interaction.reply({ ...messageContent, ephemeral: hidden });
    }
    
    // Setup button interactions jika ada multiple videos
    if (videos.length > 1) {
      const collector = interaction.channel?.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000, // 5 menit
        filter: i => i.user.id === interaction.user.id
      });
      
      collector?.on('collect', async (i) => {
        try {
          await i.deferUpdate();
          
          let newIndex = currentIndex;
          
          if (i.customId === 'prev_video') {
            newIndex = Math.max(0, currentIndex - 1);
          } else if (i.customId === 'next_video') {
            newIndex = Math.min(videos.length - 1, currentIndex + 1);
          } else if (i.customId === 'show_all') {
            await this.showAllResults(i, videos, query);
            return;
          }
          
          if (newIndex !== currentIndex) {
            const newEmbed = this.createVideoEmbed(videos[newIndex], query, newIndex + 1, videos.length);
            
            // Update buttons state
            const newRow = new ActionRowBuilder<ButtonBuilder>()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId('prev_video')
                  .setLabel('◀️ Previous')
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(newIndex === 0),
                new ButtonBuilder()
                  .setCustomId('next_video')
                  .setLabel('Next ▶️')
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(newIndex === videos.length - 1),
                new ButtonBuilder()
                  .setLabel('🎥 Watch')
                  .setStyle(ButtonStyle.Link)
                  .setURL(videos[newIndex].url),
                new ButtonBuilder()
                  .setCustomId('show_all')
                  .setLabel('📋 All Results')
                  .setStyle(ButtonStyle.Primary)
              );
            
            await i.editReply({
              embeds: [newEmbed],
              components: [newRow]
            });
          }
          
        } catch (error) {
          logger.error(`Button interaction error: ${error}`, 'YTS-INTERACTION');
        }
      });
      
      // Cleanup collector
      collector?.on('end', () => {
        interaction.editReply({ components: [] }).catch(() => {});
      });
    }
  },
  
  createVideoEmbed(video: YouTubeVideo, query: string, position: number, total: number): EmbedBuilder {
    // Format views dengan aman
    const views = this.formatViews(video.views);
    
    const embed = new EmbedBuilder()
      .setColor(0xff0000) // YouTube red
      .setTitle(video.title)
      .setURL(video.url)
      .setAuthor({
        name: video.channel,
        iconURL: 'https://cdn.discordapp.com/emojis/847471806018322473.png' // YouTube icon
      })
      .setDescription(this.truncateDescription(video.description))
      .addFields(
        { name: '⏱️ Duration', value: video.duration, inline: true },
        { name: '👁️ Views', value: views, inline: true },
        { name: '📅 Uploaded', value: video.uploaded, inline: true }
      )
      .setImage(video.imageUrl)
      .setFooter({ 
        text: `Result ${position}/${total} • Search: "${query}"`,
        iconURL: 'https://nvlabs.my.id/files/my.png' // Icon yang Anda berikan
      })
      .setTimestamp();
    
    return embed;
  },
  
  async showAllResults(interaction: any, videos: YouTubeVideo[], query: string) {
    try {
      let resultText = `**📋 All Results for "${query}"**\n\n`;
      
      videos.forEach((video, index) => {
        const views = this.formatViews(video.views);
        resultText += `**${index + 1}. ${video.title}**\n`;
        resultText += `👤 ${video.channel} | ⏱️ ${video.duration} | 👁️ ${views} | 📅 ${video.uploaded}\n`;
        resultText += `🔗 ${video.url}\n\n`;
      });
      
      // Tambahkan total
      resultText += `*Total: ${videos.length} results*`;
      
      // Kirim sebagai follow-up
      await interaction.followUp({
        content: resultText,
        ephemeral: true
      });
      
    } catch (error) {
      logger.error(`Show all results error: ${error}`, 'YTS-ALL');
      await interaction.followUp({
        content: '❌ Gagal menampilkan semua hasil.',
        ephemeral: true
      });
    }
  },
  
  // FIXED: Handle string atau number untuk views
  formatViews(views: string | number): string {
    try {
      let viewNum: number;
      
      if (typeof views === 'number') {
        viewNum = views;
      } else if (typeof views === 'string') {
        // Remove commas and convert to number
        viewNum = parseInt(views.replace(/,/g, '')) || 0;
      } else {
        return 'N/A';
      }
      
      if (viewNum >= 1000000) {
        return `${(viewNum / 1000000).toFixed(1)}M`;
      } else if (viewNum >= 1000) {
        return `${(viewNum / 1000).toFixed(1)}K`;
      }
      
      return viewNum.toString();
    } catch (error) {
      return 'N/A';
    }
  },
  
  truncateDescription(description: string, maxLength: number = 200): string {
    if (!description || description.length <= maxLength) return description || 'No description';
    
    // Cari titik potong yang baik
    let truncated = description.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.7) {
      truncated = truncated.substring(0, lastSpace);
    }
    
    return `${truncated}...`;
  }
} as Command;
