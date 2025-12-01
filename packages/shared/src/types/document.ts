/**
 * Document-related types (for collaborative editing)
 */

export interface Document {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
}

export interface Collaborator {
  userId: string;
  username: string;
  role: 'owner' | 'editor' | 'viewer';
  addedAt: Date;
}

export interface DocumentPresence {
  userId: string;
  username: string;
  action: 'join' | 'leave' | 'edit';
  timestamp: number;
}
