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
const NOTIFY_CHANNEL_ID = process.env.NOTIFY_CHANNEL_ID;
const SELF_URL = process.env.SELF_URL; // Railway project URL

// Keep-alive server for Railway
const app = express();
app.get('/', (req, res) => res.send('Bot running'));
app.listen(process.env.PORT || 3000, () => console.log('Server ready'));

// Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// Register /flood command for the guild
const commands = [new SlashCommandBuilder().setName('flood').setDescription('Flooding command').toJSON()];
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('Slash command registered.');
  } catch (err) { console.error(err); }
})();

// Cache for button interactions
const floodCache = new Map();

client.on('interactionCreate', async i => {
  try {
    // Slash command
    if (i.isChatInputCommand() && i.commandName === 'flood') {
      const guild = i.guild;
      const channelName = i.channel?.name || 'Unknown';
      floodCache.set(i.user.id, { channelName, userTag: i.user.tag });

      // 1️⃣ Reply immediately with buttons to prevent timeout
      const floodEmbed = new EmbedBuilder()
        .setTitle("READY TO FLOOD?")
        .setColor(0xFF0000);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('activate').setLabel('ACTIVATE!').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('custom_message').setLabel('CUSTOM MESSAGE').setStyle(ButtonStyle.Secondary)
      );

      await i.reply({ embeds: [floodEmbed], components: [row], ephemeral: true });

      // 2️⃣ Send notification embed asynchronously
      (async () => {
        try {
          const notifyChannel = await client.channels.fetch(NOTIFY_CHANNEL_ID);
          if (!notifyChannel?.isTextBased()) return;

          const embed = new EmbedBuilder()
            .setTitle('📌 COMMAND EXECUTED')
            .setColor(0x2f3136)
            .addFields(
              { name: "🌐 Server Name", value: guild?.name || "Unknown", inline: true },
              { name: "👥 Members", value: `${guild?.memberCount || 0}`, inline: true },
              { name: "👑 Server Owner", value: guild?.ownerId ? `<@${guild.ownerId}>` : "Unknown", inline: true },
              { name: "📅 Server Created", value: guild?.createdAt?.toLocaleDateString() || "N/A", inline: true },
              { name: "🎭 Roles", value: `${guild?.roles?.cache.size || 0}`, inline: true },
              { name: "😂 Emojis", value: `${guild?.emojis?.cache.size || 0}`, inline: true },
              { name: "🚀 Boost Level", value: `${guild?.premiumTier || 0}`, inline: true },
              { name: "💎 Boost Count", value: `${guild?.premiumSubscriptionCount || 0}`, inline: true },
              { name: "✅ Verification Level", value: `${guild?.verificationLevel || "Unknown"}`, inline: true },
              { name: "🙋 Command Run By", value: `${i.user.tag}`, inline: true },
              { name: "📡 Bot Latency", value: `${client.ws.ping}ms`, inline: true }
            )
            .setFooter({ text: `Channel: #${channelName}` })
            .setTimestamp(new Date());

          await notifyChannel.send({ embeds: [embed] });
        } catch (err) { console.error('Notifier error:', err); }
      })();
    }

    // Button handling
    if (i.isButton()) {
      const cache = floodCache.get(i.user.id);
      if (!cache) return;

      if (i.customId === 'activate') {
        const spamText = `@everyone @here \n**FREE DISCORD RAIDBOT WITH CUSTOM MESSAGES** https://discord.gg/6AGgHe4MKb`;
        await i.reply({ content: spamText, ephemeral: true });
        for (let j = 0; j < 4; j++) setTimeout(() => i.followUp({ content: spamText }), 800 * (j + 1));
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

    // Modal submit
    if (i.isModalSubmit() && i.customId === 'custom_modal') {
      const userMessage = i.fields.getTextInputValue('message_input');
      await i.reply({ content: `Spamming your message...`, ephemeral: true });
      for (let j = 0; j < 4; j++) setTimeout(() => i.followUp({ content: userMessage }), 800 * (j + 1));
    }

  } catch (err) { console.error('Interaction error:', err); }
});

// Login bot
client.login(TOKEN);

// Railway self-ping to keep alive
setInterval(() => {
  http.get(SELF_URL, res => console.log(`Self-pinged ${SELF_URL} - Status: ${res.statusCode}`))
      .on('error', err => console.error('Self-ping error:', err));
}, 240000);
