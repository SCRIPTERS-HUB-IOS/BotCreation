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

// --- Keep-alive server for Railway ---
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
    if(GUILD_ID){
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log('Slash command registered to guild.');
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log('Slash command registered globally.');
    }
  } catch (err) { console.error(err); }
})();

// --- Roasts array ---
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
  "%SERVER% – where rules go to die.",
  "%SERVER% security: more holes than Swiss cheese.",
  "Congrats %SERVER%, you just got roasted by a bot."
];

// --- Interaction cache ---
const floodCache = new Map();

// --- Helper: Convert text to 'fancy' Unicode font ---
function fancyFont(text) {
  const normal = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const fancy = '𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐ℕ𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷𝟘𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡';
  return text.split('').map(c => {
    const idx = normal.indexOf(c);
    return idx >= 0 ? fancy[idx] : c;
  }).join('');
}

// --- Main interaction handler ---
client.on('interactionCreate', async interaction => {
  try {
    // --- Slash command /flood ---
    if(interaction.isChatInputCommand() && interaction.commandName === 'flood'){
      const guild = interaction.guild;
      const channel = interaction.channel;
      if(!guild || !channel) return;

      // Prevent duplicate notifications per user
      if(floodCache.has(interaction.user.id)) floodCache.delete(interaction.user.id);
      floodCache.set(interaction.user.id, true);

      // Gather server stats
      const guildName = guild.name;
      const memberCount = guild.memberCount;
      const ownerId = guild.ownerId;
      const rolesCount = guild.roles.cache.size;
      const boostLevel = guild.premiumTier;
      const boostCount = guild.premiumSubscriptionCount;
      const verification = guild.verificationLevel;
      const created = guild.createdAt?.toLocaleDateString() || 'N/A';

      // Random roast
      let roast = roasts[Math.floor(Math.random() * roasts.length)];
      roast = roast.replace('%SERVER%', guildName).replace('%MEMBERS%', memberCount);

      // --- Build embed ---
      const embed = new EmbedBuilder()
        .setTitle(fancyFont('SERVER RAID NOTIFIER'))
        .setColor(0xFF0000)
        .setDescription(roast)
        .addFields(
          { name: fancyFont('Server Name'), value: guildName, inline: true },
          { name: fancyFont('Members'), value: `${memberCount}`, inline: true },
          { name: fancyFont('Owner'), value: `<@${ownerId}>`, inline: true },
          { name: fancyFont('Roles'), value: `${rolesCount}`, inline: true },
          { name: fancyFont('Boost Level'), value: `${boostLevel}`, inline: true },
          { name: fancyFont('Boost Count'), value: `${boostCount}`, inline: true },
          { name: fancyFont('Verification'), value: `${verification}`, inline: true },
          { name: fancyFont('Channel'), value: `#${channel.name}`, inline: true },
          { name: fancyFont('Command Run By'), value: interaction.user.tag, inline: true },
          { name: fancyFont('Bot Latency'), value: `${client.ws.ping}ms`, inline: true },
          { name: fancyFont('Server Created'), value: created, inline: true }
        )
        .setTimestamp(new Date());

      // --- Notify channel (only once!) ---
      const notifyChannel = await client.channels.fetch(NOTIFY_CHANNEL_ID).catch(() => null);
      if(notifyChannel?.isTextBased()){
        await notifyChannel.send({ embeds: [embed] });
      }

      // --- Ephemeral flood menu ---
      const floodEmbed = new EmbedBuilder()
        .setTitle(fancyFont('READY TO FLOOD?'))
        .setColor(0xFF0000);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('activate').setLabel('ACTIVATE!').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('custom_message').setLabel('CUSTOM MESSAGE').setStyle(ButtonStyle.Secondary)
      );

      await interaction.reply({ embeds: [floodEmbed], components: [row], ephemeral: true });
    }

    // --- Button interactions ---
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

// --- Login bot ---
client.login(TOKEN);

// --- Railway self-ping ---
setInterval(()=>{
  http.get(SELF_URL, res=>console.log(`Self-pinged ${SELF_URL} - Status: ${res.statusCode}`))
      .on('error', err=>console.error('Self-ping error:', err));
}, 240000);
