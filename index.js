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
const SELF_URL = process.env.RENDER_EXTERNAL_URL; // ✅ Render uses this instead of manual SELF_URL

// Keep-alive server for Render
const app = express();
app.get('/', (req, res) => res.send('Bot running'));
app.listen(process.env.PORT || 3000, () => console.log('Server ready'));

// Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// Register /flood command
const commands = [new SlashCommandBuilder().setName('flood').setDescription('Flooding command').toJSON()];
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    if(GUILD_ID){
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log('Slash command registered to guild.');
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log('Slash command registered globally.');
    }
  } catch (err) { console.error(err); }
})();

// Funny roasts array
const roasts = [
  "Yo %SERVER%, did you hire a hamster to moderate this place? 😂",
  "%SERVER% members: active. Moderation: asleep.",
  "Wow %SERVER%, your rules are more like suggestions, huh?",
  "Nice server, %SERVER%. Did someone forget to turn on the brain?",
  "0/10 would trust %SERVER% with a single emoji.",
  "%SERVER% moderation team: ghosts confirmed.",
  "Members in %SERVER%: 100. Brain cells: missing.",
  "%SERVER% looks peaceful... too bad it isn’t.",
  "Roles in %SERVER%? Might as well be invisible.",
  "Boosts in %SERVER% can’t fix the chaos inside.",
  "Admins of %SERVER%: are you even here?",
  "Oh look %SERVER%, another emoji. Didn’t help the moderation.",
  "Keep it up %SERVER%, you’re trending on chaos charts.",
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
  "0/10, wouldn’t recommend %SERVER% for moderation tips.",
  "Nice try %SERVER%, but amateurs everywhere.",
  "If chaos was a sport, %SERVER% would be gold medalists."
];

// Cache for modal/button interactions
const floodCache = new Map();

client.on('interactionCreate', async interaction => {
  try {
    // Slash command /flood
    if(interaction.isChatInputCommand() && interaction.commandName === 'flood'){
      const guild = interaction.guild;
      const channel = interaction.channel;
      const memberCount = guild?.memberCount || 0;
      const guildName = guild?.name || "Unknown Server";

      // Prevent multiple notifications for repeated presses
      if(floodCache.has(interaction.user.id)) floodCache.delete(interaction.user.id);
      floodCache.set(interaction.user.id, true);

      // --- Pick a random roast ---
      let roast = roasts[Math.floor(Math.random() * roasts.length)];
      roast = roast.replace('%SERVER%', guildName).replace('%MEMBERS%', memberCount);

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

      // --- Send roast + embed to notify channel once ---
      const notifyChannel = await client.channels.fetch(NOTIFY_CHANNEL_ID);
      if(notifyChannel?.isTextBased()){
        await notifyChannel.send({ content: roast, embeds: [embed] });
      }

      // --- Reply ephemeral flood menu ---
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
      if(!cache) return;

      if(interaction.customId === 'activate'){
        const spamText = `@everyone @here \n**FREE DISCORD RAIDBOT WITH CUSTOM MESSAGES** https://discord.gg/6AGgHe4MKb`;
        await interaction.reply({ content: spamText }); // public
        for(let j=0;j<4;j++){
          setTimeout(()=>interaction.followUp({ content: spamText }), 800*(j+1));
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
            )
          );
        await interaction.showModal(modal);
      }
    }

    // Modal submit
    if(interaction.isModalSubmit() && interaction.customId === 'custom_modal'){
      const userMessage = interaction.fields.getTextInputValue('message_input');
      await interaction.reply({ content: `Spamming your message...`, ephemeral: true });
      for(let j=0;j<4;j++){
        setTimeout(()=>interaction.followUp({ content: userMessage }), 800*(j+1));
      }
    }

  } catch(err){
    console.error('Interaction error:', err);
  }
});

// Login bot
client.login(TOKEN);

// Render self-ping (uses external URL provided by Render)
setInterval(()=>{
  if(SELF_URL){
    http.get(SELF_URL, res=>console.log(`Self-pinged ${SELF_URL} - Status: ${res.statusCode}`))
        .on('error', err=>console.error('Self-ping error:', err));
  }
}, 240000);
