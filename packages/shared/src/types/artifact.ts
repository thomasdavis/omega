/**
 * Artifact-related types
 */

export interface Artifact {
  id: string;
  title: string;
  artifactType: 'html' | 'svg' | 'markdown' | 'folder';
  content?: string;
  createdAt: Date;
  createdBy: string;
  url: string;
}

export interface ArtifactMetadata {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  fileSize?: number;
}
