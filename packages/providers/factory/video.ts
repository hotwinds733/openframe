import type { AIProviderConfig } from '../config'
import { customRest } from './custom-rest'
import type {
  AnyModel,
  CustomRestModel,
  VideoGenerationOptions,
  VideoGenerationResult,
  VideoModel,
  VideoPrompt,
} from './types'
import { isCustomRestModel } from './types'
import { createQwenVideoModel } from './platforms/qwen'
import { generateVolcengineVideo } from './platforms/volcengine'

function toTextPrompt(prompt: VideoPrompt): string {
  if (typeof prompt === 'string') return prompt
  return prompt.text || ''
}

function toImageRefs(prompt: VideoPrompt): Array<string | number[]> {
  if (typeof prompt === 'string' || !Array.isArray(prompt.images)) return []
  return prompt.images
}

export function buildVideoModel(providerId: string, modelId: string, cfg: AIProviderConfig): AnyModel | null {
  const apiKey = cfg.apiKey || undefined
  const baseURL = cfg.baseUrl || undefined

  switch (providerId) {
    case 'qwen':
      return createQwenVideoModel(modelId, apiKey, baseURL)
    case 'volcengine':
      return customRest(providerId, modelId, 'video', cfg)
    default:
      return null
  }
}

export async function generateVideoWithProviderSupport(
  args: {
    model: VideoModel | CustomRestModel
    prompt: VideoPrompt
    options?: VideoGenerationOptions
  },
): Promise<VideoGenerationResult> {
  if (isCustomRestModel(args.model)) {
    if (args.model.providerId === 'volcengine') {
      const apiKey = args.model.apiKey || ''
      if (!apiKey) throw new Error('Volcengine API key is missing.')
      return generateVolcengineVideo({
        modelId: args.model.modelId,
        apiKey,
        baseURL: args.model.baseUrl || undefined,
        prompt: toTextPrompt(args.prompt),
        images: toImageRefs(args.prompt),
        ratio: args.options?.ratio,
        durationSec: args.options?.durationSec,
      })
    }
    throw new Error(`Video generation is not implemented for provider: ${args.model.providerId}`)
  }

  throw new Error('SDK video generation is not wired yet. Please add provider-specific implementation.')
}
