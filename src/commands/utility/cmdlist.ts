// src/commands/utility/allcmd.ts (Simple Version)
import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder
} from 'discord.js';
import { Command } from '../../types';
import { logger } from '../../utils/logger';
import { readdirSync } from 'fs';
import { join } from 'path';

export default {
  data: new SlashCommandBuilder()
    .setName('cmdlist')
    .setDescription('Show all available commands')
    .addBooleanOption(option =>
      option.setName('hidden')
        .setDescription('Only you can see the commands list')
        .setRequired(false)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    const hidden = interaction.options.getBoolean('hidden') || false;
    
    await interaction.deferReply({ ephemeral: hidden });
    
    try {
      logger.info(`Allcmd request from ${interaction.user.tag}`, 'ALLCMD');
      
      const commands = await this.getAllCommands();
      
      if (commands.length === 0) {
        await interaction.editReply({
          content: '❌ Tidak ada command yang tersedia.'
        });
        return;
      }
      
      // Buat embed sederhana
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('📋 Available Commands')
        .setDescription(`**Total:** ${commands.length} commands`)
        .setFooter({ 
          text: `Requested by ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();
      
      // Group by category
      const grouped: Record<string, string[]> = {};
      
      commands.forEach(cmd => {
        if (!grouped[cmd.category]) {
          grouped[cmd.category] = [];
        }
        grouped[cmd.category].push(`\`/${cmd.name}\` - ${cmd.description}`);
      });
      
      // Add fields untuk setiap kategori
      Object.entries(grouped).forEach(([category, cmds]) => {
        embed.addFields({
          name: `${this.getCategoryEmoji(category)} ${category}`,
          value: cmds.join('\n'),
          inline: false
        });
      });
      
      await interaction.editReply({
        embeds: [embed]
      });
      
      logger.info(`Sent ${commands.length} commands list`, 'ALLCMD');
      
    } catch (error) {
      logger.error(`Allcmd error: ${error}`, 'ALLCMD');
      
      await interaction.editReply({
        content: '❌ Gagal mengambil daftar command.'
      });
    }
  },
  
  async getAllCommands(): Promise<Array<{name: string, description: string, category: string}>> {
    const commands = [];
    const commandsPath = join(__dirname, '../../commands');
    
    try {
      const categories = readdirSync(commandsPath);
      
      for (const category of categories) {
        const categoryPath = join(commandsPath, category);
        
        if (!require('fs').statSync(categoryPath).isDirectory()) {
          continue;
        }
        
        const commandFiles = readdirSync(categoryPath)
          .filter(file => file.endsWith('.ts') || file.endsWith('.js'));
        
        for (const file of commandFiles) {
          try {
            const command: Command = require(join(categoryPath, file)).default;
            
            if (command?.data) {
              commands.push({
                name: command.data.name,
                description: command.data.description,
                category: this.formatCategoryName(category)
              });
            }
          } catch (error) {
            // Skip command yang error
          }
        }
      }
      
      return commands.sort((a, b) => a.name.localeCompare(b.name));
      
    } catch (error) {
      return [];
    }
  },
  
  formatCategoryName(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  },
  
  getCategoryEmoji(category: string): string {
    const emojiMap: Record<string, string> = {
      'utility': '🔧',
      'fun': '🎮',
      'moderation': '🛡️',
      'ai': '🤖',
      'search': '🔍',
      'random': '🎲'
    };
    
    return emojiMap[category.toLowerCase()] || '📁';
  }
} as Command;
