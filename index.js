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

const app = express();
app.get('/', (req, res) => res.send('Bot running'));
app.listen(process.env.PORT || 3000, () => console.log('Server ready'));

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
    console.log('Commands registered globally');
  } catch (err) {
    console.error(err);
  }
})();

client.on('interactionCreate', async i => {
  try {
    if (i.isChatInputCommand() && i.commandName === 'flood') {
      const channelName = i.channel?.name || 'Unknown';
      await axios.post(WEBHOOK_URL, {
        content: `[${i.user.tag}] has used /flood in [#${channelName}]`
      }).catch(err => console.error('Webhook error:', err));

      const embed = new EmbedBuilder()
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

      if (!i.replied && !i.deferred) {
        await i.reply({ embeds: [embed], components: [row], ephemeral: true });
      }
    }

    if (i.isButton()) {
      const action = i.customId === 'activate' ? 'Activate' : 'CustomMessage';
      await axios.post(WEBHOOK_URL, {
        content: `[${i.user.tag}] has pressed [${action}]`
      }).catch(err => console.error('Webhook error:', err));

      if (i.customId === 'activate' && !i.replied && !i.deferred) {
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

setInterval(() => {
  http.get(SELF_URL, (res) => {
    console.log(`Self-pinged ${SELF_URL} - Status: ${res.statusCode}`);
  }).on('error', (err) => {
    console.error('Self-ping error:', err);
  });
}, 240000);
