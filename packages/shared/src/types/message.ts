/**
 * Message-related types
 */

export interface Message {
  id: string;
  content: string;
  userId: string;
  username: string;
  channelId: string;
  channelName?: string;
  guildId?: string;
  timestamp: Date;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  contentType?: string;
  size: number;
}

export interface User {
  id: string;
  username: string;
  discriminator?: string;
  avatar?: string;
}
