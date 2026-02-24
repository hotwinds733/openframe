import type { AIConfig } from './config'
import { AI_PROVIDERS, type ModelDef, type ModelType, type ProviderDef } from './providers'

function providerById(providerId: string): ProviderDef | undefined {
  return AI_PROVIDERS.find((provider) => provider.id === providerId)
}

export function getProviderModels(
  providerId: string,
  config: AIConfig,
  type?: ModelType,
): ModelDef[] {
  const provider = providerById(providerId)
  if (!provider) return []
  const builtin = provider.models
  const custom = config.customModels[providerId] ?? []
  const merged = [...builtin, ...custom]
  return type ? merged.filter((model) => model.type === type) : merged
}

export function getVisibleProviderModels(
  providerId: string,
  config: AIConfig,
  type?: ModelType,
): ModelDef[] {
  const all = getProviderModels(providerId, config, type)
  return all.filter((model) => !config.hiddenModels?.[`${providerId}:${model.id}`])
}

export function getEnabledProviderModels(
  providerId: string,
  config: AIConfig,
  type?: ModelType,
): ModelDef[] {
  const visible = getVisibleProviderModels(providerId, config, type)
  return visible.filter((model) => !!config.enabledModels?.[`${providerId}:${model.id}`])
}

export function getSelectableModelsByType(
  config: AIConfig,
  type: ModelType,
): Array<{ provider: ProviderDef; models: ModelDef[] }> {
  return AI_PROVIDERS
    .filter((provider) => !!config.providers[provider.id]?.enabled)
    .map((provider) => ({
      provider,
      models: getEnabledProviderModels(provider.id, config, type),
    }))
    .filter((item) => item.models.length > 0)
}
