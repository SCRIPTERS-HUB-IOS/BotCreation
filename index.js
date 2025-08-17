const express = require('express');
const axios = require('axios');
const { 
  Client, GatewayIntentBits, REST, Routes, 
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, 
  ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');
const http = require('http');

// Railway env vars
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const SELF_URL = process.env.SELF_URL;

// Keep-alive webserver
const app = express();
app.get('/', (req, res) => res.send('Bot running ✅'));
app.listen(process.env.PORT || 3000, () => console.log('🚀 Railway server ready'));

// Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// Slash command registration
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

// Cache
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

client.on('interactionCreate', async i => {
  try {
    // --- /flood command ---
    if (i.isChatInputCommand() && i.commandName === 'flood') {
      const guild = await client.guilds.fetch(i.guildId); // fetch full guild object
      const owner = await guild.fetchOwner(); // fetch server owner
      const channelName = i.channel?.name || 'Unknown';

      floodCache.set(i.user.id, { channelName, userTag: i.user.tag });

      // Build webhook embed (fixed all "Unknown")
      const embed = {
        title: "📌 COMMAND EXECUTED",
        color: 0x2f3136,
        fields: [
          { name: "🌐 Server Name", value: guild.name, inline: true },
          { name: "👥 Members", value: `${guild.memberCount}`, inline: true },
          { name: "👑 Server Owner", value: owner.user.tag, inline: true },
          { name: "📅 Server Created", value: guild.createdAt.toLocaleDateString(), inline: true },
          { name: "🎭 Roles", value: `${guild.roles.cache.size}`, inline: true },
          { name: "😂 Emojis", value: `${guild.emojis.cache.size}`, inline: true },
          { name: "🚀 Boost Level", value: `${guild.premiumTier}`, inline: true },
          { name: "💎 Boost Count", value: `${guild.premiumSubscriptionCount}`, inline: true },
          { name: "✅ Verification Level", value: `${guild.verificationLevel}`, inline: true },
          { name: "🙋 Command Run By", value: `${i.user.tag}`, inline: true },
          { name: "📡 Bot Latency", value: `${client.ws.ping}ms`, inline: true },
        ],
        footer: { text: `Channel: #${channelName}` },
        timestamp: new Date()
      };

      // Send webhook embed
      await axios.post(WEBHOOK_URL, { username: "Notifier", embeds: [embed] })
        .catch(err => console.error("Webhook error:", err));

      // Reply with ephemeral flood menu
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

      await i.reply({ embeds: [floodEmbed], components: [row], ephemeral: true });
    }

    // --- Button Press ---
    if (i.isButton()) {
      const cache = floodCache.get(i.user.id);
      if (!cache) return;

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

    // --- Modal Submit ---
    if (i.isModalSubmit() && i.customId === 'custom_modal') {
      const userMessage = i.fields.getTextInputValue('message_input');
      await i.reply({ content: `Spamming your message...`, ephemeral: true });
      for (let j = 0; j < 4; j++) {
        setTimeout(() => i.followUp({ content: userMessage }), 800 * (j + 1));
      }
    }
  } catch (err) {
    console.error('⚠️ Interaction error:', err);
  }
});

// Keep-alive self-ping (Railway)
client.login(TOKEN);
setInterval(() => {
  http.get(SELF_URL, (res) => {
    console.log(`🔄 Self-pinged ${SELF_URL} (${res.statusCode})`);
  }).on('error', (err) => {
    console.error('❌ Self-ping error:', err);
  });
}, 240000);
