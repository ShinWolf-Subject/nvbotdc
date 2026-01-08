// src/commands/random/rba.ts (Fixed - tanpa success)
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
    .setName('rba')
    .setDescription('Get random Blue Archive character image'),
  cooldown: 3,
  
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    
    try {
      logger.info(`Fetching Blue Archive image for: ${interaction.user.tag}`, 'RBA');
      
      // Tambahkan parameter untuk hindari cache
      const apiUrl = `https://nvlabs.my.id/nv/random/ba?t=${Date.now()}`;
      
      // Fetch gambar
      const response = await axios.get(apiUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'Accept': 'image/*',
          'User-Agent': 'DiscordBot/1.0'
        }
      });
      
      // Validasi response
      const contentType = response.headers['content-type'];
      if (!contentType || !contentType.startsWith('image/')) {
        logger.error(`Invalid content type: ${contentType}`, 'RBA');
        throw new Error('API tidak mengembalikan gambar');
      }
      
      // Buat buffer
      const imageBuffer = Buffer.from(response.data);
      
      // Tentukan ekstensi
      let extension = 'jpg';
      if (contentType.includes('png')) extension = 'png';
      else if (contentType.includes('gif')) extension = 'gif';
      else if (contentType.includes('webp')) extension = 'webp';
      
      // Buat attachment
      const filename = `bluearchive_${Date.now()}.${extension}`;
      const attachment = new AttachmentBuilder(imageBuffer, {
        name: filename
      });
      
      // Kirim gambar
      await interaction.editReply({
        content: null,
        files: [attachment]
      });
      
      // GANTI success MENJADI info
      logger.info(`Image sent for: ${interaction.user.tag}. Size: ${imageBuffer.length} bytes`, 'RBA');
      
    } catch (error) {
      logger.error(`Failed to fetch Blue Archive image: ${error}`, 'RBA');
      
      // Log detail error
      if (axios.isAxiosError(error)) {
        logger.error(`Axios error: ${error.code} - ${error.message}`, 'RBA');
      }
      
      await interaction.editReply({
        content: '❌ Gagal mengambil gambar.'
      });
    }
  }
} as Command;
