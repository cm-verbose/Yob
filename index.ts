import {
  APIEmbed,
  APIEmbedField,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits as GIB,
  Guild,
  Message,
  PartialMessage,
  PermissionsBitField,
  TextChannel,
  User,
} from "discord.js";
import dotenv from "dotenv";

class Bot {
  client: Client;
  logChannelID: string;
  DISCORD_EPOCH: number;
  PREFIX: string;

  constructor() {
    /** @important Reminder : Do not change these */
    this.client = new Client({
      intents: [GIB.Guilds, GIB.GuildMembers, GIB.GuildMessages, GIB.GuildPresences, GIB.MessageContent],
    });
    this.PREFIX = "~ ";
    this.DISCORD_EPOCH = 1420070400000;
    this.logChannelID = "";
    this.ini();
  }

  /** @description Constructs cient */
  private ini() {
    this.handleReady();
    this.handleMessageUpdate();
    this.handleMessageSend();
    this.handleMessageDelete();
    this.handleLogin();
  }

  /** @description Handles client ready */
  private handleReady() {
    this.client.once(Events.ClientReady, (client) => {
      console.clear();
      console.log(`Logged in as ${client.user.tag}`);
    });
  }

  /** @description Handles sent messages */
  private handleMessageSend() {
    this.client.on(Events.MessageCreate, (message: Message<boolean> | PartialMessage) => {
      if (message.content === null) return;

      /** @description configures the log channel */
      if (message.content === `${this.PREFIX}setLogChannel`) {
        if (message.author?.bot) return;

        /** @description Base permissions */
        if (!message.member || !message.member?.permissions.has(PermissionsBitField.Flags.BanMembers)) return;

        this.logChannelID = message.channel.id;
        const embed = new EmbedBuilder().setTitle(`Set log channel as <#${this.logChannelID}>`).setColor(0x77ff77);
        message.channel.send({ embeds: [embed] });
      }
    });
  }

  /** @description Handles deleted messages */
  private handleMessageDelete() {
    this.client.on(Events.MessageDelete, async (message: Message<boolean> | PartialMessage) => {
      /** If no log channel is configured, there is no location to log */
      if (this.logChannelID === "") return;

      const messageContent: string | null = message.content;
      const messageAuthor = message.author as User;
      const messageAuthourProfile = messageAuthor.avatarURL({ size: 64 }) as string;
      const messageId: string = message.id;

      const fieldList: Array<APIEmbedField> = [
        { name: "Message ID", value: `\`${messageId}\``, inline: true },
        {
          name: "Message Timestamp",
          value: `<t:${this.convertSnowFlakeToDate(parseInt(messageId, 10))}:F>`,
          inline: true,
        },
        {
          name: "User",
          value: `\`${messageAuthor.id}\` - <@${messageAuthor.id}>`,
          inline: true,
        },
      ];
      const attachementList: Array<string> = [];
      const EMBED_COLOR: number = 0xff7777;
      const logEmbed = {
        author: {
          name: messageAuthor.globalName ?? messageAuthor.username,
          iconURL: messageAuthourProfile,
        },
        color: EMBED_COLOR,
        title: `Message deleted in <#${message.channelId}>`,
        description:
          messageContent === null
            ? message.embeds.length >= 1
              ? `<see embed${message.embeds.length > 1 ? "s" : ""} below>`
              : "<message content empty>"
            : `\`\`\`md\n${messageContent}\`\`\``,
        fields: fieldList,
        type: "rich",
      } as APIEmbed;

      const embedArray: APIEmbed[] = [logEmbed];

      if (message.embeds.length >= 1) {
        message.embeds.forEach((embed) => {
          const embedObject = embed.data;
          const createdEmbed: APIEmbed = this.restructureEmbedObject(embedObject);
          embedArray.push(createdEmbed);
        });
      }

      if (message.attachments.size === 1) {
        const attachment = message.attachments.at(0);
        if (!attachment) return;

        /* Set thumbnail as image content */
        if (attachment.contentType && attachment.contentType.match(/jpeg|png|gif|webp/g)) {
          Object.defineProperty(logEmbed, "thumbnail", {
            value: { url: `${attachment.proxyURL}` },
            writable: false,
            enumerable: true,
          });
          fieldList.push({
            name: "Attachement info",
            value: `Name : [\`${attachment.name}\`](${attachment.url})`,
          });
        } else {
          attachementList.push(attachment.url);
          fieldList.push({ name: "Attachement", value: `[\`${attachment.name}\`](${attachment.url})` });
        }
      } else if (message.attachments.size > 1) {
        let counter = 1;
        message.attachments.forEach((attachment) => {
          counter += 1;
          attachementList.push(attachment.url);
          fieldList.push({ name: `Attachement ${counter}`, value: `[\`${attachment.name}\`](${attachment.url})` });
        });
      }

      const logs = this.client.channels.cache.get(this.logChannelID) as TextChannel;
      if ((message.guild as Guild).id === logs.guild.id) {
        logs.send({ embeds: embedArray, files: attachementList });
      }
    });
  }

