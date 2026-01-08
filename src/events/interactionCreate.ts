import { Events, Interaction } from 'discord.js';
import { Event } from '../types';
import { commandLoader } from '../utils/commandLoader';
import { logger } from '../utils/logger';

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = commandLoader.getCommand(interaction.commandName);
    if (!command) {
      logger.error(`Command ${interaction.commandName} not found`, 'INTERACTION');
      return;
    }

    // Check cooldown
    const cooldown = commandLoader.getCooldown(interaction.user.id, interaction.commandName);
    if (cooldown > 0) {
      await interaction.reply({
        content: `⏳ Please wait ${cooldown} second(s) before reusing this command.`,
        ephemeral: true
      });
      return;
    }

    // Apply cooldown
    if (command.cooldown) {
      commandLoader.addCooldown(interaction.user.id, interaction.commandName, command.cooldown);
    }

    // Check permissions
    if (command.permissions && interaction.memberPermissions) {
      const missingPermissions = command.permissions.filter(
        perm => !interaction.memberPermissions?.has(perm)
      );
      
      if (missingPermissions.length > 0) {
        await interaction.reply({
          content: `❌ You need the following permissions: ${missingPermissions.join(', ')}`,
          ephemeral: true
        });
        return;
      }
    }

    try {
      // Log command usage
      logger.command(
        `/${interaction.commandName}`,
        interaction.user.tag,
        interaction.guild?.name || 'DM'
      );

      await command.execute(interaction);
    } catch (error) {
      logger.error(`Error executing command ${interaction.commandName}: ${error}`, 'COMMAND-ERROR');
      
      const errorMessage = {
        content: '❌ There was an error while executing this command!',
        ephemeral: true
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  }
} as Event;
