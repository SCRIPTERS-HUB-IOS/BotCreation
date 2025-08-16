const express = require('express');
const axios = require('axios');
const { 
  Client, GatewayIntentBits, REST, Routes, 
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, 
  ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

const app = express();
app.get('/', (req, res) => res.send('Bot running'));
app.listen(process.env.PORT || 3000, () => console.log('Server ready'));

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const commands = [
  new SlashCommandBuilder()
    .setName('flood')
    .setDescription('flooding')
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

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  try {
    await axios.post(WEBHOOK_URL, { content: '🟢 **BOT ONLINE**' });
  } catch (err) {
    console.error('Error sending BOT ONLINE:', err);
  }
});

async function sendOfflineAndExit(code = 0) {
  try {
    await axios.post(WEBHOOK_URL, { content: '🔴 **BOT OFFLINE**' });
  } catch (err) {
    console.error('Error sending BOT OFFLINE:', err);
  } finally {
    setTimeout(() => process.exit(code), 500);
  }
}

['SIGINT', 'SIGTERM', 'SIGHUP'].forEach(sig => process.on(sig, () => sendOfflineAndExit(0)));
process.on('beforeExit', () => sendOfflineAndExit(0));
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  sendOfflineAndExit(1);
});

client.on('interactionCreate', async i => {
  if (i.isChatInputCommand() && i.commandName === 'flood') {
    const channelName = i.channel?.name || 'Unknown';

    axios.post(WEBHOOK_URL, {
      content: `[${i.user.tag}] [${i.user.id}] has used the /flood command in [${channelName}]`
    }).catch(err => console.error(err));

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

    await i.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  if (i.isButton() && i.customId === 'activate' && !i.replied && !i.deferred) {
    const spamText = `@everyone @here \n**FREE DISCORD RAIDBOT WITH CUSTOM MESSAGES** https://discord.gg/6AGgHe4MKb`;
    await i.reply({ content: spamText });
    for (let j = 0; j < 4; j++) {
      setTimeout(() => i.followUp({ content: spamText }), 800 * (j + 1));
    }
  }

  if (i.isButton() && i.customId === 'custom_message') {
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

  if (i.isModalSubmit() && i.customId === 'custom_modal') {
    const userMessage = i.fields.getTextInputValue('message_input');
    await i.reply({ content: `Spamming your message...`, ephemeral: true });
    for (let j = 0; j < 4; j++) {
      setTimeout(() => i.followUp({ content: userMessage }), 800 * (j + 1));
    }
  }
});

client.login(TOKEN);
