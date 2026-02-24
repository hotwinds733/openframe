import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { PROVIDER_BASE_URLS } from '../../constants'

export function createZhipuTextModel(modelId: string, apiKey?: string, baseURL?: string) {
  const provider = createOpenAICompatible({
    name: 'zhipu',
    baseURL: baseURL ?? PROVIDER_BASE_URLS.zhipu,
    apiKey,
  })
  return provider(modelId)
}

export function createZhipuImageModel(modelId: string, apiKey?: string, baseURL?: string) {
  return createOpenAICompatible({
    name: 'zhipu',
    baseURL: baseURL ?? PROVIDER_BASE_URLS.zhipu,
    apiKey,
  }).imageModel(modelId)
}
