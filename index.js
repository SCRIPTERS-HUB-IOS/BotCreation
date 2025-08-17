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

// Keep-alive server
const app = express();
app.get('/', (req, res) => res.send('Bot running'));
app.listen(process.env.PORT || 3000, () => console.log('Server ready'));

// Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// Register /flood command (guild-specific for instant testing)
const commands = [
  new SlashCommandBuilder()
    .setName('flood')
    .setDescription('Flooding command')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('Commands registered to guild instantly');
  } catch (err) {
    console.error(err);
  }
})();

const floodCache = new Map();

client.on('interactionCreate', async interaction => {
  try {
    // --- Slash command ---
    if (interaction.isChatInputCommand() && interaction.commandName === 'flood') {
      const guild = interaction.guild;
      const channelName = interaction.channel?.name || 'Unknown';
      floodCache.set(interaction.user.id, { channelName, userTag: interaction.user.tag });

      // Send notification embed to your notify channel
      const embed = new EmbedBuilder()
        .setTitle('📌 COMMAND EXECUTED')
        .setColor(0x2f3136)
        .addFields(
          { name: '🌐 Server Name', value: guild?.name || 'Unknown', inline: true },
          { name: '👥 Members', value: `${guild?.memberCount || 0}`, inline: true },
          { name: '👑 Server Owner', value: guild?.ownerId ? `<@${guild.ownerId}>` : 'Unknown', inline: true },
          { name: '🚀 Boost Level', value: `${guild?.premiumTier || 0}`, inline: true },
          { name: '💎 Boost Count', value: `${guild?.premiumSubscriptionCount || 0}`, inline: true },
          { name: '🙋 Command Run By', value: `${interaction.user.tag}`, inline: true },
          { name: '📡 Bot Latency', value: `${client.ws.ping}ms`, inline: true }
        )
        .setFooter({ text: `Channel: #${channelName}` })
        .setTimestamp();

      const notifyChannel = await client.channels.fetch(NOTIFY_CHANNEL_ID);
      if (notifyChannel && notifyChannel.isTextBased()) {
        await notifyChannel.send({ embeds: [embed] });
      }

      // --- Send buttons/embed to user ---
      const floodEmbed = new EmbedBuilder()
        .setTitle('READY TO FLOOD?')
        .setColor(0xFF0000);

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('activate')
            .setLabel('ACTIVATE!')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('custom_message')
            .setLabel('CUSTOM MESSAGE')
            .setStyle(ButtonStyle.Secondary)
        );

      // Immediate ephemeral reply
      await interaction.reply({ embeds: [floodEmbed], components: [row], ephemeral: true });
    }

    // --- Button interaction ---
    if (interaction.isButton()) {
      const cache = floodCache.get(interaction.user.id);
      if (!cache) return;

      if (interaction.customId === 'activate') {
        const spamText = `@everyone @here\n**FREE DISCORD RAIDBOT WITH CUSTOM MESSAGES** https://discord.gg/6AGgHe4MKb`;
        await interaction.reply({ content: spamText });
        for (let j = 0; j < 4; j++) {
          setTimeout(() => interaction.followUp({ content: spamText }), 800 * (j + 1));
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
                .setLabel('Message to spam')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
            )
          );
        await interaction.showModal(modal);
      }
    }

    // --- Modal submit ---
    if (interaction.isModalSubmit() && interaction.customId === 'custom_modal') {
      const userMessage = interaction.fields.getTextInputValue('message_input');
      await interaction.reply({ content: `Spamming your message...`, ephemeral: true });
      for (let j = 0; j < 4; j++) {
        setTimeout(() => interaction.followUp({ content: userMessage }), 800 * (j + 1));
      }
    }

  } catch (err) {
    console.error('Interaction error:', err);
  }
});

// Login
client.login(TOKEN);

// Keep-alive self-ping
setInterval(() => {
  http.get(SELF_URL).on('error', err => console.error('Self-ping error:', err));
}, 240000);
