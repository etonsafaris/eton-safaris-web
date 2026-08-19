export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface RecordRow {
  id?: string | number;
  [key: string]: Json | undefined;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'url' | 'number' | 'email' | 'select' | 'date';
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export interface CollectionConfig {
  id: string;
  label: string;
  table: string;
  aliases?: string[];
  icon: string;
  subtitle: string;
  view: 'grid' | 'table' | 'overview' | 'custom';
  publicPath?: string;
  addLabel?: string;
  fields: FormField[];
}

export interface SessionUser {
  id: string;
  email?: string;
  fullName?: string;
}
