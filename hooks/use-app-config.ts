"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"

import {
  emptyAppConfig,
  isAppConfigured,
  readStoredAppConfig,
  saveStoredAppConfig,
  subscribeToAppConfig,
  subscribeToHydration,
  type AppConfig,
} from "@/lib/app-config"

export function useAppConfig() {
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false
  )

  const config = useSyncExternalStore<AppConfig>(
    subscribeToAppConfig,
    readStoredAppConfig,
    () => emptyAppConfig
  )

  const saveConfig = useCallback((nextConfig: AppConfig) => {
    return saveStoredAppConfig(nextConfig)
  }, [])

  const isConfigured = useMemo(() => isAppConfigured(config), [config])

  return {
    config,
    isConfigured,
    isHydrated,
    saveConfig,
  }
}
