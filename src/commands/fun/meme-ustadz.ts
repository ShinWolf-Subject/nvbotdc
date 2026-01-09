// src/commands/fun/memeustadz.ts
import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  AttachmentBuilder 
} from 'discord.js';
import axios from 'axios';
import { Command } from '../../types';
import { logger } from '../../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('ustadz-quote')
    .setDescription('Buat meme ustadz dengan teks custom')
    .addStringOption(option =>
      option.setName('text')
        .setDescription('Teks untuk meme ustadz')
        .setRequired(true)
        .setMaxLength(100)
    )
    .addBooleanOption(option =>
      option.setName('hidden')
        .setDescription('Hanya kamu yang bisa melihat hasilnya')
        .setRequired(false)
    ),
  cooldown: 15,
  async execute(interaction: ChatInputCommandInteraction) {
    const text = interaction.options.getString('text', true);
    const text2 = interaction.options.getString('text2');
    const hidden = interaction.options.getBoolean('hidden') || false;
    
    await interaction.deferReply({ ephemeral: hidden });
    
    try {
      logger.info(`Creating ustadz meme with text: ${text}`, 'MEME-USTADZ');
      
      // Encode text untuk URL
      const encodedText = encodeURIComponent(text);
      let apiUrl = `https://nvlabs.my.id/nv/canvas/ustadz?text=${encodedText}`;
      
      // Jika ada text2, tambahkan sebagai line kedua
      if (text2) {
        const encodedText2 = encodeURIComponent(text2);
        apiUrl += `&line2=${encodedText2}`;
      }
      
      // Ambil data dari API
      const response = await axios.get(apiUrl, {
        timeout: 30000, // 30 detik timeout
        headers: {
          'User-Agent': 'DiscordBot/1.0.0'
        }
      });
      
      const apiData = response.data;
      
      if (!apiData.success || !apiData.results?.url) {
        throw new Error('API tidak mengembalikan gambar');
      }
      
      // Download gambar dari CDN
      logger.info(`Downloading image from: ${apiData.results.url}`, 'MEME-USTADZ');
      
      const imageResponse = await axios.get(apiData.results.url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'Accept': 'image/*'
        }
      });
      
      // Buat attachment dari buffer
      const imageBuffer = Buffer.from(imageResponse.data);
      const attachment = new AttachmentBuilder(imageBuffer, {
        name: apiData.results.filename || 'ustadz_meme.jpg',
        description: `Meme ustadz: ${text}`
      });
      
      // Kirim gambar
      await interaction.editReply({
        content: `📸 **Meme Ustadz Berhasil!**\n💬 **Teks:** ${text}${text2 ? `\n💬 **Teks 2:** ${text2}` : ''}\n⏱️ **Expires:** <t:${Math.floor(new Date(apiData.results.expiresAt).getTime() / 1000)}:R>`,
        files: [attachment]
      });
      
      logger.info(`Meme ustadz sent successfully for user: ${interaction.user.tag}`, 'MEME-USTADZ');
      
    } catch (error) {
      logger.error(`Error creating ustadz meme: ${error}`, 'MEME-USTADZ');
      
      let errorMessage = '❌ Gagal membuat meme ustadz. Silakan coba lagi nanti.';
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          errorMessage = '⏱️ Timeout: API terlalu lama merespon. Silakan coba lagi.';
        } else if (error.response) {
          errorMessage = `❌ API Error: ${error.response.status} - ${error.response.statusText}`;
        }
      }
      
      if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage });
      } else {
        await interaction.reply({ 
          content: errorMessage, 
          ephemeral: true 
        });
      }
    }
  }
} as Command;
