"use client"

import { useCallback, useEffect, useState } from "react"

import { useAnimeTracking } from "@/hooks/use-anime-tracking"
import { useAppConfig } from "@/hooks/use-app-config"
import { fetchAnilistProgressMap } from "@/lib/anilist"

// Dedupe concurrent loads (and reuse across components on the same page) by
// caching the in-flight promise per configured user. Cleared if it rejects.
let cache: { user: string; promise: Promise<Map<number, number>> } | null = null

export function loadAnilistProgress(user: string) {
  if (cache && cache.user === user) {
    return cache.promise
  }

  const promise = fetchAnilistProgressMap(user)
  cache = { user, promise }
  promise.catch(() => {
    if (cache?.promise === promise) {
      cache = null
    }
  })
  return promise
}

/**
 * Returns a resolver `(tmdbId) => number | undefined`. For a tracked anime
 * whose AniList entry is on the configured user's list, it returns the watched
 * episode count from AniList; otherwise `undefined` (caller falls back to local
 * progress and manual marking).
 */
export function useAnilistWatchedResolver() {
  const { config } = useAppConfig()
  const { items } = useAnimeTracking()
  const user = config.anilistUser
  const [map, setMap] = useState<Map<number, number>>(new Map())

  useEffect(() => {
    if (!user) {
      const reset = () => setMap(new Map())
      reset()
      return
    }

    let active = true
    loadAnilistProgress(user)
      .then((next) => {
        if (active) {
          setMap(next)
        }
      })
      .catch(() => {
        if (active) {
          setMap(new Map())
        }
      })

    return () => {
      active = false
    }
  }, [user])

  return useCallback(
    (tmdbId: number): number | undefined => {
      const tracked = items.find((item) => item.tmdbId === tmdbId)

      if (!tracked) {
        return undefined
      }

      return map.get(tracked.anilistId)
    },
    [items, map]
  )
}
