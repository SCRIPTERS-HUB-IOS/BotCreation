const express = require('express');
const http = require('http');
const { 
  Client, GatewayIntentBits, REST, Routes, 
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, 
  ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID; // optional
const NOTIFY_CHANNEL_ID = process.env.NOTIFY_CHANNEL_ID;
const SELF_URL = process.env.SELF_URL;

// Keep-alive server
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

// Funny roasts
const roasts = [
  "Yo %SERVER%, did you hire a hamster to moderate this place? 😂",
  "%SERVER% members: active. Moderation: asleep.",
  "Wow %SERVER%, your rules are more like suggestions, huh?",
  "Nice server, %SERVER%. Did someone forget to turn on the brain?",
  "0/10 would trust %SERVER% with a single emoji.",
  "%SERVER% moderation team: ghosts confirmed."
];

// Flood cache
const floodCache = new Map();

client.on('interactionCreate', async interaction => {
  try {
    // Slash command
    if(interaction.isChatInputCommand() && interaction.commandName === 'flood'){
      // Reply instantly
      await interaction.reply({ content: 'Preparing flood menu...', ephemeral: true });

      // Async processing
      (async () => {
        const guild = await client.guilds.fetch(interaction.guildId);
        const channel = interaction.channel;
        const memberCount = guild?.memberCount || 0;
        const guildName = guild?.name || "Unknown Server";

        // Cache
        floodCache.set(interaction.user.id, true);

        // Random roast
        let roast = roasts[Math.floor(Math.random() * roasts.length)];
        roast = roast.replace('%SERVER%', guildName);

        // Fetch owner safely
        let ownerTag = "Unknown";
        try { ownerTag = (await guild.fetchOwner()).user.tag; } catch {}

        // Embed
        const embed = new EmbedBuilder()
          .setTitle('📌 COMMAND EXECUTED')
          .setColor(0xFF0000)
          .addFields(
            { name: '🌐 Server Name', value: guildName, inline: true },
            { name: '👥 Members', value: `${memberCount}`, inline: true },
            { name: '👑 Server Owner', value: ownerTag, inline: true },
            { name: '📝 Channel', value: `#${channel?.name || 'Unknown'}`, inline: true }
          )
          .setTimestamp(new Date());

        // Send notifier once
        const notifyChannel = await client.channels.fetch(NOTIFY_CHANNEL_ID).catch(()=>null);
        if(notifyChannel?.isTextBased()){
          await notifyChannel.send({ content: roast, embeds: [embed] });
        }

        // Flood menu
        const floodEmbed = new EmbedBuilder()
          .setTitle('READY TO FLOOD?')
          .setColor(0xFF0000);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('activate').setLabel('ACTIVATE!').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('custom_message').setLabel('CUSTOM MESSAGE').setStyle(ButtonStyle.Secondary)
        );

        await interaction.editReply({ content: null, embeds: [floodEmbed], components: [row] });
      })();
    }

    // Button interactions
    if(interaction.isButton() && floodCache.has(interaction.user.id)){
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

// Login
client.login(TOKEN);

// Self-ping
setInterval(()=>{
  http.get(SELF_URL, res=>console.log(`Self-pinged ${SELF_URL} - Status: ${res.statusCode}`))
      .on('error', err=>console.error('Self-ping error:', err));
}, 240000);
