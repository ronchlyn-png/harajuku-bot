require("dotenv").config();

const fs = require("fs");
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

const PREFIX = "$";
const LIST_FILE = "./animeLists.json";

function loadLists() {
  if (!fs.existsSync(LIST_FILE)) fs.writeFileSync(LIST_FILE, JSON.stringify({}));
  return JSON.parse(fs.readFileSync(LIST_FILE));
}

function saveLists(data) {
  fs.writeFileSync(LIST_FILE, JSON.stringify(data, null, 2));
}

function formatList(list) {
  if (!list || list.length === 0) return "none yet";
  return list.map(a => `• ${a}`).join("\n");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`🍥 Logged in as ${client.user.tag}`);
});

client.on("guildMemberAdd", member => {
  const channel = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor("#ff4fb8")
    .setTitle("🌸 welcome to the district")
    .setDescription(
      `hey ${member} ✨\n\n` +
      `🎀 pick roles in <#${process.env.ROLES_CHANNEL_ID}>\n` +
      "⭐ rate anime + manga"
    )
    .setThumbnail(member.user.displayAvatarURL())
    .setTimestamp();

  channel.send({ embeds: [embed] });
});

client.on("messageCreate", async message => {
  if (message.author.bot) return;

  if (message.channel.name.startsWith("rating-") && message.content.includes("|")) {
    const parts = message.content.split("|");

    const anime = parts[0]?.trim();
    const rating = Number(parts[1]?.trim());
    const thoughts = parts[2]?.trim();
    const fav = parts[3]?.trim()?.toLowerCase() === "yes";

    if (!anime || isNaN(rating) || rating < 0 || rating > 10) {
      return message.reply("use this format:\n`JJK | 9 | Gojo carried | yes`");
    }

    const embed = new EmbedBuilder()
      .setColor(rating === 10 ? "#fff35c" : fav ? "#ff8ad8" : "#ff4fb8")
      .setTitle(`🎴 ${anime}`)
      .setDescription(`⭐ **${rating}/10**\n\n💭 ${thoughts}\n\n👤 ${message.author}`)
      .setTimestamp();

    const main = message.guild.channels.cache.get(process.env.ANIME_RATINGS_CHANNEL_ID);
    if (!main) return message.reply("anime ratings channel ID is missing in `.env`.");

    await main.send({ embeds: [embed] });

    if (fav) {
      const favCh = message.guild.channels.cache.get(process.env.FAVORITES_CHANNEL_ID);
      if (favCh) await favCh.send({ content: "💖 new favorite!", embeds: [embed] });
    }

    if (rating === 10) {
      const top = message.guild.channels.cache.get(process.env.TOP_TIER_CHANNEL_ID);
      if (top) await top.send({ content: "🏆 top tier!", embeds: [embed] });
    }

    await message.channel.send("posted 🎀 closing...");
    setTimeout(() => message.channel.delete().catch(() => {}), 4000);
    return;
  }

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(" ");
  const command = args.shift().toLowerCase();

  if (command === "setup-rules") {
    const embed = new EmbedBuilder()
      .setColor("#ff4fb8")
      .setTitle("📜 server rules")
      .setDescription(
        "1. be respectful.\n" +
        "2. no harassment or hate.\n" +
        "3. no spoilers without warning.\n" +
        "4. keep debates fun.\n" +
        "5. use the right channels.\n" +
        "6. no spam.\n\n" +
        "🎴 rate honestly\n📚 respect people’s taste\n💖 keep the vibe cute"
      )
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }

  if (command === "setup-roles") {
    const ageEmbed = new EmbedBuilder()
      .setColor("#ff4fb8")
      .setTitle("🧸 age roles")
      .setDescription("🧸 under 18\n🔞 18+");

    const ageRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("under18").setLabel("🧸 under 18").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("over18").setLabel("🔞 18+").setStyle(ButtonStyle.Secondary)
    );

    const pingEmbed = new EmbedBuilder()
      .setColor("#b56cff")
      .setTitle("📢 ping roles")
      .setDescription("📢 updates\n🎬 anime night\n📖 manga updates\n⭐ rating drops\n🎀 polls\n🎁 events");

    const pingRow1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("updates").setLabel("📢 updates").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("animeNight").setLabel("🎬 anime night").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("mangaUpdates").setLabel("📖 manga updates").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("ratingDrops").setLabel("⭐ rating drops").setStyle(ButtonStyle.Success)
    );

    const pingRow2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("polls").setLabel("🎀 polls").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("events").setLabel("🎁 events").setStyle(ButtonStyle.Success)
    );

    const identityEmbed = new EmbedBuilder()
      .setColor("#00d9ff")
      .setTitle("🎴 identity roles")
      .setDescription("🎴 anime watcher\n📚 manga reader\n🍥 both");

    const identityRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("animeWatcher").setLabel("🎴 anime watcher").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("mangaReader").setLabel("📚 manga reader").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("both").setLabel("🍥 both").setStyle(ButtonStyle.Primary)
    );

    await message.channel.send({ embeds: [ageEmbed], components: [ageRow] });
    await message.channel.send({ embeds: [pingEmbed], components: [pingRow1, pingRow2] });
    await message.channel.send({ embeds: [identityEmbed], components: [identityRow] });
    return;
  }

  if (command === "rate-anime") {
    const ticket = await message.guild.channels.create({
      name: `rating-${message.author.id}`,
      type: ChannelType.GuildText,
      parent: process.env.TICKET_CATEGORY_ID || null,
      permissionOverwrites: [
        { id: message.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        {
          id: message.author.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        },
        {
          id: client.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.ManageChannels
          ]
        }
      ]
    });

    await ticket.send(
      `${message.author}\n\n` +
      "🍥 **anime rating ticket**\n\n" +
      "Type it like this:\n" +
      "`Anime | Rating | Thoughts | favorite yes/no`\n\n" +
      "Example:\n`JJK | 9 | Gojo carried | yes`"
    );

    return message.reply(`ticket created → ${ticket}`);
  }

  if (command === "add") {
    const list = args[0];
    const anime = args.slice(1).join(" ");
    const valid = ["watching", "planned", "onhold", "dropped", "completed"];

    if (!valid.includes(list) || !anime) {
      return message.reply("use it like this:\n`$add watching Jujutsu Kaisen`");
    }

    const data = loadLists();
    const id = message.author.id;

    if (!data[id]) data[id] = { watching: [], planned: [], onhold: [], dropped: [], completed: [] };

    valid.forEach(l => {
      data[id][l] = data[id][l].filter(a => a.toLowerCase() !== anime.toLowerCase());
    });

    data[id][list].push(anime);
    data[id][list].sort((a, b) => a.localeCompare(b));

    saveLists(data);
    return message.reply(`added **${anime}** → **${list}**`);
  }

  if (command === "remove") {
    const list = args[0];
    const anime = args.slice(1).join(" ");

    const data = loadLists();
    const id = message.author.id;

    if (!data[id] || !data[id][list]) return message.reply("that list does not exist.");

    data[id][list] = data[id][list].filter(a => a.toLowerCase() !== anime.toLowerCase());
    saveLists(data);

    return message.reply(`removed **${anime}**`);
  }

  if (command === "profile") {
    const data = loadLists();
    const user = data[message.author.id];

    if (!user) return message.reply("no profile yet. use `$add watching Anime Name` first.");

    const embed = new EmbedBuilder()
      .setColor("#ff4fb8")
      .setTitle(`${message.author.username}'s anime profile`)
      .setThumbnail(message.author.displayAvatarURL())
      .addFields(
        { name: "🎬 watching", value: formatList(user.watching) },
        { name: "📋 planned", value: formatList(user.planned) },
        { name: "💤 on hold", value: formatList(user.onhold) },
        { name: "💔 dropped", value: formatList(user.dropped) },
        { name: "🎞️ completed", value: formatList(user.completed) }
      );

    return message.channel.send({ embeds: [embed] });
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  const roles = {
    under18: process.env.UNDER18_ROLE,
    over18: process.env.OVER18_ROLE,
    updates: process.env.UPDATES_ROLE,
    animeNight: process.env.ANIME_NIGHT_ROLE,
    mangaUpdates: process.env.MANGA_UPDATES_ROLE,
    ratingDrops: process.env.RATING_DROPS_ROLE,
    polls: process.env.POLLS_ROLE,
    events: process.env.EVENTS_ROLE,
    animeWatcher: process.env.ANIME_WATCHER_ROLE,
    mangaReader: process.env.MANGA_READER_ROLE,
    both: process.env.BOTH_ROLE
  };

  const roleId = roles[interaction.customId];
  if (!roleId) return interaction.reply({ content: "role missing in `.env`.", ephemeral: true });

  const role = interaction.guild.roles.cache.get(roleId);
  if (!role) return interaction.reply({ content: "role ID is wrong.", ephemeral: true });

  if (interaction.member.roles.cache.has(roleId)) {
    await interaction.member.roles.remove(roleId);
    return interaction.reply({ content: `removed **${role.name}**`, ephemeral: true });
  }

  await interaction.member.roles.add(roleId);
  return interaction.reply({ content: `added **${role.name}**`, ephemeral: true });
});

client.login(process.env.TOKEN);