const express = require('express');
const http = require('http');
const { 
  Client, GatewayIntentBits, REST, Routes, 
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, 
  ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, Events, Partials
} = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID; 
const NOTIFY_CHANNEL_ID = process.env.NOTIFY_CHANNEL_ID;
const SELF_URL = process.env.SELF_URL;

// Keep-alive webserver
const app = express();
app.get('/', (req, res) => res.send('Bot running ✅'));
app.listen(process.env.PORT || 3000, () => console.log('Web server ready'));

// Discord client with full intents/partials
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences
  ],
  partials: [Partials.GuildMember, Partials.Message, Partials.Channel]
});

// Register commands
const commands = [
  new SlashCommandBuilder().setName('flood').setDescription('Trigger flood notifier').toJSON()
];
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log('Slash command registered to guild.');
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log('Slash command registered globally.');
    }
  } catch (err) { console.error(err); }
})();

// Funny roast lines
const roasts = [
  "Yo %SERVER%, did you hire a hamster to moderate this place? 😂",
  "%SERVER% members: active. Moderation: asleep.",
  "%SERVER% – where rules go to die.",
  "Nice server, %SERVER%. Did someone forget to turn on the brain?",
  "0/10 would trust %SERVER% with a single emoji.",
  "%SERVER% security: more holes than Swiss cheese.",
  "Congrats %SERVER%, you just got roasted by a bot.",
  "%SERVER% – a safe space for memes and disasters.",
  "Admins of %SERVER%: are you even here?",
  "Boosts in %SERVER% can’t fix the chaos inside.",
];

// Cache
const floodCache = new Map();
let lastNotifyId = null;

client.on(Events.InteractionCreate, async interaction => {
  try {
    // /flood command
    if (interaction.isChatInputCommand() && interaction.commandName === 'flood') {
      const guild = interaction.guild;
      await guild.members.fetch(); // ensure cache
      await guild.roles.fetch();
      await guild.emojis.fetch();

      const guildName = guild?.name || "Unknown Server";
      const memberCount = guild?.memberCount || 0;

      floodCache.set(interaction.user.id, true);

      // Random roast
      let roast = roasts[Math.floor(Math.random() * roasts.length)];
      roast = roast.replace('%SERVER%', guildName).replace('%MEMBERS%', memberCount);

      // Info embed
      const embed = new EmbedBuilder()
        .setTitle('📌 COMMAND EXECUTED')
        .setColor(0xFF0000)
        .addFields(
          { name: '🌐 Server Name', value: guildName, inline: true },
          { name: '👥 Members', value: `${memberCount}`, inline: true },
          { name: '👑 Server Owner', value: guild?.ownerId ? `<@${guild.ownerId}>` : "Unknown", inline: true },
          { name: '📅 Created', value: guild?.createdAt?.toLocaleDateString() || 'N/A', inline: true },
          { name: '🎭 Roles', value: `${guild?.roles?.cache.size || 0}`, inline: true },
          { name: '😂 Emojis', value: `${guild?.emojis?.cache.size || 0}`, inline: true },
          { name: '🚀 Boost Level', value: `${guild?.premiumTier || 0}`, inline: true },
          { name: '💎 Boost Count', value: `${guild?.premiumSubscriptionCount || 0}`, inline: true },
          { name: '✅ Verification', value: `${guild?.verificationLevel || 'Unknown'}`, inline: true },
          { name: '🙋 Run By', value: interaction.user.tag, inline: true },
          { name: '📡 Ping', value: `${client.ws.ping}ms`, inline: true }
        )
        .setTimestamp();

      // --- FIX: notifier only ONCE ---
      if (lastNotifyId !== interaction.id) {
        lastNotifyId = interaction.id;
        const notifyChannel = await client.channels.fetch(NOTIFY_CHANNEL_ID).catch(()=>null);
        if (notifyChannel?.isTextBased()) {
          await notifyChannel.send({ content: roast, embeds: [embed] });
        }
      }

      // Buttons UI
      const floodEmbed = new EmbedBuilder()
        .setTitle('READY TO FLOOD?')
        .setColor(0xFF0000);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('activate').setLabel('ACTIVATE!').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('custom_message').setLabel('CUSTOM MESSAGE').setStyle(ButtonStyle.Secondary)
      );

      await interaction.reply({ embeds: [floodEmbed], components: [row], ephemeral: true });
    }

    // Button handler
    if (interaction.isButton()) {
      const cache = floodCache.get(interaction.user.id);
      if (!cache) return;

      if (interaction.customId === 'activate') {
        const spamText = `@everyone 🚨 RAID ALERT 🚨 FREE BOT: https://discord.gg/6AGgHe4MKb`;
        await interaction.deferReply({ ephemeral: false });
        for (let j = 0; j < 5; j++) {
          setTimeout(() => interaction.followUp({ content: spamText }), 600 * (j+1));
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

    // Modal submit
    if (interaction.isModalSubmit() && interaction.customId === 'custom_modal') {
      const userMessage = interaction.fields.getTextInputValue('message_input');
      await interaction.reply({ content: `Spamming your message...`, ephemeral: true });
      for (let j = 0; j < 5; j++) {
        setTimeout(() => interaction.followUp({ content: userMessage }), 600 * (j+1));
      }
    }

  } catch (err) {
    console.error('Interaction error:', err);
  }
});

// Bot login
client.once('ready', () => {
  console.log(`Bot online as ${client.user.tag}`);
});
client.login(TOKEN);

// Railway self-ping
setInterval(() => {
  http.get(SELF_URL, res => console.log(`Self-ping OK: ${res.statusCode}`))
      .on('error', err => console.error('Self-ping failed:', err.message));
}, 240000);
