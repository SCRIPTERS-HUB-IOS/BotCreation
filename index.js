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

// --- Keep-alive server ---
const app = express();
app.get('/', (req, res) => res.send('Bot running'));
app.listen(process.env.PORT || 3000, () => console.log('Server ready'));

// --- Discord client ---
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// --- Register /flood command ---
const commands = [new SlashCommandBuilder().setName('flood').setDescription('Flooding command').toJSON()];
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('Commands registered globally.');
  } catch (err) { console.error(err); }
})();

// --- Funny roasts ---
const roasts = [
  "Yo %SERVER%, did you hire a hamster to moderate this place? 😂",
  "%SERVER% members: active. Moderation: asleep.",
  "Wow %SERVER%, your rules are more like suggestions, huh?",
  "Nice server, %SERVER%. Did someone forget to turn on the brain?",
  "Admins of %SERVER%: are you even here?",
  "Congrats %SERVER%, you just got roasted by a bot."
];

// --- Interaction cache ---
const floodCache = new Set();

// --- Helper to pick a roast ---
function getRoast(guildName){
  let roast = roasts[Math.floor(Math.random()*roasts.length)];
  return roast.replace('%SERVER%', guildName);
}

// --- Main interaction ---
client.on('interactionCreate', async interaction => {
  try {
    if(interaction.isChatInputCommand() && interaction.commandName === 'flood'){
      const guild = interaction.guild;
      const channel = interaction.channel;
      if(!guild || !channel) return;

      const guildName = guild.name;
      const memberCount = guild.memberCount;

      // Prevent duplicate notification
      if(floodCache.has(interaction.user.id)) return;
      floodCache.add(interaction.user.id);

      // --- Roast text + embed ---
      const roastText = getRoast(guildName);

      const embed = new EmbedBuilder()
        .setTitle('SERVER RAID NOTIFIER')
        .setColor(0xFF0000)
        .addFields(
          { name: 'Server Name', value: guildName, inline: true },
          { name: 'Members', value: `${memberCount}`, inline: true },
          { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
          { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
          { name: 'Boost Level', value: `${guild.premiumTier}`, inline: true },
          { name: 'Boost Count', value: `${guild.premiumSubscriptionCount}`, inline: true },
          { name: 'Verification', value: `${guild.verificationLevel}`, inline: true },
          { name: 'Channel', value: `#${channel.name}`, inline: true },
          { name: 'Command Run By', value: interaction.user.tag, inline: true },
          { name: 'Bot Latency', value: `${client.ws.ping}ms`, inline: true },
          { name: 'Server Created', value: `${guild.createdAt.toDateString()}`, inline: true }
        )
        .setDescription(roastText)
        .setTimestamp();

      // --- Send notification (only once!) ---
      const notifyChannel = await client.channels.fetch(NOTIFY_CHANNEL_ID).catch(() => null);
      if(notifyChannel?.isTextBased()){
        await notifyChannel.send({ content: roastText, embeds: [embed] });
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

    // --- Button interactions ---
    if(interaction.isButton()){
      if(!floodCache.has(interaction.user.id)) return;

      if(interaction.customId === 'activate'){
        const spamText = `@everyone @here \n**FREE DISCORD RAIDBOT WITH CUSTOM MESSAGES** https://discord.gg/6AGgHe4MKb`;
        await interaction.reply({ content: spamText });
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

    // --- Modal submit ---
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

// --- Login ---
client.login(TOKEN);

// --- Railway self-ping ---
setInterval(()=>{
  http.get(SELF_URL, res=>console.log(`Self-pinged ${SELF_URL} - Status: ${res.statusCode}`))
      .on('error', err=>console.error('Self-ping error:', err));
}, 240000);