  /** @description Recrates the embed object from the readonly embedObject */
  private restructureEmbedObject(embed: APIEmbed) {
    const constructedEmbedObject = {};
    Object.entries(embed).forEach(([key, value]) => {
      if (key === "type") return;
      Object.defineProperty(constructedEmbedObject, key, {
        value: value,
        writable: true,
        enumerable: true,
      });
    });
    return constructedEmbedObject;
  }

  /** @description Handles message update, eg : Edit, added Embed etc... */
  private handleMessageUpdate() {
    this.client.on(
      Events.MessageUpdate,
      /* Use newMessage since it is most recent */
      (oldMessage: Message<boolean> | PartialMessage, newMessage: Message<boolean> | PartialMessage) => {
        console.log(oldMessage, newMessage);
        if (this.logChannelID === "") return;

        const messageAuthor = newMessage.author as User;
        const messageAuthourProfile = messageAuthor.avatarURL({ size: 64 }) as string;
        const newMessageID = newMessage.id;
        const messageURL = newMessage.url;
        const [oldMessageContent, newMessageContent]: (string | null)[] = [oldMessage.content, newMessage.content];
        const fieldList: Array<APIEmbedField> = [
          { name: "Message ID", value: `\`${newMessageID}\``, inline: true },
          {
            name: "Message Timestamp",
            value: `<t:${this.convertSnowFlakeToDate(parseInt(newMessageID, 10))}:F>`,
            inline: true,
          },
          {
            name: "Message URL",
            value: `[Message URL](${messageURL})`,
            inline: true,
          },
          {
            name: "User",
            value: `\`${messageAuthor.id}\` - <@${messageAuthor.id}>`,
            inline: true,
          },
        ];

        const EMBED_COLOR = 0x2f8bf5;
        const logEmbed = {
          author: {
            name: messageAuthor.globalName ?? messageAuthor.username,
            icon_url: messageAuthourProfile,
          },
          description: `## Old message content\n ${
            `\`\`\`md\n${oldMessageContent}\`\`\`` ?? "<message content empty>"
          }\n## New message content\n ${`\`\`\`md\n${newMessageContent}\`\`\`` ?? "<message content empty>"}`,
          title: `Message edited in <#${newMessage.channel.id}>`,
          color: EMBED_COLOR,
          fields: fieldList,
        } as APIEmbed;

        newMessage.channel.send({ embeds: [logEmbed] });
      }
    );
  }

  /** @description Handles client login */
  private handleLogin() {
    dotenv.config();
    const TOKEN = process.env.TOKEN;
    this.client.login(TOKEN);
  }

  /**
   * @description Converts Discord snowflake to a date (Unix seconds)
   * {@link https://discord.com/developers/docs/reference#snowflakes}
   */
  private convertSnowFlakeToDate(snowflake: number): number {
    const ms = Number(BigInt(snowflake) >> 22n) + this.DISCORD_EPOCH;
    return Math.floor(ms / 1000);
  }
}

new Bot();
