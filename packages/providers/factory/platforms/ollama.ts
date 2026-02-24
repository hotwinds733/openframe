import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { EmbeddingModel } from 'ai'
import type { LanguageModel } from 'ai'
import { PROVIDER_BASE_URLS } from '../../constants'

function normalizeOllamaBaseURL(baseURL: string | undefined): string {
  const raw = (baseURL ?? PROVIDER_BASE_URLS.ollama).replace(/\/$/, '')
  return raw.endsWith('/v1') ? raw : `${raw}/v1`
}

export function createOllamaTextModel(modelId: string, baseURL?: string): LanguageModel {
  return createOpenAICompatible({
    name: 'ollama',
    baseURL: normalizeOllamaBaseURL(baseURL),
    apiKey: 'ollama',
  })(modelId)
}

export function createOllamaEmbeddingModel(modelId: string, apiKey?: string, baseURL?: string): EmbeddingModel {
  return createOpenAICompatible({
    name: 'ollama',
    baseURL: normalizeOllamaBaseURL(baseURL),
    apiKey: apiKey ?? 'ollama',
  }).embeddingModel(modelId)
}
