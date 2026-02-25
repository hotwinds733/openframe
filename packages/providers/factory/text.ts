import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createXai } from '@ai-sdk/xai'
import { createAzure } from '@ai-sdk/azure'
import { createMistral } from '@ai-sdk/mistral'
import { createGroq } from '@ai-sdk/groq'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { createTogetherAI } from '@ai-sdk/togetherai'
import { createPerplexity } from '@ai-sdk/perplexity'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { AIProviderConfig } from '../config'
import type { AnyModel } from './types'
import { createVolcengineTextModel } from './platforms/volcengine'
import { createZhipuTextModel } from './platforms/zhipu'
import { createOllamaTextModel } from './platforms/ollama'
import { createQwenTextModel } from './platforms/qwen'

export function buildTextModel(providerId: string, modelId: string, cfg: AIProviderConfig): AnyModel | null {
  const apiKey = cfg.apiKey || undefined
  const baseURL = cfg.baseUrl || undefined

  switch (providerId) {
    case 'openai':
      return createOpenAI({ apiKey, baseURL })(modelId)
    case 'anthropic':
      return createAnthropic({ apiKey, baseURL })(modelId)
    case 'google':
      return createGoogleGenerativeAI({ apiKey, baseURL })(modelId)
    case 'xai':
      return createXai({ apiKey, baseURL })(modelId)
    case 'azure':
      return createAzure({ apiKey, baseURL })(modelId)
    case 'mistral':
      return createMistral({ apiKey, baseURL })(modelId)
    case 'groq':
      return createGroq({ apiKey, baseURL })(modelId)
    case 'deepseek':
      return createDeepSeek({ apiKey, baseURL })(modelId)
    case 'togetherai':
      return createTogetherAI({ apiKey, baseURL })(modelId)
    case 'perplexity':
      return createPerplexity({ apiKey, baseURL })(modelId)
    case 'volcengine': {
      return createVolcengineTextModel(modelId, apiKey, baseURL)
    }
    case 'qwen': {
      return createQwenTextModel(modelId, apiKey, baseURL)
    }
    case 'zhipu': {
      return createZhipuTextModel(modelId, apiKey, baseURL)
    }
    case 'ollama':
      return createOllamaTextModel(modelId, baseURL)
    default:
      if (!baseURL) return null
      return createOpenAICompatible({
        name: providerId,
        baseURL,
        apiKey: apiKey ?? 'openframe',
      })(modelId)
  }
}
