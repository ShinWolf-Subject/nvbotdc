import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../types';
import axios from 'axios';

export default {
  data: new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Get a random meme from Reddit')
    .addStringOption(option =>
      option.setName('subreddit')
        .setDescription('Subreddit to get meme from')
        .setRequired(false)
        .addChoices(
          { name: 'Programmer Humor', value: 'ProgrammerHumor' },
          { name: 'Memes', value: 'memes' },
          { name: 'Dank Memes', value: 'dankmemes' }
        )
    ),
  cooldown: 10,
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    
    const subreddit = interaction.options.getString('subreddit') || 'memes';
    
    try {
      const response = await axios.get(`https://www.reddit.com/r/${subreddit}/random/.json`);
      const meme = response.data[0].data.children[0].data;
      
      const embed = new EmbedBuilder()
        .setColor(0xff4500)
        .setTitle(meme.title)
        .setURL(`https://reddit.com${meme.permalink}`)
        .setImage(meme.url)
        .setFooter({ 
          text: `👍 ${meme.ups} | 💬 ${meme.num_comments} | r/${meme.subreddit}` 
        })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({
        content: '❌ Failed to fetch meme. Please try again later.'
      });
    }
  }
} as Command;
