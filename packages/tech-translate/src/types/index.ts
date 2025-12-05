export { TechTranslationSpec, TechTranslationSpecSchema } from './schema.js';

export type OutputFormat = 'markdown' | 'json';
export type SpecLevel = 'mvp' | 'prod';

export interface TranslateOptions {
  format?: OutputFormat;
  level?: SpecLevel;
  include?: {
    db?: boolean;
    devops?: boolean;
    security?: boolean;
    testing?: boolean;
  };
}

export interface LLMProvider {
  translate(request: string, options?: TranslateOptions): Promise<TechTranslationSpec>;
}
