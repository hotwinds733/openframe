import type { AIProviderConfig } from '../config'
import type { ModelType } from '../providers'
import type { CustomRestModel } from './types'

export function customRest(
  providerId: string,
  modelId: string,
  modelType: ModelType,
  cfg: AIProviderConfig,
): CustomRestModel {
  return {
    _tag: 'custom-rest',
    providerId,
    modelId,
    modelType,
    apiKey: cfg.apiKey || undefined,
    baseUrl: cfg.baseUrl || undefined,
  }
}
