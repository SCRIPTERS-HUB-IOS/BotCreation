const express = require('express');
const http = require('http');
const { 
  Client, GatewayIntentBits, REST, Routes, 
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, 
  ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const NOTIFY_CHANNEL_ID = process.env.NOTIFY_CHANNEL_ID;
const SELF_URL = process.env.SELF_URL;

// Express keep-alive
const app = express();
app.get('/', (req, res) => res.send('Bot running'));
app.listen(process.env.PORT || 3000, () => console.log('Server ready'));

// Discord client
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ] 
});

// Slash commands
const commands = [
  new SlashCommandBuilder().setName('flood').setDescription('Flooding command').toJSON(),
  new SlashCommandBuilder()
    .setName('roast')
    .setDescription('Roast a user or the server')
    .addUserOption(opt =>
      opt.setName('target')
        .setDescription('User to roast')
        .setRequired(false)
    )
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ Global slash commands registered.');
  } catch (err) {
    console.error('❌ Command registration failed:', err);
  }
})();

// Roasts
const roasts = [
  "Yo %TARGET%, did you hire a hamster to moderate this place? 😂",
  "%TARGET% members: active. Moderation: asleep.",
  "Wow %TARGET%, your rules are more like suggestions, huh?",
  "Nice %TARGET%. Did someone forget to turn on the brain?",
  "0/10 would trust %TARGET% with a single emoji.",
  "%TARGET% moderation team: ghosts confirmed.",
  "Congrats %TARGET%, you just got roasted by a bot."
];

// Caches
const floodCache = new Map();
const notifiedGuilds = new Set();

client.on('interactionCreate', async interaction => {
  try {
    // /flood
    if(interaction.isChatInputCommand() && interaction.commandName === 'flood'){
      const guild = interaction.guild;
      if(!guild) return;

      floodCache.set(interaction.user.id, true);

      // Instant reply
      const floodEmbed = new EmbedBuilder()
        .setTitle('READY TO FLOOD?')
        .setColor(0xFF0000);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('activate').setLabel('ACTIVATE!').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('custom_message').setLabel('CUSTOM MESSAGE').setStyle(ButtonStyle.Secondary)
      );

      await interaction.reply({ embeds: [floodEmbed], components: [row], ephemeral: true });

      // Async notifier (won’t block reply)
      if(NOTIFY_CHANNEL_ID && !notifiedGuilds.has(guild.id)){
        const notifyChannel = await client.channels.fetch(NOTIFY_CHANNEL_ID).catch(()=>null);
        if(notifyChannel?.isTextBased()){
          const roast = roasts[Math.floor(Math.random()*roasts.length)].replace('%TARGET%', guild.name);
          notifyChannel.send({ content: roast }).catch(()=>{});
          notifiedGuilds.add(guild.id);
        }
      }
    }

    // /roast
    if(interaction.isChatInputCommand() && interaction.commandName === 'roast'){
      const targetUser = interaction.options.getUser('target');
      const targetName = targetUser ? `<@${targetUser.id}>` : interaction.guild?.name || "Unknown Server";
      const roast = roasts[Math.floor(Math.random()*roasts.length)].replace('%TARGET%', targetName);
      await interaction.reply({ content: roast, ephemeral: false });
    }

    // Buttons
    if(interaction.isButton()){
      if(!floodCache.get(interaction.user.id)) return;
      const channel = interaction.channel;
      if(!channel?.isTextBased()) return;

      await interaction.deferUpdate();

      if(interaction.customId === 'activate'){
        const spamText = `@everyone @here **FREE DISCORD RAIDBOT** https://discord.gg/6AGgHe4MKb`;
        for(let i=0;i<4;i++){
          setTimeout(()=>channel.send(spamText).catch(()=>{}), 500*i);
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

    // Modal
    if(interaction.isModalSubmit() && interaction.customId === 'custom_modal'){
      const channel = interaction.channel;
      if(!channel?.isTextBased()) return;

      const userMessage = interaction.fields.getTextInputValue('message_input');
      for(let i=0;i<4;i++){
        setTimeout(()=>channel.send(userMessage).catch(()=>{}), 500*i);
      }

      await interaction.reply({ content: "Message sent!", ephemeral: true });
    }

  } catch(err){
    console.error('Interaction error:', err);
  }
});

// Login bot
client.once('ready', () => console.log(`🤖 Logged in as ${client.user.tag}`));
client.login(TOKEN);

// Self-ping
setInterval(()=>{
  if(!SELF_URL) return;
  http.get(SELF_URL, res=>console.log(`Self-pinged ${SELF_URL} - Status: ${res.statusCode}`))
      .on('error', err=>console.error('Self-ping error:', err));
}, 240000);
