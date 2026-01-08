// src/commands/ai/claude.ts (Simple Version)
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
    .setName('claude')
    .setDescription('Chat with Claude AI')
    .addStringOption(option =>
      option.setName('msg')
        .setDescription('Your message to Claude')
        .setRequired(true)
        .setMaxLength(1000)
    ),
  cooldown: 8,
  
  async execute(interaction: ChatInputCommandInteraction) {
    const message = interaction.options.getString('msg', true);
    
    await interaction.deferReply();
    
    try {
      logger.info(`Claude request: "${message}"`, 'CLAUDE');
      
      const encodedMsg = encodeURIComponent(message);
      const apiUrl = `https://nvlabs.my.id/nv/ai/claude?msg=${encodedMsg}`;
      
      const response = await axios.get(apiUrl, { timeout: 20000 });
      const apiData = response.data;
      
      if (!apiData.success || !apiData.data) {
        await interaction.editReply({
          content: '❌ Claude AI tidak merespons.'
        });
        return;
      }
      
      const claudeData = apiData.data;
      
      // Format response
      const embed = new EmbedBuilder()
        .setColor(0x10b981)
        .setTitle('🤖 Claude AI Response')
        .setDescription(claudeData.response)
        .addFields(
          { name: '🔢 Tokens', value: claudeData.estimated_tokens.toString(), inline: true },
          { name: '📏 Length', value: `${claudeData.response_length} chars`, inline: true }
        )
        .setFooter({ 
          text: `Requested by ${interaction.user.username}`,
          iconURL: 'https://nvlabs.my.id/files/my.png'
        })
        .setTimestamp();
      
      await interaction.editReply({
        content: `**💬 Your message:** ${message}`,
        embeds: [embed]
      });
      
    } catch (error) {
      logger.error(`Claude error: ${error}`, 'CLAUDE');
      
      await interaction.editReply({
        content: '❌ Gagal menghubungi Claude AI. Coba lagi nanti.'
      });
    }
  },
  
  getModelName(model: string): string {
    if (model.includes('haiku')) return 'Claude Haiku';
    if (model.includes('sonnet')) return 'Claude Sonnet';
    if (model.includes('opus')) return 'Claude Opus';
    return model;
  }
} as Command;
