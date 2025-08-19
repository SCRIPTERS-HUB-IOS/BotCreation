// =======================
// Exmade Bot (Render-ready)
// =======================

const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { 
  Client, GatewayIntentBits, REST, Routes, 
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, 
  ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID; 
const NOTIFY_CHANNEL_ID = process.env.NOTIFY_CHANNEL_ID;
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;

// -----------------------
// Express keep-alive server
// -----------------------
const app = express();
app.get('/', (req, res) => res.send('Bot is online!'));
app.listen(process.env.PORT || 3000, () => console.log('✅ Web server ready for Render'));

// -----------------------
// Discord client
// -----------------------
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers
  ]
});

// -----------------------
// Commands
// -----------------------
const commands = [
  new SlashCommandBuilder()
    .setName('flood')
    .setDescription('Flooding command'),
  new SlashCommandBuilder()
    .setName('roast')
    .setDescription('Roast a user or the server')
    .addUserOption(opt =>
      opt.setName('target')
        .setDescription('User to roast')
        .setRequired(false)
    )
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log('✅ Slash commands registered to guild.');
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log('✅ Slash commands registered globally.');
    }
  } catch (err) { console.error(err); }
})();

// -----------------------
// Roast Bank (50+ roasts)
// -----------------------
const roastBank = [
  "Hey %TARGET%, even Google doesn’t have what you’re looking for: common sense.",
  "%TARGET%’s typing speed is 200 errors per minute.",
  "%TARGET%, if ignorance is bliss, you must be the happiest person alive.",
  "Mirror sales drop whenever %TARGET% walks by.",
  // ... (rest unchanged, keep your full 50)
];

// -----------------------
// Flood cache
// -----------------------
const floodCache = new Map();

// -----------------------
// Interaction handler
// -----------------------
client.on('interactionCreate', async interaction => {
  try {
    // /roast
    if (interaction.isChatInputCommand() && interaction.commandName === 'roast') {
      const user = interaction.options.getUser('target');
      const guildName = interaction.guild?.name || "this server";

      let roast = roastBank[Math.floor(Math.random() * roastBank.length)];
      roast = roast.replace('%TARGET%', user ? `<@${user.id}>` : guildName);

      return interaction.reply({ content: roast });
    }

    // /flood
    if (interaction.isChatInputCommand() && interaction.commandName === 'flood') {
      const guild = interaction.guild;
      const channel = interaction.channel;
      const memberCount = guild?.memberCount || 0;
      const guildName = guild?.name || "Unknown Server";

      floodCache.set(interaction.user.id, true);

      let roast = roastBank[Math.floor(Math.random() * roastBank.length)];
      roast = roast.replace('%TARGET%', guildName);

      const embed = new EmbedBuilder()
        .setTitle('📌 COMMAND EXECUTED')
        .setColor(0xFF0000)
        .addFields(
          { name: '🌐 Server Name', value: guildName, inline: true },
          { name: '👥 Members', value: `${memberCount}`, inline: true },
          { name: '👑 Owner', value: guild?.ownerId ? `<@${guild.ownerId}>` : "Unknown", inline: true },
          { name: '📝 Channel', value: `#${channel?.name || 'Unknown'}`, inline: true },
          { name: '🙋 Run By', value: interaction.user.tag, inline: true }
        )
        .setTimestamp(new Date());

      const notifyChannel = await client.channels.fetch(NOTIFY_CHANNEL_ID);
      if (notifyChannel?.isTextBased()) {
        await notifyChannel.send({ content: roast, embeds: [embed] });
      }

      const floodEmbed = new EmbedBuilder()
        .setTitle('READY TO FLOOD?')
        .setColor(0xFF0000);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('activate').setLabel('ACTIVATE!').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('custom_message').setLabel('CUSTOM MESSAGE').setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({ embeds: [floodEmbed], components: [row], ephemeral: true });
    }

    // Button pressed
    if (interaction.isButton()) {
      const cache = floodCache.get(interaction.user.id);
      if (!cache) return;

      if (interaction.customId === 'activate') {
        await interaction.deferReply({ ephemeral: true });
        const spamText = `@everyone @here \n**FREE DISCORD RAIDBOT WITH CUSTOM MESSAGES** https://discord.gg/6AGgHe4MKb`;
        await interaction.channel.send(spamText); // ✅ send once
        return interaction.editReply({ content: "✅ Spam sent once." });
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
        return interaction.showModal(modal);
      }
    }

    // Modal submit
    if (interaction.isModalSubmit() && interaction.customId === 'custom_modal') {
      const userMessage = interaction.fields.getTextInputValue('message_input');
      await interaction.reply({ content: "✅ Custom spam sent once.", ephemeral: true });
      return interaction.channel.send(userMessage); // ✅ only once
    }

  } catch (err) {
    console.error("Interaction error:", err);
  }
});

// -----------------------
// Self-Ping for Render
// -----------------------
async function selfPing() {
  if (!RENDER_EXTERNAL_URL) return console.log("⚠️ No RENDER_EXTERNAL_URL set.");
  try {
    const res = await fetch(RENDER_EXTERNAL_URL);
    console.log(`🔁 Pinged ${RENDER_EXTERNAL_URL} | ${res.status}`);
  } catch (err) {
    console.error("Self-ping error:", err);
  }
}

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  setInterval(selfPing, 5 * 60 * 1000);
});

// -----------------------
// Login
// -----------------------
client.login(TOKEN);
