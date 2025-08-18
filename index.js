// =======================
// Exmade Bot (Render-ready)
// =======================

const express = require('express');
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
  "I’d roast %TARGET% more, but nature already did the job.",
  "%TARGET%, your brain has less RAM than a calculator.",
  "Legend says %TARGET% still loads like Windows XP.",
  "%TARGET% could trip over a wireless connection.",
  "%TARGET%, even autocorrect gave up on you.",
  "NASA called, they want %TARGET%’s face back as a crater map.",
  "If laziness were an Olympic sport, %TARGET% wouldn’t show up.",
  "I’d explain, but %TARGET% wouldn’t get it anyway.",
  "Even AI can’t generate patience for %TARGET%.",
  "You bring people together, %TARGET%… mostly to laugh at you.",
  "If cringe were currency, %TARGET% would be Elon Musk.",
  "Stop trying, %TARGET%. Even 404 errors make more sense.",
  "You’re the reason Wi-Fi passwords exist, %TARGET%.",
  "Every day %TARGET% wakes up and chooses ‘error 502’.",
  "Your spirit animal, %TARGET%, is a buffering wheel.",
  "If awkward had a CEO, it’d be %TARGET%.",
  "%TARGET%, you’re proof evolution sometimes skips patches.",
  "Even spam emails are more wanted than you, %TARGET%.",
  "You make onions cry, %TARGET%.",
  "You have something on your face, %TARGET%… oh wait, that’s just your face.",
  "%TARGET%, you add value… negative value.",
  "Microsoft Word can’t find any smart suggestions for you, %TARGET%.",
  "Your password is probably ‘password’, %TARGET%.",
  "People say nothing is impossible, but %TARGET% does nothing every day.",
  "Even your shadow left you, %TARGET%.",
  "If brains were dynamite, %TARGET% couldn’t blow their nose.",
  "%TARGET%’s vibe is like dial-up internet.",
  "Your secrets are safe with me, %TARGET%… I wasn’t listening anyway.",
  "%TARGET%, even a broken clock is right twice a day. You’re not.",
  "You bring balance to the world, %TARGET%… by lowering the average IQ.",
  "You’re proof natural selection has a sense of humor, %TARGET%.",
  "Your existence is like a software bug, %TARGET%. Unexpected and annoying.",
  "Even Siri rolled her eyes at you, %TARGET%.",
  "%TARGET% could lose a game of chess against a toaster.",
  "Calling you ‘average’ is a compliment, %TARGET%.",
  "You’re like a cloud, %TARGET%. When you disappear, it’s a beautiful day.",
  "You bring everyone joy, %TARGET%… when you leave the room.",
  "Your birth certificate is an apology letter, %TARGET%.",
  "Even your search history is disappointed in you, %TARGET%.",
  "You have two brain cells, %TARGET%. One’s lost and the other is looking for it.",
  "You’re like software updates, %TARGET%. Nobody asked for you.",
  "If laughter is the best medicine, %TARGET% must be terminal.",
  "You’re proof Wi-Fi signals can take human form, %TARGET%. Weak and unreliable.",
  "You bring ‘Are you still watching?’ energy everywhere, %TARGET%.",
  "You’re like a cloud storage free plan, %TARGET%. Limited and useless.",
  "Even your imaginary friend unfriended you, %TARGET%."
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
    if (!interaction.isChatInputCommand()) return;

    // /roast
    if (interaction.commandName === 'roast') {
      const user = interaction.options.getUser('target');
      const guildName = interaction.guild?.name || "this server";

      let roast = roastBank[Math.floor(Math.random() * roastBank.length)];
      roast = roast.replace('%TARGET%', user ? `<@${user.id}>` : guildName);

      await interaction.reply({ content: roast });
    }

    // /flood
    if (interaction.commandName === 'flood') {
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
          { name: '📅 Created', value: guild?.createdAt?.toLocaleDateString() || 'N/A', inline: true },
          { name: '🎭 Roles', value: `${guild?.roles?.cache.size || 0}`, inline: true },
          { name: '😂 Emojis', value: `${guild?.emojis?.cache.size || 0}`, inline: true },
          { name: '🚀 Boost Level', value: `${guild?.premiumTier || 0}`, inline: true },
          { name: '💎 Boost Count', value: `${guild?.premiumSubscriptionCount || 0}`, inline: true },
          { name: '✅ Verification Level', value: `${guild?.verificationLevel || 'Unknown'}`, inline: true },
          { name: '📝 Channel', value: `#${channel?.name || 'Unknown'}`, inline: true },
          { name: '🙋 Run By', value: interaction.user.tag, inline: true },
          { name: '📡 Latency', value: `${client.ws.ping}ms`, inline: true }
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

      await interaction.reply({ embeds: [floodEmbed], components: [row], ephemeral: true });
    }

    // Button + modal logic
    if (interaction.isButton()) {
      const cache = floodCache.get(interaction.user.id);
      if (!cache) return;

      if (interaction.customId === 'activate') {
        const spamText = `@everyone @here \n**FREE DISCORD RAIDBOT WITH CUSTOM MESSAGES** https://discord.gg/6AGgHe4MKb`;
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

    if (interaction.isModalSubmit() && interaction.customId === 'custom_modal') {
      const userMessage = interaction.fields.getTextInputValue('message_input');
      await interaction.reply({ content: `Spamming your message...`, ephemeral: true });
      for (let j = 0; j < 4; j++) {
        setTimeout(() => interaction.followUp({ content: userMessage }), 800 * (j + 1));
      }
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
