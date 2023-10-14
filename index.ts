import {
  Client,
  GatewayIntentBits as GIB,
  EmbedBuilder,
  Events,
  Message,
  PartialMessage,
  User,
  TextChannel,
  PermissionsBitField,
} from "discord.js";
import dotenv from "dotenv";

class Bot {
  client: Client;
  logChannelID: string;

  constructor() {
    /** @important Reminder : Do not change these */
    this.client = new Client({
      intents: [GIB.Guilds, GIB.GuildPresences, GIB.GuildMembers, GIB.GuildMessages, GIB.MessageContent],
    });
    this.logChannelID = "";
    this.ini();
  }

  /** @description Constructs cient */
  private ini() {
    this.handleReady();
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
      if (message.content === "~ setLogChannel") {
        if(message.author?.bot) return; 
        if(!message.member || !(message.member?.permissions.has(PermissionsBitField.Flags.BanMembers))) return; 

        this.logChannelID = message.channel.id;
        const embed = new EmbedBuilder().setTitle(`Set log channel as <#${this.logChannelID}>`).setColor(0x77ff77);
        message.channel.send({ embeds: [embed] });
      }
    });
  }

  /** @description Handles deleted messages */
  private handleMessageDelete() {
    this.client.on(Events.MessageDelete, async (message: Message<boolean> | PartialMessage) => {
      if (this.logChannelID === "") return;

      const messageContent: string = message.content !== null ? message.content : "";
      const messageAuthourProfile = (message.author as User).avatarURL({ size: 64 }) as string;
      const messageId: string = message.id;

      const fieldList: Array<{ name: string; value: string; inline?: boolean }> = [];
      const attachementList: Array<string> = [];

      fieldList.push({ name: "Message ID", value: `\`${messageId}\``, inline: true });
      fieldList.push({
        name: "Message Timestamp",
        value: `<t:${this.convertSnowFlakeToDate(parseInt(messageId, 10))}:F>`,
        inline: true,
      });
      fieldList.push({
        name: "User",
        value: `\`${(message.author as User).id}\` (<@${(message.author as User).id}>)`,
        inline: true,
      });

      const embedColor = 0xff7777;
      const logEmbed = {
        author: {
          name: `${(message.author as User).globalName as string}`,
          iconURL: messageAuthourProfile,
        },
        color: embedColor,
        title: `Message deleted in <#${message.channelId}>`,
        description: messageContent === "" ? "<message content empty>" : `\`\`\`md\n${messageContent}\`\`\``,
        fields: fieldList,
      };

      if (message.attachments.size === 1) {
        const attachement = message.attachments.at(0);
        if (!attachement) return;
        if (attachement.contentType && attachement.contentType.match(/jpeg|png|gif|webp/g)) {
          Object.defineProperty(logEmbed, "thumbnail", {
            value: { url: `${attachement.proxyURL}` },
            writable: false,
            enumerable: true,
          });
          fieldList.push({ name: "Attachement info", value: `Name : \`${attachement.name}\`` });
        } else {
          attachementList.push(attachement.url);
          fieldList.push({ name: "Attachement", value: `\`${attachement.name}\`` });
        }
      } else if (message.attachments.size > 1) {
        message.attachments.forEach((attachement) => {
          attachementList.push(attachement.url);
          fieldList.push({ name: "Attachement", value: `\`${attachement.name}\`${attachement.url}` });
        });
      }

      const logs = this.client.channels.cache.get(this.logChannelID) as TextChannel;
      if (!logs) return;

      logs.send({ embeds: [logEmbed], files: attachementList });
    });
  }

  /** @description Handles client login */
  private handleLogin() {
    dotenv.config();
    const TOKEN = process.env.TOKEN;
    this.client.login(TOKEN);
  }

  /**
   * @description Converts snowflake to a date
   * {@link https://discord.com/developers/docs/reference#snowflakes}
   */
  private convertSnowFlakeToDate(snowflake: number):number {
    const DISCORD_EPOCH = 1420070400000;
    const ms = Number(BigInt(snowflake) >> 22n) + DISCORD_EPOCH;
    return Math.floor(ms/1000);
  }
}

new Bot();
