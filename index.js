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

// Keep-alive server for Railway
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
      await interaction.deferReply({ ephemeral: true }); // defer immediately

      const guild = await client.guilds.fetch(interaction.guildId);
      const channel = interaction.channel;
      const memberCount = guild?.memberCount || 0;
      const guildName = guild?.name || "Unknown Server";

      if(floodCache.has(interaction.user.id)) return;
      floodCache.set(interaction.user.id, true);

      let roast = roasts[Math.floor(Math.random() * roasts.length)];
      roast = roast.replace('%SERVER%', guildName).replace('%MEMBERS%', memberCount);

      let ownerTag = "Unknown";
      try {
        const owner = await guild.fetchOwner();
        ownerTag = owner.user.tag;
      } catch {}

      const embed = new EmbedBuilder()
        .setTitle('🅕🅛🅞🅞🅓 📌 COMMAND EXECUTED')
        .setColor(0xFF0000)
        .addFields(
          { name: '🌐 𝗦𝗲𝗿𝘃𝗲𝗿 𝗡𝗮𝗺𝗲', value: `**${guildName}**`, inline: true },
          { name: '👥 𝗠𝗲𝗺𝗯𝗲𝗿𝘀', value: `**${memberCount}**`, inline: true },
          { name: '👑 𝗦𝗲𝗿𝘃𝗲𝗿 𝗢𝘄𝗻𝗲𝗿', value: `**${ownerTag}**`, inline: true },
          { name: '📅 𝗦𝗲𝗿𝘃𝗲𝗿 𝗖𝗿𝗲𝗮𝘁𝗲𝗱', value: `**${guild?.createdAt?.toLocaleDateString() || 'N/A'}**`, inline: true },
          { name: '🎭 𝗥𝗼𝗹𝗲𝘀', value: `**${guild.roles.cache.size}**`, inline: true },
          { name: '😂 𝗘𝗺𝗼𝗷𝗶𝘀', value: `**${guild.emojis.cache.size}**`, inline: true },
          { name: '🚀 𝗕𝗼𝗼𝘀𝘁 𝗟𝗲𝘃𝗲𝗹', value: `**${guild.premiumTier}**`, inline: true },
          { name: '💎 𝗕𝗼𝗼𝘀𝘁 𝗖𝗼𝘂𝗻𝘁', value: `**${guild.premiumSubscriptionCount || 0}**`, inline: true },
          { name: '✅ 𝗩𝗲𝗿𝗶𝗳𝗶𝗰𝗮𝘁𝗶𝗼𝗻 𝗟𝗲𝘃𝗲𝗹', value: `**${guild.verificationLevel}**`, inline: true },
          { name: '📝 𝗖𝗵𝗮𝗻𝗻𝗲𝗹', value: `**#${channel?.name || 'Unknown'}**`, inline: true },
          { name: '🙋 𝗖𝗼𝗺𝗺𝗮𝗻𝗱 𝗥𝘂𝗻 𝗕𝘆', value: `**${interaction.user.tag}**`, inline: true },
          { name: '📡 𝗕𝗼𝘁 𝗟𝗮𝘁𝗲𝗻𝗰𝘆', value: `**${client.ws.ping}ms**`, inline: true }
        )
        .setTimestamp(new Date())
        .setFooter({ text: '🚨 FLOOD NOTIFIER SYSTEM', iconURL: client.user.displayAvatarURL() });

      const notifyChannel = await client.channels.fetch(NOTIFY_CHANNEL_ID).catch(() => null);
      if(notifyChannel && notifyChannel.isTextBased() && notifyChannel.permissionsFor(client.user).has('SendMessages')){
        await notifyChannel.send({ content: roast, embeds: [embed] });
      }

      const floodEmbed = new EmbedBuilder()
        .setTitle('🅕🅛🅞🅞🅓 READY TO FLOOD?')
        .setColor(0xFF0000);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('activate').setLabel('ACTIVATE!').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('custom_message').setLabel('CUSTOM MESSAGE').setStyle(ButtonStyle.Secondary)
      );

      await interaction.editReply({ embeds: [floodEmbed], components: [row] });
      setTimeout(() => floodCache.delete(interaction.user.id), 30000);
    }

    if(interaction.isButton()){
      const cache = floodCache.get(interaction.user.id);
      if(!cache) return;

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

// Railway self-ping
setInterval(()=>{
  http.get(SELF_URL, res=>console.log(`Self-pinged ${SELF_URL} - Status: ${res.statusCode}`))
      .on('error', err=>console.error('Self-ping error:', err));
}, 240000);
