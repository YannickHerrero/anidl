"use client"

import { useCallback, useSyncExternalStore } from "react"

import {
  emptyWatchProgress,
  getMediaWatchProgress,
  readStoredWatchProgress,
  setMovieWatched,
  setTvEpisodeWatched,
  subscribeToWatchProgress,
  type MediaWatchProgress,
} from "@/lib/watch-progress"
import { type SearchMediaType } from "@/lib/tmdb"

export function useWatchProgress() {
  const items = useSyncExternalStore<MediaWatchProgress[]>(
    subscribeToWatchProgress,
    readStoredWatchProgress,
    () => emptyWatchProgress
  )

  const getItem = useCallback(
    (mediaType: SearchMediaType, tmdbId: number) => {
      return items.find(
        (item) => item.mediaType === mediaType && item.tmdbId === tmdbId
      )
    },
    [items]
  )

  const refreshItem = useCallback(
    (mediaType: SearchMediaType, tmdbId: number) => {
      return getMediaWatchProgress(mediaType, tmdbId)
    },
    []
  )

  const markMovieWatched = useCallback((tmdbId: number, watched: boolean) => {
    return setMovieWatched(tmdbId, watched)
  }, [])

  const markEpisodeWatched = useCallback(
    (
      tmdbId: number,
      seasonNumber: number,
      episodeNumber: number,
      watched: boolean
    ) => {
      return setTvEpisodeWatched(tmdbId, seasonNumber, episodeNumber, watched)
    },
    []
  )

  return {
    items,
    getItem,
    refreshItem,
    markMovieWatched,
    markEpisodeWatched,
  }
}
