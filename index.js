const express = require('express');
const http = require('http');
const { 
  Client, GatewayIntentBits, REST, Routes, 
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, 
  ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const SELF_URL = process.env.SELF_URL;
const NOTIFY_CHANNEL_ID = process.env.NOTIFY_CHANNEL_ID;

const app = express();
app.get('/', (req, res) => res.send('Bot running'));
app.listen(process.env.PORT || 3000, () => console.log('Server ready'));

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const commands = [
  new SlashCommandBuilder().setName('flood').setDescription('Flooding command')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('Slash commands registered.');
  } catch (err) {
    console.error(err);
  }
})();

client.on('interactionCreate', async interaction => {
  try {
    // --- Slash command ---
    if (interaction.isChatInputCommand() && interaction.commandName === 'flood') {
      const guild = interaction.guild;
      const channelName = interaction.channel?.name || 'Unknown';

      // Immediate ephemeral reply to avoid timeout
      await interaction.reply({ content: 'Preparing flood...', ephemeral: true });

      // Build notification embed
      const notifyEmbed = new EmbedBuilder()
        .setTitle('📌 COMMAND EXECUTED')
        .setColor(0x2f3136)
        .addFields(
          { name: '🌐 Server Name', value: guild?.name || 'Unknown', inline: true },
          { name: '👥 Members', value: `${guild?.memberCount || 0}`, inline: true },
          { name: '👑 Server Owner', value: guild?.ownerId ? `<@${guild.ownerId}>` : 'Unknown', inline: true },
          { name: '🚀 Boost Level', value: `${guild?.premiumTier || 0}`, inline: true },
          { name: '💎 Boost Count', value: `${guild?.premiumSubscriptionCount || 0}`, inline: true },
          { name: '🙋 Command Run By', value: interaction.user.tag, inline: true },
          { name: '📡 Bot Latency', value: `${client.ws.ping}ms`, inline: true }
        )
        .setFooter({ text: `Channel: #${channelName}` })
        .setTimestamp();

      // Send notification
      const notifyChannel = await client.channels.fetch(NOTIFY_CHANNEL_ID);
      if (notifyChannel && notifyChannel.isTextBased()) {
        await notifyChannel.send({ embeds: [notifyEmbed] });
      }

      // Send button embed
      const buttonEmbed = new EmbedBuilder()
        .setTitle('READY TO FLOOD?')
        .setColor(0xFF0000);

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder().setCustomId('activate').setLabel('ACTIVATE!').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('custom_message').setLabel('CUSTOM MESSAGE').setStyle(ButtonStyle.Secondary)
        );

      await interaction.followUp({ embeds: [buttonEmbed], components: [row], ephemeral: true });
    }

    // --- Button interaction ---
    if (interaction.isButton()) {
      const targetChannel = await client.channels.fetch(interaction.channelId);
      if (!targetChannel || !targetChannel.isTextBased()) return;

      if (interaction.customId === 'activate') {
        // Reply immediately
        await interaction.reply({ content: 'Flood started!', ephemeral: true });

        const spamText = `@everyone @here\n**FREE DISCORD RAIDBOT WITH CUSTOM MESSAGES** https://discord.gg/6AGgHe4MKb`;

        // Flood asynchronously in the background
        for (let i = 0; i < 5; i++) {
          setTimeout(() => targetChannel.send(spamText), i * 800);
        }
      }

      if (interaction.customId === 'custom_message') {
        const modal = new ModalBuilder()
          .setCustomId('custom_modal')
          .setTitle('Enter Your Message')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('message_input')
                .setLabel('Message to flood')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
            )
          );
        await interaction.showModal(modal);
      }
    }

    // --- Modal submit ---
    if (interaction.isModalSubmit() && interaction.customId === 'custom_modal') {
      const targetChannel = await client.channels.fetch(interaction.channelId);
      if (!targetChannel || !targetChannel.isTextBased()) return;

      const userMessage = interaction.fields.getTextInputValue('message_input');
      await interaction.reply({ content: 'Flooding your message...', ephemeral: true });

      for (let i = 0; i < 5; i++) {
        setTimeout(() => targetChannel.send(userMessage), i * 800);
      }
    }
  } catch (err) {
    console.error('Interaction error:', err);
  }
});

// Login
client.login(TOKEN);

// Keep-alive
setInterval(() => {
  http.get(SELF_URL).on('error', err => console.error('Self-ping error:', err));
}, 240000);
