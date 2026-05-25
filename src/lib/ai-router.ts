import type { AIModel, AIModelConfig, TaskType } from '@/types';

export const AI_MODELS: Record<AIModel, AIModelConfig> = {
  'openrouter/free': {
    id: 'openrouter/free',
    name: 'OpenRouter Free',
    provider: 'OpenRouter',
    icon: '⚡',
    description: 'Router gratis OpenRouter yang memilih model free yang tersedia',
    strengths: ['Free', 'Fallback', 'No model maintenance'],
    costPerMToken: 0,
    maxTokens: 8192,
    speed: 'fast',
  },
};

const TASK_MODEL_MAP: Record<TaskType, AIModel> = {
  chat: 'openrouter/free',
  summarize: 'openrouter/free',
  analyze: 'openrouter/free',
  translate: 'openrouter/free',
  extract: 'openrouter/free',
  explain: 'openrouter/free',
  compare: 'openrouter/free',
};

export function selectAIModel(taskType: TaskType): AIModel {
  return TASK_MODEL_MAP[taskType];
}

export function getModelConfig(model: AIModel): AIModelConfig {
  return AI_MODELS[model];
}

export function getAllModels(): AIModelConfig[] {
  return Object.values(AI_MODELS);
}
