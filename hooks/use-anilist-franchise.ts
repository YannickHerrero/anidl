"use client"

import { useEffect, useState } from "react"

import { loadAnilistProgress } from "@/hooks/use-anilist-progress"
import { useAnimeTracking } from "@/hooks/use-anime-tracking"
import { useAppConfig } from "@/hooks/use-app-config"
import {
  fetchAnilistFranchise,
  type AnilistFranchiseEntry,
} from "@/lib/anilist"

// Cache the franchise chain per starting AniList id (relations rarely change).
const franchiseCache = new Map<number, Promise<AnilistFranchiseEntry[]>>()

function loadFranchise(anilistId: number) {
  const cached = franchiseCache.get(anilistId)
  if (cached) {
    return cached
  }

  const promise = fetchAnilistFranchise(anilistId)
  franchiseCache.set(anilistId, promise)
  promise.catch(() => {
    if (franchiseCache.get(anilistId) === promise) {
      franchiseCache.delete(anilistId)
    }
  })
  return promise
}

function computeAbsoluteWatched(
  chain: AnilistFranchiseEntry[],
  progressMap: Map<number, number>
) {
  let absolute = 0

  for (const entry of chain) {
    const progress = progressMap.get(entry.id) ?? 0

    if (entry.episodes != null && progress >= entry.episodes) {
      absolute += entry.episodes
      continue
    }

    // Partially watched, or airing with an unknown total: can't go further.
    absolute += progress
    break
  }

  return absolute
}

/**
 * Absolute (whole-franchise) episodes watched for a tracked anime, sourced from
 * the configured user's AniList progress across the sequel/prequel chain.
 * Returns `null` when not tracked, no AniList profile, the franchise isn't on
 * the user's list, or the chain can't be resolved — callers fall back to manual.
 */
export function useAnilistFranchiseWatched(tmdbId: number): number | null {
  const { config } = useAppConfig()
  const { getByTmdbId } = useAnimeTracking()
  const user = config.anilistUser
  const anilistId = getByTmdbId(tmdbId)?.anilistId ?? null
  const [watched, setWatched] = useState<number | null>(null)

  useEffect(() => {
    if (!user || anilistId === null) {
      const reset = () => setWatched(null)
      reset()
      return
    }

    let active = true
    Promise.all([loadAnilistProgress(user), loadFranchise(anilistId)])
      .then(([progressMap, chain]) => {
        if (!active) {
          return
        }
        const onList = chain.some((entry) => progressMap.has(entry.id))
        setWatched(onList ? computeAbsoluteWatched(chain, progressMap) : null)
      })
      .catch(() => {
        if (active) {
          setWatched(null)
        }
      })

    return () => {
      active = false
    }
  }, [user, anilistId])

  return watched
}
