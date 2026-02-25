import type { AIConfig } from './config'
import {
  getAllProviders,
  getProviderById,
  type ModelDef,
  type ModelType,
  type ProviderDef,
} from './providers'

export function getConfigProviders(config: AIConfig): ProviderDef[] {
  return getAllProviders(config.customProviders)
}

function providerById(providerId: string, config: AIConfig): ProviderDef | undefined {
  return getProviderById(providerId, config.customProviders)
}

export function getProviderModels(
  providerId: string,
  config: AIConfig,
  type?: ModelType,
): ModelDef[] {
  const provider = providerById(providerId, config)
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
  return getConfigProviders(config)
    .filter((provider) => !!config.providers[provider.id]?.enabled)
    .map((provider) => ({
      provider,
      models: getEnabledProviderModels(provider.id, config, type),
    }))
    .filter((item) => item.models.length > 0)
}
