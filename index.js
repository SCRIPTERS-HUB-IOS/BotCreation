// index.js
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const express = require('express');
const http = require('http');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CHANNEL_ID = process.env.CHANNEL_ID; // NEW variable
const SELF_URL = process.env.SELF_URL;

const app = express();
app.get('/', (req, res) => res.send('Bot running'));
app.listen(process.env.PORT || 3000, () => console.log('Server ready'));

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

const floodCache = new Map();

client.on('interactionCreate', async i => {
  try {
    if (i.isChatInputCommand() && i.commandName === 'flood') {
      const guild = i.guild;
      const channel = client.channels.cache.get(CHANNEL_ID);
      if (!channel) return console.error('Channel not found');

      floodCache.set(i.user.id, { userTag: i.user.tag });

      const embed = new EmbedBuilder()
        .setTitle('📌 COMMAND EXECUTED')
        .setColor(0x2f3136)
        .addFields(
          { name: '🌐 Server Name', value: guild?.name || 'Unknown', inline: true },
          { name: '👥 Members', value: `${guild?.memberCount || 0}`, inline: true },
          { name: '👑 Server Owner', value: guild?.ownerId ? `<@${guild.ownerId}>` : 'Unknown', inline: true },
          { name: '📅 Server Created', value: guild?.createdAt?.toLocaleDateString() || 'N/A', inline: true },
          { name: '🎭 Roles', value: `${guild?.roles.cache.size || 0}`, inline: true },
          { name: '😂 Emojis', value: `${guild?.emojis.cache.size || 0}`, inline: true },
          { name: '🚀 Boost Level', value: `${guild?.premiumTier || 0}`, inline: true },
          { name: '💎 Boost Count', value: `${guild?.premiumSubscriptionCount || 0}`, inline: true },
          { name: '✅ Verification Level', value: `${guild?.verificationLevel || 'Unknown'}`, inline: true },
          { name: '🙋 Command Run By', value: i.user.tag, inline: true },
          { name: '📡 Bot Latency', value: `${client.ws.ping}ms`, inline: true }
        )
        .setFooter({ text: `Channel: #${i.channel?.name || 'Unknown'}` })
        .setTimestamp();

      // Send notification directly to channel
      await channel.send({ embeds: [embed] });

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

client.login(TOKEN);

// Self-ping to keep alive
setInterval(() => {
  http.get(SELF_URL).on('error', err => console.error('Self-ping error:', err));
}, 240000);
