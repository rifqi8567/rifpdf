// ============================================
// DocuMind AI — Core Type Definitions
// ============================================

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  plan: 'free' | 'pro' | 'enterprise';
  credits_remaining: number;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface PDFDocument {
  id: string;
  user_id: string;
  folder_id?: string | null;
  name: string;
  file_url: string;
  file_size: number;
  page_count: number;
  thumbnail_url?: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  document_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model_used?: string;
  tokens_used?: number;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  document_id: string;
  title: string;
  messages: ChatMessage[];
  ai_model: AIModel;
  created_at: string;
  updated_at: string;
}

export type AIModel =
  | 'ollama/auto'
  | 'google/gemini-2.0-flash-exp'
  | 'anthropic/claude-3.5-sonnet'
  | 'deepseek/deepseek-chat'
  | 'openai/gpt-4o'
  | 'qwen/qwen-2.5-72b-instruct';

export interface AIModelConfig {
  id: AIModel;
  name: string;
  provider: string;
  icon: string;
  description: string;
  strengths: string[];
  costPerMToken: number;
  maxTokens: number;
  speed: 'fast' | 'medium' | 'slow';
}

export type TaskType =
  | 'chat'
  | 'summarize'
  | 'analyze'
  | 'translate'
  | 'extract'
  | 'explain'
  | 'compare';

export type PDFToolType =
  | 'merge'
  | 'split'
  | 'compress'
  | 'sign'
  | 'convert'
  | 'ocr'
  | 'image-to-pdf'
  | 'pdf-to-image'
  | 'pdf-to-jpg'
  | 'word-to-pdf'
  | 'excel-to-pdf'
  | 'ppt-to-pdf';

export interface PDFTool {
  id: PDFToolType;
  name: string;
  description: string;
  icon: string;
  category: 'transform' | 'edit' | 'convert' | 'ai';
  isPro: boolean;
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

export interface UsageStats {
  total_documents: number;
  total_chats: number;
  total_pages_processed: number;
  credits_used: number;
  credits_remaining: number;
  storage_used: number;
  storage_limit: number;
}

export interface PlanConfig {
  name: string;
  price: number;
  credits: number;
  storage: number;
  features: string[];
  highlighted: boolean;
}
