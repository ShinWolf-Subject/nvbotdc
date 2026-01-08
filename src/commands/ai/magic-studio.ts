// src/commands/ai/magic-studio.ts (Only Image)
import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  AttachmentBuilder
} from 'discord.js';
import axios from 'axios';
import { Command } from '../../types';

export default {
  data: new SlashCommandBuilder()
    .setName('imagine')
    .setDescription('Generate AI image')
    .addStringOption(option =>
      option.setName('prompt')
        .setDescription('Apa yang ingin digenerate?')
        .setRequired(true)
        .setMaxLength(150)
    ),
  cooldown: 20,
  async execute(interaction: ChatInputCommandInteraction) {
    const prompt = interaction.options.getString('prompt', true);
    
    // Tampilkan loading
    await interaction.deferReply();
    
    try {
      // Encode dan panggil API
      const encodedPrompt = encodeURIComponent(prompt);
      const apiUrl = `https://nvlabs.my.id/nv/images/magicstudio?prompt=${encodedPrompt}`;
      
      // Download gambar
      const response = await axios.get(apiUrl, {
        responseType: 'arraybuffer',
        timeout: 45000
      });
      
      // Buat buffer
      const buffer = Buffer.from(response.data);
      
      // Buat attachment
      const attachment = new AttachmentBuilder(buffer, {
        name: `ai_${Date.now()}.png`
      });
      
      // Kirim hanya gambar
      await interaction.editReply({
        content: '', // Kosongkan content
        files: [attachment]
      });
      
    } catch (error) {
      await interaction.editReply({
        content: '❌ Gagal membuat gambar. Coba lagi.'
      });
    }
  }
} as Command;
