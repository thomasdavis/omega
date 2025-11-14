// Discord Interaction Types
// Based on Discord API v10 documentation

export enum InteractionType {
  PING = 1,
  APPLICATION_COMMAND = 2,
  MESSAGE_COMPONENT = 3,
  APPLICATION_COMMAND_AUTOCOMPLETE = 4,
  MODAL_SUBMIT = 5,
}

export enum InteractionResponseType {
  PONG = 1,
  CHANNEL_MESSAGE_WITH_SOURCE = 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE = 5,
  DEFERRED_UPDATE_MESSAGE = 6,
  UPDATE_MESSAGE = 7,
  APPLICATION_COMMAND_AUTOCOMPLETE_RESULT = 8,
  MODAL = 9,
}

export enum ApplicationCommandOptionType {
  SUB_COMMAND = 1,
  SUB_COMMAND_GROUP = 2,
  STRING = 3,
  INTEGER = 4,
  BOOLEAN = 5,
  USER = 6,
  CHANNEL = 7,
  ROLE = 8,
  MENTIONABLE = 9,
  NUMBER = 10,
  ATTACHMENT = 11,
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  bot?: boolean;
  system?: boolean;
  mfa_enabled?: boolean;
  banner?: string;
  accent_color?: number;
  locale?: string;
  verified?: boolean;
  email?: string;
  flags?: number;
  premium_type?: number;
  public_flags?: number;
}

export interface DiscordMember {
  user?: DiscordUser;
  nick?: string;
  avatar?: string;
  roles: string[];
  joined_at: string;
  premium_since?: string;
  deaf: boolean;
  mute: boolean;
  pending?: boolean;
  permissions?: string;
}

export interface DiscordInteractionDataOption {
  name: string;
  type: ApplicationCommandOptionType;
  value?: string | number | boolean;
  options?: DiscordInteractionDataOption[];
  focused?: boolean;
}

export interface DiscordInteractionData {
  id: string;
  name: string;
  type: number;
  resolved?: any;
  options?: DiscordInteractionDataOption[];
  guild_id?: string;
  target_id?: string;
}

export interface DiscordInteraction {
  id: string;
  application_id: string;
  type: InteractionType;
  data?: DiscordInteractionData;
  guild_id?: string;
  channel_id?: string;
  member?: DiscordMember;
  user?: DiscordUser;
  token: string;
  version: number;
  message?: any;
  app_permissions?: string;
  locale?: string;
  guild_locale?: string;
}

export interface DiscordEmbed {
  title?: string;
  type?: string;
  description?: string;
  url?: string;
  timestamp?: string;
  color?: number;
  footer?: {
    text: string;
    icon_url?: string;
    proxy_icon_url?: string;
  };
  image?: {
    url: string;
    proxy_url?: string;
    height?: number;
    width?: number;
  };
  thumbnail?: {
    url: string;
    proxy_url?: string;
    height?: number;
    width?: number;
  };
  video?: {
    url?: string;
    proxy_url?: string;
    height?: number;
    width?: number;
  };
  provider?: {
    name?: string;
    url?: string;
  };
  author?: {
    name: string;
    url?: string;
    icon_url?: string;
    proxy_icon_url?: string;
  };
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
}

export interface DiscordInteractionResponseData {
  tts?: boolean;
  content?: string;
  embeds?: DiscordEmbed[];
  allowed_mentions?: any;
  flags?: number;
  components?: any[];
  attachments?: any[];
}

export interface DiscordInteractionResponse {
  type: InteractionResponseType;
  data?: DiscordInteractionResponseData;
}

export interface DiscordApplicationCommand {
  id?: string;
  type?: number;
  application_id?: string;
  guild_id?: string;
  name: string;
  name_localizations?: Record<string, string>;
  description: string;
  description_localizations?: Record<string, string>;
  options?: DiscordApplicationCommandOption[];
  default_member_permissions?: string;
  dm_permission?: boolean;
  default_permission?: boolean;
  nsfw?: boolean;
  version?: string;
}

export interface DiscordApplicationCommandOption {
  type: ApplicationCommandOptionType;
  name: string;
  name_localizations?: Record<string, string>;
  description: string;
  description_localizations?: Record<string, string>;
  required?: boolean;
  choices?: Array<{
    name: string;
    name_localizations?: Record<string, string>;
    value: string | number;
  }>;
  options?: DiscordApplicationCommandOption[];
  channel_types?: number[];
  min_value?: number;
  max_value?: number;
  min_length?: number;
  max_length?: number;
  autocomplete?: boolean;
}

// Message flags
export enum MessageFlags {
  CROSSPOSTED = 1 << 0,
  IS_CROSSPOST = 1 << 1,
  SUPPRESS_EMBEDS = 1 << 2,
  SOURCE_MESSAGE_DELETED = 1 << 3,
  URGENT = 1 << 4,
  HAS_THREAD = 1 << 5,
  EPHEMERAL = 1 << 6,
  LOADING = 1 << 7,
}
