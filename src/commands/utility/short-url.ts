import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} from 'discord.js';
import axios from 'axios';
import { Command } from '../../types';
import { logger } from '../../utils/logger';

interface ShortUrlResponse {
  success: boolean;
  data: {
    originalUrl: string;
    shortUrl: string;
    shortSlug: string;
    title?: string;
    description?: string;
    visits?: number;
    isActive?: boolean;
    createdAt: string;
    lastAccessed?: string;
  };
  links?: {
    delete: string;
    qrCode?: string;
  };
}

interface StatsResponse {
  success: boolean;
  data: {
    originalUrl: string;
    shortSlug: string;
    shortUrl: string;
    title: string;
    description: string;
    visits: number;
    isActive: boolean;
    createdAt: string;
    lastAccessed: string;
  };
}

export default {
  data: new SlashCommandBuilder()
    .setName('short-url')
    .setDescription('Shorten any URL using NvShortUrl')
    .addStringOption(option =>
      option.setName('url')
        .setDescription('Any URL to shorten (with http:// or https://)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('slug')
        .setDescription('Custom slug (optional, 3-30 chars)')
        .setRequired(false)
        .setMinLength(3)
        .setMaxLength(30)
    )
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Custom title (optional)')
        .setRequired(false)
        .setMaxLength(100)
    )
    .addStringOption(option =>
      option.setName('desc')
        .setDescription('Custom description (optional)')
        .setRequired(false)
        .setMaxLength(200)
    )
    .addBooleanOption(option =>
      option.setName('hidden')
        .setDescription('Only you can see the result')
        .setRequired(false)
    ),
  cooldown: 10,
  
  async execute(interaction: ChatInputCommandInteraction) {
    const url = interaction.options.getString('url', true);
    const slug = interaction.options.getString('slug');
    const title = interaction.options.getString('title');
    const desc = interaction.options.getString('desc');
    const hidden = interaction.options.getBoolean('hidden') || false;
    
    await interaction.deferReply({ ephemeral: hidden });
    
    try {
      logger.info(`Short-URL request from ${interaction.user.tag}`, 'SHORT-URL');
      
      // TERIMA SEMUA URL TANPA VALIDASI KETAT
      // Cukup pastikan ada protocol, jika tidak tambahkan https://
      const processedUrl = this.prepareUrl(url);
      
      if (!processedUrl) {
        await interaction.editReply({
          content: '❌ URL tidak valid. Contoh: `https://example.com` atau `http://localhost:3000`'
        });
        return;
      }
      
      // Build API URL - encode seluruh URL
      let apiUrl = `https://nsu.my.id/new?url=${encodeURIComponent(processedUrl)}`;
      
      // Tambahkan parameter opsional
      if (slug) {
        const cleanSlug = this.cleanSlug(slug);
        if (cleanSlug) apiUrl += `&slug=${cleanSlug}`;
      }
      
      if (title) apiUrl += `&title=${encodeURIComponent(title)}`;
      if (desc) apiUrl += `&desc=${encodeURIComponent(desc)}`;
      
      logger.info(`API call for URL: ${this.truncateForLog(processedUrl)}`, 'SHORT-URL');
      
      // Shorten URL
      const response = await axios.get(apiUrl, { 
        timeout: 15000,
        headers: {
          'User-Agent': 'DiscordBot/1.0.0 (NvShortUrl)'
        }
      });
      
      const apiData: ShortUrlResponse = response.data;
      
      if (!apiData.success || !apiData.data) {
        throw new Error(`API error: ${JSON.stringify(apiData)}`);
      }
      
      logger.info(`URL shortened: ${apiData.data.shortSlug}`, 'SHORT-URL');
      
      // Kirim hasil
      await this.sendResult(interaction, apiData, hidden);
      
    } catch (error: any) {
      logger.error(`Short-URL error: ${error.message}`, 'SHORT-URL');
      
      let errorMsg = '❌ Gagal memendekkan URL.';
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          if (error.response.data?.message?.includes('already exists')) {
            errorMsg = '❌ Slug sudah digunakan. Coba slug lain.';
          } else {
            errorMsg = '❌ URL tidak valid atau mengandung karakter terlarang.';
          }
        } else if (error.response?.data?.message) {
          errorMsg = `❌ ${error.response.data.message}`;
        }
      } else if (error.message?.includes('API error')) {
        errorMsg = '❌ API tidak merespons dengan benar.';
      }
      
      await interaction.editReply({
        content: `${errorMsg}\n\n**URL yang dikirim:**\n\`\`\`${this.truncateForDisplay(url, 100)}\`\`\``
      });
    }
  },
  
  prepareUrl(url: string): string | null {
    try {
      // Bersihkan whitespace
      url = url.trim();
      
      // Coba parse sebagai URL
      let urlObj: URL;
      
      try {
        urlObj = new URL(url);
      } catch {
        // Jika gagal, tambahkan https:// dan coba lagi
        url = 'https://' + url;
        urlObj = new URL(url);
      }
      
      // TERIMA SEMUA PROTOCOL: http, https, ftp, mailto, dll
      // NvShortUrl akan menangani validasinya sendiri
      return urlObj.toString();
      
    } catch (error) {
      logger.error(`URL preparation error: ${error}`, 'SHORT-URL');
      return null;
    }
  },
  
  async sendResult(interaction: ChatInputCommandInteraction, data: ShortUrlResponse, hidden: boolean) {
    const shortData = data.data;
    
    // Buat embed dengan URL asli yang di-truncate jika perlu
    const embed = this.createResultEmbed(shortData);
    
    // Buat buttons dengan timeout handling
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`shorturl_stats_${shortData.shortSlug}_${Date.now()}`)
          .setLabel('Stats')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`shorturl_copy_${shortData.shortSlug}_${Date.now()}`)
          .setLabel('Copy')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setLabel('Open')
          .setStyle(ButtonStyle.Link)
          .setURL(shortData.shortUrl),
        new ButtonBuilder()
          .setCustomId(`shorturl_delete_${shortData.shortSlug}_${Date.now()}`)
          .setLabel('Delete')
          .setStyle(ButtonStyle.Danger)
      );
    
    await interaction.editReply({
      embeds: [embed],
      components: [row]
    });
    
    // Setup button handlers dengan timestamp untuk uniqueness
    this.setupButtonHandlers(interaction, shortData.shortSlug, hidden, Date.now());
  },
  
  createResultEmbed(data: any): EmbedBuilder {
    // Format URL asli untuk display
    const displayUrl = this.formatUrlForDisplay(data.originalUrl);
    
    const embed = new EmbedBuilder()
      .setColor(0x4d9be6)
      .setTitle('✅ URL Shortened')
      .setDescription(`**Short URL:** \`${data.shortUrl}\``)
      .addFields(
        { 
          name: 'Original URL', 
          value: displayUrl, 
          inline: false 
        },
        { 
          name: 'Slug', 
          value: `\`${data.shortSlug}\``, 
          inline: true 
        },
        { 
          name: 'Created', 
          value: `<t:${Math.floor(new Date(data.createdAt).getTime() / 1000)}:R>`, 
          inline: true 
        }
      )
      .setFooter({ 
        text: 'NvLabs X NSU',
        iconURL: 'https://nvlabs.my.id/files/my.png'
      })
      .setTimestamp();
    
    // Tambahkan metadata opsional
    if (data.title && data.title.trim()) {
      embed.addFields({ 
        name: '📝 Title', 
        value: this.escapeMarkdown(data.title), 
        inline: false 
      });
    }
    
    if (data.description && data.description.trim()) {
      embed.addFields({ 
        name: '📄 Description', 
        value: this.escapeMarkdown(data.description), 
        inline: false 
      });
    }
    
    return embed;
  },
  
  async setupButtonHandlers(interaction: ChatInputCommandInteraction, slug: string, hidden: boolean, timestamp: number) {
    const filter = (i: any) => {
      return i.customId.startsWith(`shorturl_`) && 
             i.customId.includes(slug) &&
             i.customId.includes(timestamp.toString());
    };
    
    const collector = interaction.channel?.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000, // 5 menit
      filter
    });
    
    collector?.on('collect', async (i) => {
      try {
        // Defer update untuk mencegah "interaction failed"
        await i.deferUpdate();
        
        const action = i.customId.split('_')[1];
        
        switch (action) {
          case 'stats':
            await this.handleStats(i, slug, hidden);
            break;
          case 'copy':
            await this.handleCopy(i, slug);
            break;
          case 'delete':
            await this.handleDelete(i, slug, hidden);
            break;
        }
        
      } catch (error) {
        logger.error(`Button handler error: ${error}`, 'SHORT-URL-BUTTON');
        
        try {
          await i.followUp({
            content: '❌ Terjadi error saat memproses.',
            ephemeral: true
          });
        } catch (e) {
          // Ignore jika sudah ada response
        }
      }
    });
    
    collector?.on('end', () => {
      // Disable buttons setelah timeout
      try {
        interaction.editReply({ components: [] });
      } catch (error) {
        // Ignore jika message sudah dihapus
      }
    });
  },
  
  async handleStats(interaction: any, slug: string, hidden: boolean) {
    try {
      logger.info(`Fetching stats for: ${slug}`, 'SHORT-URL-STATS');
      
      const response = await axios.get(`https://nsu.my.id/stats/${slug}`, { 
        timeout: 10000 
      });
      
      const statsData: StatsResponse = response.data;
      
      if (!statsData.success) {
        throw new Error('Failed to fetch stats');
      }
      
      const stats = statsData.data;
      const lastAccessed = stats.lastAccessed ? 
        `<t:${Math.floor(new Date(stats.lastAccessed).getTime() / 1000)}:R>` : 'Never';
      
      const statsEmbed = new EmbedBuilder()
        .setColor(0x10b981)
        .setTitle('URL Statistics')
        .setDescription(`**Slug:** \`${stats.shortSlug}\``)
        .addFields(
          { name: 'Visits', value: `**${stats.visits}** clicks`, inline: true },
          { name: 'Status', value: stats.isActive ? '✅ Active' : '❌ Inactive', inline: true },
          { name: 'Created', value: `<t:${Math.floor(new Date(stats.createdAt).getTime() / 1000)}:R>`, inline: true },
          { name: 'Last Visit', value: lastAccessed, inline: true },
          { name: 'Short URL', value: `\`${stats.shortUrl}\``, inline: false },
          { name: 'Original URL', value: this.formatUrlForDisplay(stats.originalUrl), inline: false }
        )
        .setFooter({ 
          text: 'NSU Stats',
          iconURL: 'https://nvlabs.my.id/files/my.png'
        })
        .setTimestamp();
      
      await interaction.followUp({
        embeds: [statsEmbed],
        ephemeral: hidden
      });
      
    } catch (error) {
      logger.error(`Stats error: ${error}`, 'SHORT-URL-STATS');
      
      await interaction.followUp({
        content: '❌ Gagal mengambil statistics URL.',
        ephemeral: true
      });
    }
  },
  
  async handleCopy(interaction: any, slug: string) {
    const shortUrl = `https://nsu.my.id/r/${slug}`;
    
    await interaction.followUp({
      content: `📋 **Copy this URL:**\n\`\`\`${shortUrl}\`\`\``,
      ephemeral: true
    });
  },
  
  async handleDelete(interaction: any, slug: string, hidden: boolean) {
    try {
      // Embed konfirmasi
      const confirmEmbed = new EmbedBuilder()
        .setColor(0xff6b6b)
        .setTitle('⚠️ Confirm Deletion')
        .setDescription(`You are about to delete:\n**Slug:** \`${slug}\`\n\nThis action is **permanent** and cannot be undone!`)
        .setFooter({ text: 'Type "CONFIRM" to proceed or wait 30 seconds to cancel' });
      
      // Kirim modal/confirmation sederhana
      await interaction.followUp({
        content: `🗑️ **Delete URL?**\nSlug: \`${slug}\`\n\nReply with \`yes\` to confirm deletion within 30 seconds.`,
        ephemeral: true
      });
      
      // Collector untuk reply
      const filter = (m: any) => 
        m.author.id === interaction.user.id && 
        m.content.toLowerCase() === 'yes';
      
      const collector = interaction.channel?.createMessageCollector({
        filter,
        time: 30000,
        max: 1
      });
      
      collector?.on('collect', async () => {
        try {
          // Eksekusi delete
          const deleteResponse = await axios.get(`https://nsu.my.id/delete.py?slug=${slug}`);
          
          if (deleteResponse.data.success) {
            await interaction.followUp({
              content: `✅ Successfully deleted **${slug}**`,
              ephemeral: true
            });
            
            // Update original message
            try {
              await interaction.message.edit({
                components: []
              });
            } catch (e) {
              // Ignore
            }
            
          } else {
            await interaction.followUp({
              content: '❌ Failed to delete URL.',
              ephemeral: true
            });
          }
          
        } catch (error) {
          logger.error(`Delete execution error: ${error}`, 'SHORT-URL-DELETE');
          await interaction.followUp({
            content: '❌ Error deleting URL.',
            ephemeral: true
          });
        }
      });
      
      collector?.on('end', (collected) => {
        if (collected.size === 0) {
          interaction.followUp({
            content: '🚫 Deletion cancelled (timeout).',
            ephemeral: true
          }).catch(() => {});
        }
      });
      
    } catch (error) {
      logger.error(`Delete init error: ${error}`, 'SHORT-URL-DELETE');
      
      await interaction.followUp({
        content: '❌ Gagal memulai proses penghapusan.',
        ephemeral: true
      });
    }
  },
  
  cleanSlug(slug: string): string {
    // Hanya bersihkan karakter yang benar-benar bermasalah
    return slug.replace(/[^\w-]/g, '');
  },
  
  escapeMarkdown(text: string): string {
    if (!text) return '';
    return text.replace(/[\\*_~`|>]/g, '\\$&');
  },
  
  formatUrlForDisplay(url: string): string {
    // Escape markdown dan truncate jika perlu
    const escaped = this.escapeMarkdown(url);
    
    if (escaped.length <= 80) return escaped;
    
    // Split URL untuk truncate yang lebih baik
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const path = urlObj.pathname + urlObj.search;
      
      if (hostname.length > 40) {
        return `\`${hostname.substring(0, 37)}...\``;
      }
      
      if (path.length > 40) {
        return `\`${hostname}${path.substring(0, 37)}...\``;
      }
      
      return `\`${hostname}${path}\``;
      
    } catch {
      return `\`${escaped.substring(0, 77)}...\``;
    }
  },
  
  truncateForLog(text: string, maxLength: number = 100): string {
    if (!text || text.length <= maxLength) return text || '';
    return `${text.substring(0, maxLength)}... [${text.length} chars]`;
  },
  
  truncateForDisplay(text: string, maxLength: number = 100): string {
    if (!text || text.length <= maxLength) return text || '';
    return `${text.substring(0, maxLength - 3)}...`;
  }
} as Command;
