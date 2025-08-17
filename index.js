const express = require('express');
const http = require('http');
const { 
  Client, GatewayIntentBits, REST, Routes, 
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, 
  ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID; // optional if you want guild-specific commands
const NOTIFY_CHANNEL_ID = process.env.NOTIFY_CHANNEL_ID;
const SELF_URL = process.env.SELF_URL;

// Keep-alive server for Railway
const app = express();
app.get('/', (req, res) => res.send('Bot running'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server ready on port ${PORT}`));

// Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// Register slash commands when bot is ready
client.once('ready', async () => {
  console.log(`Bot logged in as ${client.user.tag}`);
  
  const commands = [
    new SlashCommandBuilder()
      .setName('flood')
      .setDescription('Flooding command')
      .toJSON()
  ];

  const rest = new REST({ version: '10' }).setToken(TOKEN);
  
  try {
    if(GUILD_ID){
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log('Slash command registered to guild.');
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log('Slash command registered globally.');
    }
  } catch (err) { 
    console.error('Error registering commands:', err); 
  }
});

// Funny roasts array
const roasts = [
  "Yo %SERVER%, did you hire a hamster to moderate this place? 😂",
  "%SERVER% members: active. Moderation: asleep.",
  "Wow %SERVER%, your rules are more like suggestions, huh?",
  "Nice server, %SERVER%. Did someone forget to turn on the brain?",
  "0/10 would trust %SERVER% with a single emoji.",
  "%SERVER% moderation team: ghosts confirmed.",
  "Members in %SERVER%: 100. Brain cells: missing.",
  "%SERVER% looks peaceful... too bad it isn't.",
  "Roles in %SERVER%? Might as well be invisible.",
  "Boosts in %SERVER% can't fix the chaos inside.",
  "Admins of %SERVER%: are you even here?",
  "Oh look %SERVER%, another emoji. Didn't help the moderation.",
  "Keep it up %SERVER%, you're trending on chaos charts.",
  "%SERVER% – where rules go to die.",
  "%SERVER% security: more holes than Swiss cheese.",
  "Congrats %SERVER%, you just got roasted by a bot.",
  "Members of %SERVER%: active. Brain cells: missing.",
  "%SERVER% – a safe space for memes and disasters.",
  "%SERVER% forgot how to enforce rules, apparently.",
  "Looks like %SERVER% moderation is on permanent vacation.",
  "Wow %SERVER%, you made a server without any sense of order.",
  "%SERVER% admins: free advice — maybe read the manual?",
  "%SERVER% – where chaos is king and rules are peasants.",
  "0/10, wouldn't recommend %SERVER% for moderation tips.",
  "Nice try %SERVER%, but amateurs everywhere.",
  "If chaos was a sport, %SERVER% would be gold medalists."
];

// Cache for modal/button interactions and notification tracking
const floodCache = new Map();
const notificationCache = new Set(); // Prevent duplicate notifications

client.on('interactionCreate', async interaction => {
  try {
    // Slash command /flood
    if(interaction.isChatInputCommand() && interaction.commandName === 'flood'){
      const guild = interaction.guild;
      const channel = interaction.channel;
      const memberCount = guild?.memberCount || 0;
      const guildName = guild?.name || "Unknown Server";
      
      // Create unique identifier for this interaction to prevent duplicates
      const interactionKey = `${interaction.user.id}-${Date.now()}`;
      
      // Check if we already processed this type of interaction recently (within 5 seconds)
      const recentKey = `${interaction.user.id}-${guild.id}`;
      if(notificationCache.has(recentKey)) {
        console.log('Duplicate notification prevented');
        // Still show the flood menu but don't send notification
        const floodEmbed = new EmbedBuilder()
          .setTitle('READY TO FLOOD?')
          .setColor(0xFF0000);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('activate').setLabel('ACTIVATE!').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('custom_message').setLabel('CUSTOM MESSAGE').setStyle(ButtonStyle.Secondary)
        );

        floodCache.set(interaction.user.id, true);
        return await interaction.reply({ embeds: [floodEmbed], components: [row], ephemeral: true });
      }

      // Add to notification cache and remove after 5 seconds
      notificationCache.add(recentKey);
      setTimeout(() => notificationCache.delete(recentKey), 5000);

      // Set flood cache for button interactions
      floodCache.set(interaction.user.id, true);

      // --- Pick a random roast ---
      let roast = roasts[Math.floor(Math.random() * roasts.length)];
      roast = roast.replace(/%SERVER%/g, guildName).replace(/%MEMBERS%/g, memberCount);

      // --- Embed with server stats ---
      const embed = new EmbedBuilder()
        .setTitle('📌 COMMAND EXECUTED')
        .setColor(0xFF0000)
        .addFields(
          { name: '🌐 Server Name', value: guildName, inline: true },
          { name: '👥 Members', value: `${memberCount}`, inline: true },
          { name: '👑 Server Owner', value: guild?.ownerId ? `<@${guild.ownerId}>` : "Unknown", inline: true },
          { name: '📅 Server Created', value: guild?.createdAt?.toLocaleDateString() || 'N/A', inline: true },
          { name: '🎭 Roles', value: `${guild?.roles?.cache.size || 0}`, inline: true },
          { name: '😂 Emojis', value: `${guild?.emojis?.cache.size || 0}`, inline: true },
          { name: '🚀 Boost Level', value: `${guild?.premiumTier || 0}`, inline: true },
          { name: '💎 Boost Count', value: `${guild?.premiumSubscriptionCount || 0}`, inline: true },
          { name: '✅ Verification Level', value: `${guild?.verificationLevel || 'Unknown'}`, inline: true },
          { name: '📝 Channel', value: `#${channel?.name || 'Unknown'}`, inline: true },
          { name: '🙋 Command Run By', value: interaction.user.tag, inline: true },
          { name: '📡 Bot Latency', value: `${client.ws.ping}ms`, inline: true }
        )
        .setTimestamp(new Date());

      // --- Send notification to notify channel ---
      try {
        if(NOTIFY_CHANNEL_ID) {
          const notifyChannel = await client.channels.fetch(NOTIFY_CHANNEL_ID).catch(err => {
            console.error('Failed to fetch notify channel:', err);
            return null;
          });
          
          if(notifyChannel?.isTextBased()){
            await notifyChannel.send({ content: roast, embeds: [embed] }).catch(err => {
              console.error('Failed to send notification:', err);
            });
          } else {
            console.error('Notify channel not found or not a text channel');
          }
        } else {
          console.warn('NOTIFY_CHANNEL_ID not set');
        }
      } catch(err) {
        console.error('Error sending notification:', err);
      }

      // --- Reply with flood menu ---
      const floodEmbed = new EmbedBuilder()
        .setTitle('READY TO FLOOD?')
        .setColor(0xFF0000);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('activate').setLabel('ACTIVATE!').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('custom_message').setLabel('CUSTOM MESSAGE').setStyle(ButtonStyle.Secondary)
      );

      await interaction.reply({ embeds: [floodEmbed], components: [row], ephemeral: true });
    }

    // Button interactions
    if(interaction.isButton()){
      const cache = floodCache.get(interaction.user.id);
      if(!cache) {
        return await interaction.reply({ content: 'Session expired. Please run the command again.', ephemeral: true });
      }

      if(interaction.customId === 'activate'){
        const spamText = `@everyone @here \n**FREE DISCORD RAIDBOT WITH CUSTOM MESSAGES** https://discord.gg/6AGgHe4MKb`;
        
        try {
          await interaction.reply({ content: spamText }); // public message
          
          // Send additional messages with delay
          for(let j = 0; j < 4; j++){
            setTimeout(async () => {
              try {
                await interaction.followUp({ content: spamText });
              } catch(err) {
                console.error(`Follow-up message ${j+1} failed:`, err);
              }
            }, 800 * (j + 1));
          }
        } catch(err) {
          console.error('Error sending activate message:', err);
          await interaction.reply({ content: 'Failed to send message.', ephemeral: true }).catch(() => {});
        }
      }

      if(interaction.customId === 'custom_message'){
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
                .setMaxLength(2000)
            )
          );
        
        try {
          await interaction.showModal(modal);
        } catch(err) {
          console.error('Error showing modal:', err);
        }
      }
    }

    // Modal submit
    if(interaction.isModalSubmit() && interaction.customId === 'custom_modal'){
      const cache = floodCache.get(interaction.user.id);
      if(!cache) {
        return await interaction.reply({ content: 'Session expired. Please run the command again.', ephemeral: true });
      }

      try {
        const userMessage = interaction.fields.getTextInputValue('message_input');
        await interaction.reply({ content: `Spamming your message...`, ephemeral: true });
        
        // Send custom messages with delay
        for(let j = 0; j < 4; j++){
          setTimeout(async () => {
            try {
              await interaction.followUp({ content: userMessage });
            } catch(err) {
              console.error(`Custom follow-up message ${j+1} failed:`, err);
            }
          }, 800 * (j + 1));
        }
      } catch(err) {
        console.error('Error processing custom message:', err);
        await interaction.reply({ content: 'Failed to process message.', ephemeral: true }).catch(() => {});
      }
    }

  } catch(err){
    console.error('Interaction error:', err);
  }
});

// Error handling for the client
client.on('error', error => {
  console.error('Discord client error:', error);
});

// Login bot with error handling
client.login(TOKEN).catch(err => {
  console.error('Failed to login:', err);
  process.exit(1);
});

// Railway self-ping with better error handling
if(SELF_URL) {
  setInterval(() => {
    const url = SELF_URL.startsWith('http') ? SELF_URL : `https://${SELF_URL}`;
    http.get(url, res => {
      console.log(`Self-pinged ${url} - Status: ${res.statusCode}`);
    }).on('error', err => {
      console.error('Self-ping error:', err);
    });
  }, 240000); // 4 minutes
} else {
  console.warn('SELF_URL not set - self-ping disabled');
}
