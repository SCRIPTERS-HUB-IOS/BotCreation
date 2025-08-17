const express = require('express');
const axios = require('axios');
const { 
  Client, GatewayIntentBits, REST, Routes, 
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, 
  ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');
const http = require('http');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const SELF_URL = process.env.SELF_URL;

// Keep-alive webserver
const app = express();
app.get('/', (req, res) => res.send('Bot running'));
app.listen(process.env.PORT || 3000, () => console.log('Server ready'));

// Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// Register /flood command
const commands = [
  new SlashCommandBuilder()
    .setName('flood')
    .setDescription('Flooding command')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('Commands registered globally');
  } catch (err) {
    console.error(err);
  }
})();

// Cache for button actions & webhook sent flag
const floodCache = new Map();

client.on('interactionCreate', async i => {
  try {
    if (i.isChatInputCommand() && i.commandName === 'flood') {
      const guild = i.guild;
      const channelName = i.channel?.name || 'Unknown';

      // Save user info for buttons and webhook flag
      floodCache.set(i.user.id, { channelName, userTag: i.user.tag, webhookSent: false });

      // Build webhook embed
      const embed = {
        title: '📌 COMMAND EXECUTED',
        color: 0x2f3136,
        fields: [
          { name: '🌐 Server Name', value: guild?.name || 'Unknown', inline: true },
          { name: '👥 Members', value: String(guild?.memberCount || 0), inline: true },
          { name: '👑 Server Owner', value: guild?.ownerId ? `<@${guild.ownerId}>` : 'Unknown', inline: true },
          { name: '📅 Server Created', value: guild?.createdAt?.toLocaleDateString() || 'N/A', inline: true },
          { name: '🎭 Roles', value: String(guild?.roles?.cache?.size || 0), inline: true },
          { name: '😂 Emojis', value: String(guild?.emojis?.cache?.size || 0), inline: true },
          { name: '🚀 Boost Level', value: String(guild?.premiumTier || 0), inline: true },
          { name: '💎 Boost Count', value: String(guild?.premiumSubscriptionCount || 0), inline: true },
          { name: '✅ Verification Level', value: String(guild?.verificationLevel || 'Unknown'), inline: true },
          { name: '🙋 Command Run By', value: i.user.tag, inline: true },
          { name: '📡 Bot Latency', value: `${client.ws.ping}ms`, inline: true }
        ],
        footer: { text: `Channel: #${channelName}` },
        timestamp: new Date()
      };

      // Send webhook only once per command
      const cache = floodCache.get(i.user.id);
      if (!cache.webhookSent) {
        await axios.post(WEBHOOK_URL, { username: 'Notifier', embeds: [embed] })
          .catch(err => console.error('Webhook error:', err));
        cache.webhookSent = true;
        floodCache.set(i.user.id, cache);
      }

      // Reply with flood buttons
      const floodEmbed = new EmbedBuilder()
        .setTitle('READY TO FLOOD?')
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

      await i.reply({ embeds: [floodEmbed], components: [row], ephemeral: true });
    }

    if (i.isButton()) {
      const cache = floodCache.get(i.user.id);
      if (!cache) return;

      const action = i.customId === 'activate' ? 'Activate' : 'CustomMessage';
      const channelName = cache.channelName;

      // Webhook for button press
      await axios.post(WEBHOOK_URL, {
        content: `[${cache.userTag}] has pressed [${action}] in [${channelName}]`
      }).catch(err => console.error('Webhook error:', err));

      if (i.customId === 'activate') {
        const spamText = `@everyone @here \n**FREE DISCORD RAIDBOT WITH CUSTOM MESSAGES** https://discord.gg/6AGgHe4MKb`;
        await i.reply({ content: spamText });
        for (let j = 0; j < 4; j++) {
          setTimeout(() => i.followUp({ content: spamText }), 800 * (j + 1));
        }
      }

      if (i.customId === 'custom_message') {
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
        await i.showModal(modal);
      }
    }

    if (i.isModalSubmit() && i.customId === 'custom_modal') {
      const userMessage = i.fields.getTextInputValue('message_input');
      await i.reply({ content: `Spamming your message...`, ephemeral: true });
      for (let j = 0; j < 4; j++) {
        setTimeout(() => i.followUp({ content: userMessage }), 800 * (j + 1));
      }
    }

  } catch (err) {
    console.error('Interaction error:', err);
  }
});

// Keep-alive self-ping
client.login(TOKEN);
setInterval(() => {
  http.get(SELF_URL, (res) => {
    console.log(`Self-pinged ${SELF_URL} - Status: ${res.statusCode}`);
  }).on('error', (err) => {
    console.error('Self-ping error:', err);
  });
}, 240000);
