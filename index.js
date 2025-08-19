const express = require("express");
const http = require("http");
const {
  Client, GatewayIntentBits, REST, Routes,
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const NOTIFY_CHANNEL_ID = process.env.NOTIFY_CHANNEL_ID;
const SELF_URL = process.env.SELF_URL;

// ==== EXPRESS KEEP-ALIVE ====
const app = express();
app.get("/", (req, res) => res.send("Bot running on Render/Glitch"));
app.listen(process.env.PORT || 3000, () => console.log("🌐 Express server ready"));

// ==== DISCORD CLIENT ====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ==== SLASH COMMANDS ====
const commands = [
  new SlashCommandBuilder()
    .setName("flood")
    .setDescription("Flood spam system"),
  new SlashCommandBuilder()
    .setName("roast")
    .setDescription("Roast a user or the server")
    .addUserOption(opt =>
      opt.setName("target")
        .setDescription("The user to roast")
        .setRequired(false)
    )
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
  try {
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log("✅ Slash commands registered to guild.");
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log("✅ Slash commands registered globally.");
    }
  } catch (err) {
    console.error("❌ Command registration failed:", err);
  }
})();

// ==== ROASTS ====
const roasts = [
  "Yo %TARGET%, did you hire a hamster to moderate this place? 😂",
  "%TARGET%: active. Moderation: asleep.",
  "Wow %TARGET%, your rules are more like suggestions, huh?",
  "Nice %TARGET%. Did someone forget to turn on the brain?",
  "%TARGET% moderation team: ghosts confirmed.",
  "Boosts in %TARGET% can’t fix the chaos inside.",
  "Congrats %TARGET%, you just got roasted by a bot"
];

// ==== CACHE ====
const floodCache = new Map();
const notifiedGuilds = new Set();

// ==== INTERACTIONS ====
client.on("interactionCreate", async interaction => {
  try {
    // ===== /flood =====
    if (interaction.isChatInputCommand() && interaction.commandName === "flood") {
      const guild = interaction.guild;
      const channel = interaction.channel;
      const guildName = guild?.name || "Unknown Server";
      const amount = 5; // instant 5 messages

      floodCache.set(interaction.user.id, { active: true, amount });

      if (guild && !notifiedGuilds.has(guild.id) && NOTIFY_CHANNEL_ID) {
        const notifyChannel = await client.channels.fetch(NOTIFY_CHANNEL_ID).catch(() => null);
        if (notifyChannel?.isTextBased()) {
          let roast = roasts[Math.floor(Math.random() * roasts.length)];
          roast = roast.replace("%TARGET%", guildName);
          await notifyChannel.send({ content: roast }).catch(() => {});
          notifiedGuilds.add(guild.id);
        }
      }

      const floodEmbed = new EmbedBuilder()
        .setTitle("🚨 FLOOD CONTROL PANEL")
        .setDescription(`Ready to spam **${amount}x** messages instantly.`)
        .setColor(0xFF0000);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("activate").setLabel("ACTIVATE!").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("custom_message").setLabel("CUSTOM MESSAGE").setStyle(ButtonStyle.Secondary)
      );

      await interaction.reply({ embeds: [floodEmbed], components: [row], ephemeral: true });
    }

    // ===== /roast =====
    if (interaction.isChatInputCommand() && interaction.commandName === "roast") {
      const targetUser = interaction.options.getUser("target");
      const targetName = targetUser ? `<@${targetUser.id}>` : interaction.guild?.name || "Unknown Server";

      let roast = roasts[Math.floor(Math.random() * roasts.length)];
      roast = roast.replace("%TARGET%", targetName);

      await interaction.reply({ content: roast });
    }

    // ===== Buttons =====
    if (interaction.isButton()) {
      const cache = floodCache.get(interaction.user.id);
      if (!cache?.active) return;
      const channel = interaction.channel;
      if (!channel?.isTextBased()) return;

      await interaction.deferUpdate(); // ✅ acknowledge immediately

      if (interaction.customId === "activate") {
        for (let i = 0; i < cache.amount; i++) {
          channel.send("@everyone **FREE RAID BOT** https://discord.gg/6AGgHe4MKb").catch(() => {});
        }
      }

      if (interaction.customId === "custom_message") {
        await interaction.showModal(
          new ModalBuilder()
            .setCustomId("custom_modal")
            .setTitle("Custom Flood Message")
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId("message_input")
                  .setLabel("Message to spam")
                  .setStyle(TextInputStyle.Paragraph)
                  .setRequired(true)
              )
            )
        );
      }
    }

    // ===== Modal =====
    if (interaction.isModalSubmit() && interaction.customId === "custom_modal") {
      const cache = floodCache.get(interaction.user.id);
      const amount = cache?.amount || 5;
      const channel = interaction.channel;
      if (!channel?.isTextBased()) return;

      await interaction.deferReply({ ephemeral: true }); // acknowledge instantly

      const userMessage = interaction.fields.getTextInputValue("message_input");
      for (let i = 0; i < amount; i++) {
        channel.send(userMessage).catch(() => {});
      }

      await interaction.deleteReply(); // remove ephemeral so nothing shows
    }

  } catch (err) {
    console.error("❌ Interaction error:", err);
  }
});

// ==== LOGIN ====
client.once("ready", () => console.log(`🤖 Logged in as ${client.user.tag}`));
client.login(TOKEN);

// ==== SELF-PING (Render/Glitch uptime) ====
setInterval(() => {
  if (!SELF_URL) return;
  http.get(SELF_URL, res => console.log(`Self-pinged ${SELF_URL} (${res.statusCode})`))
    .on("error", err => console.error("Self-ping error:", err));
}, 240000);
