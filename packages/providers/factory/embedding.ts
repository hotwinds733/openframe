import { createOpenAI } from '@ai-sdk/openai'
import type { EmbeddingModel } from 'ai'
import type { AIConfig } from '../config'
import { createVolcengineEmbeddingModel } from './platforms/volcengine'
import { createOllamaEmbeddingModel } from './platforms/ollama'

export function createEmbeddingModel(
  providerId: string,
  modelId: string,
  config: AIConfig,
): EmbeddingModel | null {
  const cfg = config.providers[providerId]
  if (!cfg) return null
  const apiKey = cfg.apiKey || undefined
  const baseURL = cfg.baseUrl || undefined

  switch (providerId) {
    case 'openai':
      return createOpenAI({ apiKey, baseURL }).embeddingModel(modelId)
    case 'volcengine':
      return createVolcengineEmbeddingModel(modelId, apiKey, baseURL)
    case 'ollama':
      return createOllamaEmbeddingModel(modelId, apiKey, baseURL)
    default:
      return null
  }
}

export function getDefaultEmbeddingModel(config: AIConfig): EmbeddingModel | null {
  const key = config.models.embedding
  if (!key) return null
  const idx = key.indexOf(':')
  if (idx === -1) return null
  return createEmbeddingModel(key.slice(0, idx), key.slice(idx + 1), config)
}
