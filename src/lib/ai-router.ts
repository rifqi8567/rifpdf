import type { AIModel, AIModelConfig, TaskType } from '@/types';

// ============================================
// AI Model Registry
// ============================================

export const AI_MODELS: Record<AIModel, AIModelConfig> = {
  'google/gemini-2.0-flash-exp': {
    id: 'google/gemini-2.0-flash-exp',
    name: 'Gemini Flash',
    provider: 'Google',
    icon: '⚡',
    description: 'Ultra-fast responses for quick tasks',
    strengths: ['Speed', 'Efficiency', 'Multilingual'],
    costPerMToken: 0.075,
    maxTokens: 8192,
    speed: 'fast',
  },
  'anthropic/claude-3.5-sonnet': {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude Sonnet',
    provider: 'Anthropic',
    icon: '🧠',
    description: 'Deep analysis and nuanced understanding',
    strengths: ['Analysis', 'Reasoning', 'Accuracy'],
    costPerMToken: 3.0,
    maxTokens: 8192,
    speed: 'medium',
  },
  'deepseek/deepseek-chat': {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek',
    provider: 'DeepSeek',
    icon: '💰',
    description: 'Cost-efficient with great quality',
    strengths: ['Cost', 'Coding', 'Math'],
    costPerMToken: 0.14,
    maxTokens: 8192,
    speed: 'fast',
  },
  'openai/gpt-4o': {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    icon: '🎯',
    description: 'Advanced reasoning and complex tasks',
    strengths: ['Reasoning', 'Creativity', 'Versatile'],
    costPerMToken: 2.5,
    maxTokens: 4096,
    speed: 'medium',
  },
  'qwen/qwen-2.5-72b-instruct': {
    id: 'qwen/qwen-2.5-72b-instruct',
    name: 'Qwen 2.5',
    provider: 'Alibaba',
    icon: '🌏',
    description: 'Excellent multilingual capabilities',
    strengths: ['Multilingual', 'Chinese', 'Indonesian'],
    costPerMToken: 0.9,
    maxTokens: 8192,
    speed: 'medium',
  },
};

// ============================================
// Smart AI Router — selects best model by task
// ============================================

const TASK_MODEL_MAP: Record<TaskType, AIModel> = {
  chat: 'google/gemini-2.0-flash-exp',
  summarize: 'google/gemini-2.0-flash-exp',
  analyze: 'anthropic/claude-3.5-sonnet',
  translate: 'qwen/qwen-2.5-72b-instruct',
  extract: 'deepseek/deepseek-chat',
  explain: 'openai/gpt-4o',
  compare: 'anthropic/claude-3.5-sonnet',
};

export function selectAIModel(
  taskType: TaskType,
  options?: {
    preferCheap?: boolean;
    preferFast?: boolean;
    preferAccurate?: boolean;
    language?: string;
  }
): AIModel {
  // Language-based routing
  if (options?.language && ['zh', 'id', 'ms', 'ja', 'ko'].includes(options.language)) {
    return 'qwen/qwen-2.5-72b-instruct';
  }

  // Cost-based routing
  if (options?.preferCheap) {
    return 'deepseek/deepseek-chat';
  }

  // Speed-based routing
  if (options?.preferFast) {
    return 'google/gemini-2.0-flash-exp';
  }

  // Accuracy-based routing
  if (options?.preferAccurate) {
    return 'anthropic/claude-3.5-sonnet';
  }

  // Default task-based routing
  return TASK_MODEL_MAP[taskType];
}

export function getModelConfig(model: AIModel): AIModelConfig {
  return AI_MODELS[model];
}

export function getAllModels(): AIModelConfig[] {
  return Object.values(AI_MODELS);
}
