"use client"

import { useCallback, useSyncExternalStore } from "react"

import { type AnilistMedia } from "@/lib/anilist"
import {
  addTrackedAnime,
  emptyTrackedAnime,
  readStoredTrackedAnime,
  removeTrackedAnimeByTmdbId,
  subscribeToTrackedAnime,
  updateTrackedAnimeMatch,
  type TrackedAnime,
} from "@/lib/anime-tracking"

export function useAnimeTracking() {
  const items = useSyncExternalStore<TrackedAnime[]>(
    subscribeToTrackedAnime,
    readStoredTrackedAnime,
    () => emptyTrackedAnime
  )

  const addItem = useCallback(
    (input: {
      anilistId: number
      tmdbId: number
      title: string
      coverImage: string | null
    }) => {
      return addTrackedAnime(input)
    },
    []
  )

  const removeItem = useCallback((tmdbId: number) => {
    return removeTrackedAnimeByTmdbId(tmdbId)
  }, [])

  const updateMatch = useCallback((tmdbId: number, media: AnilistMedia) => {
    return updateTrackedAnimeMatch(tmdbId, media)
  }, [])

  const getByTmdbId = useCallback(
    (tmdbId: number) => items.find((item) => item.tmdbId === tmdbId),
    [items]
  )

  return {
    items,
    addItem,
    removeItem,
    updateMatch,
    getByTmdbId,
  }
}
