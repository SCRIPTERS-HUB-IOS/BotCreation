const express = require('express');
const axios = require('axios');
const { 
  Client, GatewayIntentBits, REST, Routes, 
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, 
  ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');
const http = require('http');
require('dotenv').config();

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const SELF_URL = process.env.SELF_URL;

const app = express();
app.get('/', (req, res) => res.send('Bot running ✅'));
app.listen(process.env.PORT || 3000, () => console.log('🚀 Railway server ready'));

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const commands = [
  new SlashCommandBuilder()
    .setName('flood')
    .setDescription('Flooding command')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ Slash commands registered globally');
  } catch (err) {
    console.error('❌ Command registration error:', err);
  }
})();

const floodCache = new Map();

client.on('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  await axios.post(WEBHOOK_URL, {
    username: "Notifier",
    embeds: [{
      title: "🤖 Bot Online",
      color: 0x57F287,
      description: `Bot started successfully on Railway as **${client.user.tag}**`,
      timestamp: new Date()
    }]
  }).catch(() => {});
});

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === 'flood') {
      const guild = interaction.guild;
      const channelName = interaction.channel?.name || 'Unknown';
      floodCache.set(interaction.user.id, { channelName, userTag: interaction.user.tag });

      const embed = {
        title: "📌 COMMAND EXECUTED",
        color: 0x2f3136,
        fields: [
          { name: "🌐 Server Name", value: guild?.name || "Unknown", inline: true },
          { name: "👥 Members", value: `${guild?.memberCount || 0}`, inline: true },
          { name: "👑 Server Owner", value: guild?.ownerId ? `<@${guild.ownerId}>` : "Unknown", inline: true },
          { name: "📅 Server Created", value: guild?.createdAt?.toLocaleDateString() || "N/A", inline: true },
          { name: "🎭 Roles", value: `${guild?.roles?.cache.size || 0}`, inline: true },
          { name: "😂 Emojis", value: `${guild?.emojis?.cache.size || 0}`, inline: true },
          { name: "🚀 Boost Level", value: `${guild?.premiumTier || 0}`, inline: true },
          { name: "💎 Boost Count", value: `${guild?.premiumSubscriptionCount || 0}`, inline: true },
          { name: "✅ Verification Level", value: `${guild?.verificationLevel || "Unknown"}`, inline: true },
          { name: "🙋 Command Run By", value: `${interaction.user.tag}`, inline: true },
          { name: "📡 Bot Latency", value: `${client.ws.ping}ms`, inline: true },
        ],
        footer: { text: `Channel: #${channelName}` },
        timestamp: new Date()
      };

      await axios.post(WEBHOOK_URL, { username: "Notifier", embeds: [embed] })
        .catch(err => console.error("Webhook error:", err));

      const floodEmbed = new EmbedBuilder()
        .setTitle("READY TO FLOOD?")
        .setColor(0xFF0000);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('activate')
          .setLabel('ACTIVATE!')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('custom_message')
          .setLabel('CUSTOM MESSAGE')
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.reply({ embeds: [floodEmbed], components: [row], ephemeral: true });
    }

    if (interaction.isButton()) {
      const cache = floodCache.get(interaction.user.id);
      if (!cache) return;

      if (interaction.customId === 'activate') {
        const spamText = `@everyone @here \n**FREE DISCORD RAIDBOT WITH CUSTOM MESSAGES** https://discord.gg/6AGgHe4MKb`;
        await interaction.deferUpdate();
        for (let j = 0; j < 5; j++) {
          setTimeout(() => interaction.channel.send(spamText), 800 * j);
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

    if (interaction.isModalSubmit() && interaction.customId === 'custom_modal') {
      const userMessage = interaction.fields.getTextInputValue('message_input');
      await interaction.deferReply({ ephemeral: false });
      for (let j = 0; j < 5; j++) {
        setTimeout(() => interaction.followUp({ content: userMessage }), 800 * j);
      }
    }
  } catch (err) {
    console.error('⚠️ Interaction error:', err);
  }
});

client.login(TOKEN);

setInterval(() => {
  http.get(SELF_URL, (res) => {
    console.log(`🔄 Self-pinged ${SELF_URL} (${res.statusCode})`);
  }).on('error', (err) => {
    console.error('❌ Self-ping error:', err);
  });
}, 240000);
