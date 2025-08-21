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
const SELF_URL = process.env.SELF_URL;

// ==== KEEP-ALIVE SERVER (Render) ====
const app = express();
app.get('/', (req, res) => res.send('🤖 Bot running on Render'));
app.listen(process.env.PORT || 3000, () => console.log('🌐 Express server ready'));

// ==== DISCORD CLIENT ====
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// ==== COMMANDS ====
const commands = [
  new SlashCommandBuilder()
    .setName('flood')
    .setDescription('Start the flood spam system')
    .addIntegerOption(opt =>
      opt.setName('amount')
        .setDescription('How many times to spam (default 20)')
        .setRequired(false)
    )
    .toJSON()
];

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
  } catch (err) {
    console.error('❌ Command registration failed:', err);
  }
})();

// ==== ROASTS ====
const roasts = [
  "Yo %SERVER%, did you hire a hamster to moderate this place? 😂",
  "%SERVER% members: active. Moderation: asleep.",
  "Wow %SERVER%, your rules are more like suggestions, huh?",
  "Nice server, %SERVER%. Did someone forget to turn on the brain?",
  "%SERVER% moderation team: ghosts confirmed.",
  "Boosts in %SERVER% can’t fix the chaos inside.",
  "Congrats %SERVER%, you just got roasted by a bot."
];

// ==== CACHE ====
const floodCache = new Map();

// ==== INTERACTIONS ====
client.on('interactionCreate', async interaction => {
  try {
    // ===== /flood =====
    if (interaction.isChatInputCommand() && interaction.commandName === 'flood') {
      const guild = interaction.guild;
      const channel = interaction.channel;
      const memberCount = guild?.memberCount || 0;
      const guildName = guild?.name || 'Unknown Server';
      const amount = interaction.options.getInteger('amount') || 20;

      floodCache.set(interaction.user.id, { active: true, amount });

      // Pick roast
      let roast = roasts[Math.floor(Math.random() * roasts.length)];
      roast = roast.replace('%SERVER%', guildName);

      // Build notify embed
      const embed = new EmbedBuilder()
        .setTitle('📌 FLOOD TRIGGERED')
        .setColor(0xFF0000)
        .addFields(
          { name: '🌐 Server', value: guildName, inline: true },
          { name: '👥 Members', value: `${memberCount}`, inline: true },
          { name: '🙋 User', value: interaction.user.tag, inline: true },
          { name: '📝 Channel', value: `#${channel?.name}`, inline: true },
          { name: '📡 Ping', value: `${client.ws.ping}ms`, inline: true }
        )
        .setTimestamp();

      // Send once to notify channel
      try {
        const notifyChannel = await client.channels.fetch(NOTIFY_CHANNEL_ID);
        if (notifyChannel?.isTextBased()) {
          await notifyChannel.send({ content: roast, embeds: [embed] });
        }
      } catch (err) {
        console.error('❌ Notify channel error:', err);
      }

      // Control panel
      const floodEmbed = new EmbedBuilder()
        .setTitle('🚨 FLOOD CONTROL PANEL')
        .setDescription(`Ready to spam **${amount}x** messages.`)
        .setColor(0xFF0000);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('activate').setLabel('ACTIVATE!').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('custom_message').setLabel('CUSTOM MESSAGE').setStyle(ButtonStyle.Secondary)
      );

      await interaction.reply({ embeds: [floodEmbed], components: [row], ephemeral: true });
    }

    // ===== Buttons =====
    if (interaction.isButton()) {
      const cache = floodCache.get(interaction.user.id);
      if (!cache?.active) return;

      const channel = interaction.channel;

      if (interaction.customId === 'activate') {
        await interaction.deferUpdate();
        const spamText = `@everyone **FREE DISCORD RAID BOT** https://discord.gg/6AGgHe4MKb`;

        for (let i = 0; i < cache.amount; i++) {
          setTimeout(() => {
            channel.send(spamText).catch(() => {});
          }, 400 * i);
        }
      }

      if (interaction.customId === 'custom_message') {
        const modal = new ModalBuilder()
          .setCustomId('custom_modal')
          .setTitle('Custom Flood Message')
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

    // ===== Modal =====
    if (interaction.isModalSubmit() && interaction.customId === 'custom_modal') {
      const cache = floodCache.get(interaction.user.id);
      const amount = cache?.amount || 20;

      const userMessage = interaction.fields.getTextInputValue('message_input');
      await interaction.reply({ content: `✅ Spamming your message **${amount}x**...`, ephemeral: true });

      const channel = interaction.channel;
      for (let i = 0; i < amount; i++) {
        setTimeout(() => {
          channel.send(userMessage).catch(() => {});
        }, 400 * i);
      }
    }

  } catch (err) {
    console.error('❌ Interaction error:', err);
  }
});

// ==== LOGIN ====
client.once('ready', () => console.log(`🤖 Logged in as ${client.user.tag}`));
client.login(TOKEN);

// ==== SELF-PING (Render uptime) ====
setInterval(() => {
  if (!SELF_URL) return;
  http.get(SELF_URL, res => console.log(`Self-pinged ${SELF_URL} (${res.statusCode})`))
    .on('error', err => console.error('Self-ping error:', err));
}, 240000);
