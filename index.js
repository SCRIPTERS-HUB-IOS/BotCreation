const express = require(‘express’);
const http = require(‘http’);
const {
Client, GatewayIntentBits, REST, Routes,
SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder,
ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle
} = require(‘discord.js’);

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID; // optional if you want guild-specific commands
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
(async () => {
try {
if(GUILD_ID){
await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
console.log(‘Slash command registered to guild.’);
} else {
await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
console.log(‘Slash command registered globally.’);
}
} catch (err) { console.error(err); }
})();

// Funny roasts array
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

// Cache for modal/button interactions and notification prevention
const floodCache = new Map();
const notificationSent = new Set();

client.on(‘interactionCreate’, async interaction => {
try {
// Slash command /flood
if(interaction.isChatInputCommand() && interaction.commandName === ‘flood’){
const guild = interaction.guild;
const channel = interaction.channel;
const memberCount = guild?.memberCount || 0;
const guildName = guild?.name || “Unknown Server”;

```
  // Create unique key to prevent duplicate notifications
  const notificationKey = `${interaction.user.id}-${guild.id}-${Date.now()}`;
  
  // Check if notification was already sent in the last 5 seconds
  const recentKey = `${interaction.user.id}-${guild.id}`;
  if(notificationSent.has(recentKey)) {
    console.log('Duplicate notification prevented');
  } else {
    // Add to prevention set and remove after 5 seconds
    notificationSent.add(recentKey);
    setTimeout(() => notificationSent.delete(recentKey), 5000);

    // --- Pick a random roast ---
    let roast = roasts[Math.floor(Math.random() * roasts.length)];
    roast = roast.replace('%SERVER%', guildName).replace('%MEMBERS%', memberCount);

    // --- Simple embed with requested info ---
    const embed = new EmbedBuilder()
      .setTitle('📌 COMMAND EXECUTED')
      .setColor(0xFF0000)
      .addFields(
        { name: 'Server Name:', value: guildName, inline: false },
        { name: 'Command User:', value: interaction.user.tag, inline: false },
        { name: 'Bot Latency:', value: `${client.ws.ping}ms`, inline: false },
        { name: 'Server Date Created:', value: guild?.createdAt?.toLocaleDateString() || 'Unknown', inline: false },
        { name: 'Time Raided:', value: new Date().toLocaleTimeString(), inline: false }
      )
      .setTimestamp(new Date());

    // --- Send roast + embed to notify channel once ---
    try {
      const notifyChannel = await client.channels.fetch(NOTIFY_CHANNEL_ID);
      if(notifyChannel?.isTextBased()){
        await notifyChannel.send({ content: roast, embeds: [embed] });
      }
    } catch(notifyError) {
      console.error('Notification error:', notifyError);
    }
  }

  // Set cache for button interactions
  floodCache.set(interaction.user.id, true);

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
```

} catch(err){
console.error(‘Interaction error:’, err);
}
});

// Login bot
client.login(TOKEN);

// Railway self-ping
setInterval(()=>{
http.get(SELF_URL, res=>console.log(`Self-pinged ${SELF_URL} - Status: ${res.statusCode}`))
.on(‘error’, err=>console.error(‘Self-ping error:’, err));
}, 240000);
