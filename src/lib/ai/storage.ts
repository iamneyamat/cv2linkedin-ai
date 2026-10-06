import type { AIProviderId, DiscoveredModel } from '../../types/index.ts';

export function getProviderKeyStorageName(provider: AIProviderId): string {
  return `cv2linkedin_byok_key_${provider}`;
}

export function getProviderModelsStorageName(provider: AIProviderId): string {
  return `cv2linkedin_discovered_models_${provider}`;
}

export function getStoredKeyForProvider(provider: AIProviderId): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(getProviderKeyStorageName(provider)) || '';
}

export function setStoredKeyForProvider(provider: AIProviderId, key: string): void {
  if (typeof window === 'undefined') return;
  if (!key) {
    sessionStorage.removeItem(getProviderKeyStorageName(provider));
  } else {
    sessionStorage.setItem(getProviderKeyStorageName(provider), key.trim());
  }
}

export function clearStoredKeyForProvider(provider: AIProviderId): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(getProviderKeyStorageName(provider));
  sessionStorage.removeItem(getProviderModelsStorageName(provider));
}

export function getStoredModelsForProvider(provider: AIProviderId): DiscoveredModel[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(getProviderModelsStorageName(provider));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function setStoredModelsForProvider(provider: AIProviderId, models: DiscoveredModel[]): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(getProviderModelsStorageName(provider), JSON.stringify(models));
}
