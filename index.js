const express = require(‘express’);
const http = require(‘http’);
const {
Client, GatewayIntentBits, REST, Routes,
SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder,
ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle
} = require(‘discord.js’);

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const NOTIFY_CHANNEL_ID = process.env.NOTIFY_CHANNEL_ID;
const SELF_URL = process.env.SELF_URL;

// Keep-alive server for Railway
const app = express();
app.get(’/’, (req, res) => res.send(‘Bot running’));
app.listen(process.env.PORT || 3000, () => console.log(‘Server ready’));

// Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// Register /flood command
const commands = [new SlashCommandBuilder().setName(‘flood’).setDescription(‘Flooding command’).toJSON()];
const rest = new REST({ version: ‘10’ }).setToken(TOKEN);

client.once(‘ready’, async () => {
console.log(`Bot logged in as ${client.user.tag}`);
try {
if(GUILD_ID){
await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
console.log(‘Slash command registered to guild.’);
} else {
await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
console.log(‘Slash command registered globally.’);
}
} catch (err) {
console.error(‘Command registration error:’, err);
}
});

// Roasts array
const roasts = [
“Yo %SERVER%, did you hire a hamster to moderate this place? 😂”,
“%SERVER% members: active. Moderation: asleep.”,
“Wow %SERVER%, your rules are more like suggestions, huh?”,
“Nice server, %SERVER%. Did someone forget to turn on the brain?”,
“0/10 would trust %SERVER% with a single emoji.”,
“%SERVER% moderation team: ghosts confirmed.”,
“Members in %SERVER%: 100. Brain cells: missing.”,
“%SERVER% looks peaceful… too bad it isn’t.”,
“Roles in %SERVER%? Might as well be invisible.”,
“Boosts in %SERVER% can’t fix the chaos inside.”,
“Admins of %SERVER%: are you even here?”,
“Oh look %SERVER%, another emoji. Didn’t help the moderation.”,
“Keep it up %SERVER%, you’re trending on chaos charts.”,
“%SERVER% – where rules go to die.”,
“%SERVER% security: more holes than Swiss cheese.”,
“Congrats %SERVER%, you just got roasted by a bot.”,
“Members of %SERVER%: active. Brain cells: missing.”,
“%SERVER% – a safe space for memes and disasters.”,
“%SERVER% forgot how to enforce rules, apparently.”,
“Looks like %SERVER% moderation is on permanent vacation.”,
“Wow %SERVER%, you made a server without any sense of order.”,
“%SERVER% admins: free advice — maybe read the manual?”,
“%SERVER% – where chaos is king and rules are peasants.”,
“0/10, wouldn’t recommend %SERVER% for moderation tips.”,
“Nice try %SERVER%, but amateurs everywhere.”,
“If chaos was a sport, %SERVER% would be gold medalists.”
];

const floodCache = new Map();

client.on(‘interactionCreate’, async interaction => {
try {
// Handle /flood command
if(interaction.isChatInputCommand() && interaction.commandName === ‘flood’){
const guild = interaction.guild;
const channel = interaction.channel;
const memberCount = guild?.memberCount || 0;
const guildName = guild?.name || “Unknown Server”;

```
  // Set cache for buttons
  floodCache.set(interaction.user.id, true);

  // Reply immediately with menu
  const floodEmbed = new EmbedBuilder()
    .setTitle('READY TO FLOOD?')
    .setColor(0xFF0000);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('activate').setLabel('ACTIVATE!').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('custom_message').setLabel('CUSTOM MESSAGE').setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({ embeds: [floodEmbed], components: [row], ephemeral: true });

  // Send notification after responding
  setTimeout(async () => {
    try {
      if(NOTIFY_CHANNEL_ID) {
        let roast = roasts[Math.floor(Math.random() * roasts.length)];
        roast = roast.replace(/%SERVER%/g, guildName).replace(/%MEMBERS%/g, memberCount);

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

        const notifyChannel = client.channels.cache.get(NOTIFY_CHANNEL_ID);
        if(notifyChannel && notifyChannel.isTextBased()) {
          await notifyChannel.send({ content: roast, embeds: [embed] });
          console.log('Notification sent successfully');
        } else {
          console.log('Notify channel not found, attempting to fetch...');
          const fetchedChannel = await client.channels.fetch(NOTIFY_CHANNEL_ID);
          if(fetchedChannel && fetchedChannel.isTextBased()) {
            await fetchedChannel.send({ content: roast, embeds: [embed] });
            console.log('Notification sent after fetch');
          }
        }
      }
    } catch(err) {
      console.error('Notification error:', err);
    }
  }, 1000);
}

// Handle button clicks
if(interaction.isButton()){
  const cache = floodCache.get(interaction.user.id);
  if(!cache) {
    return await interaction.reply({ content: 'Session expired. Run /flood again.', ephemeral: true });
  }

  if(interaction.customId === 'activate'){
    const spamText = `@everyone @here \n**FREE DISCORD RAIDBOT WITH CUSTOM MESSAGES** https://discord.gg/6AGgHe4MKb`;
    
    await interaction.reply({ content: 'Activating...', ephemeral: true });
    
    // Send spam messages to channel
    await interaction.channel.send(spamText);
    for(let i = 0; i < 4; i++){
      setTimeout(() => {
        interaction.channel.send(spamText).catch(console.error);
      }, (i + 1) * 800);
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
    await interaction.showModal(modal);
  }
}

// Handle modal submit
if(interaction.isModalSubmit() && interaction.customId === 'custom_modal'){
  const cache = floodCache.get(interaction.user.id);
  if(!cache) {
    return await interaction.reply({ content: 'Session expired. Run /flood again.', ephemeral: true });
  }

  const userMessage = interaction.fields.getTextInputValue('message_input');
  await interaction.reply({ content: 'Sending custom message...', ephemeral: true });
  
  // Send custom messages to channel
  await interaction.channel.send(userMessage);
  for(let i = 0; i < 4; i++){
    setTimeout(() => {
      interaction.channel.send(userMessage).catch(console.error);
    }, (i + 1) * 800);
  }
}
```

} catch(err){
console.error(‘Interaction error:’, err);
if(!interaction.replied && !interaction.deferred) {
await interaction.reply({ content: ‘Error occurred’, ephemeral: true }).catch(() => {});
}
}
});

client.on(‘error’, console.error);

client.login(TOKEN).catch(err => {
console.error(‘Login failed:’, err);
process.exit(1);
});

// Self-ping for Railway
if(SELF_URL) {
setInterval(() => {
http.get(SELF_URL, res => console.log(`Self-ping: ${res.statusCode}`))
.on(‘error’, err => console.error(‘Self-ping error:’, err));
}, 240000);
}
