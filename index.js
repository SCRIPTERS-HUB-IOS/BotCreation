const express = require('express');
const http = require('http');
const { 
  Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, 
  ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes 
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

// Register /flood command (guild for instant effect)
const commands = [new SlashCommandBuilder().setName('flood').setDescription('Flooding command').toJSON()];
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('Slash command registered.');
  } catch (err) { console.error(err); }
})();

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === 'flood') {
      const guild = interaction.guild;

      // Notification embed to notify channel
      const notifyEmbed = new EmbedBuilder()
        .setTitle('📌 COMMAND EXECUTED')
        .setColor(0x2f3136)
        .addFields(
          { name: '🌐 Server Name', value: guild?.name || 'Unknown', inline: true },
          { name: '👥 Members', value: `${guild?.memberCount || 0}`, inline: true },
          { name: '🙋 Command Run By', value: interaction.user.tag, inline: true },
          { name: '📡 Bot Latency', value: `${client.ws.ping}ms`, inline: true }
        )
        .setTimestamp();

      const notifyChannel = await client.channels.fetch(NOTIFY_CHANNEL_ID);
      if (notifyChannel && notifyChannel.isTextBased()) {
        await notifyChannel.send({ embeds: [notifyEmbed] });
      }

      // Embed + buttons for the user
      const floodEmbed = new EmbedBuilder()
        .setTitle('READY TO FLOOD?')
        .setColor(0xFF0000)
        .addFields(
          { name: '🌐 Server', value: guild?.name || 'Unknown', inline: true },
          { name: '👥 Members', value: `${guild?.memberCount || 0}`, inline: true },
          { name: '🙋 Run By', value: interaction.user.tag, inline: true },
          { name: '📡 Bot Ping', value: `${client.ws.ping}ms`, inline: true }
        );

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder().setCustomId('activate').setLabel('ACTIVATE!').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('custom_message').setLabel('CUSTOM MESSAGE').setStyle(ButtonStyle.Secondary)
        );

      await interaction.reply({ embeds: [floodEmbed], components: [row], ephemeral: true });
    }

    // Button handling
    if (interaction.isButton()) {
      const channel = await client.channels.fetch(interaction.channelId);
      if (!channel || !channel.isTextBased()) return;

      if (interaction.customId === 'activate') {
        await interaction.reply({ content: 'Flood started!', ephemeral: true });
        const spam = '@everyone @here FREE DISCORD RAIDBOT!';
        for (let i = 0; i < 5; i++) setTimeout(() => channel.send(spam), i * 800);
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

    // Modal submit
    if (interaction.isModalSubmit() && interaction.customId === 'custom_modal') {
      const channel = await client.channels.fetch(interaction.channelId);
      if (!channel || !channel.isTextBased()) return;

      const message = interaction.fields.getTextInputValue('message_input');
      await interaction.reply({ content: 'Flooding your message...', ephemeral: true });
      for (let i = 0; i < 5; i++) setTimeout(() => channel.send(message), i * 800);
    }

  } catch (err) { console.error(err); }
});

// Login and keep-alive
client.login(TOKEN);
setInterval(() => http.get(SELF_URL).on('error', err => console.error('Self-ping error:', err)), 240000);
