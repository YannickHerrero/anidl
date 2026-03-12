export const APP_CONFIG_STORAGE_KEY = "anidl.app-config"
export const APP_CONFIG_STORAGE_EVENT = "anidl:app-config-change"

export type AppConfig = {
  tmdbApiKey: string
  realDebridApiKey: string
}

export const emptyAppConfig: AppConfig = {
  tmdbApiKey: "",
  realDebridApiKey: "",
}

export function normalizeAppConfig(
  input?: Partial<AppConfig> | null
): AppConfig {
  return {
    tmdbApiKey: input?.tmdbApiKey?.trim() ?? "",
    realDebridApiKey: input?.realDebridApiKey?.trim() ?? "",
  }
}

export function isAppConfigured(config: AppConfig) {
  return config.tmdbApiKey.length > 0 && config.realDebridApiKey.length > 0
}

export function readStoredAppConfig() {
  if (typeof window === "undefined") {
    return emptyAppConfig
  }

  try {
    const raw = window.localStorage.getItem(APP_CONFIG_STORAGE_KEY)

    if (!raw) {
      return emptyAppConfig
    }

    return normalizeAppConfig(JSON.parse(raw) as Partial<AppConfig>)
  } catch {
    return emptyAppConfig
  }
}

export function subscribeToAppConfig(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {}
  }

  const handleChange = () => {
    onStoreChange()
  }

  window.addEventListener("storage", handleChange)
  window.addEventListener(APP_CONFIG_STORAGE_EVENT, handleChange)

  return () => {
    window.removeEventListener("storage", handleChange)
    window.removeEventListener(APP_CONFIG_STORAGE_EVENT, handleChange)
  }
}

export function subscribeToHydration() {
  return () => {}
}

export function saveStoredAppConfig(config: AppConfig) {
  const normalized = normalizeAppConfig(config)

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      APP_CONFIG_STORAGE_KEY,
      JSON.stringify(normalized)
    )
    window.dispatchEvent(new Event(APP_CONFIG_STORAGE_EVENT))
  }

  return normalized
}
