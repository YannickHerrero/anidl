"use client"

import { useCallback, useSyncExternalStore } from "react"

import {
  emptyWatchProgress,
  getMediaWatchProgress,
  readStoredWatchProgress,
  setMovieWatched,
  setTvEpisodeWatched,
  setTvEpisodesWatched,
  subscribeToWatchProgress,
  type EpisodeRef,
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

  const markEpisodesWatched = useCallback(
    (tmdbId: number, episodes: EpisodeRef[], watched: boolean) => {
      return setTvEpisodesWatched(tmdbId, episodes, watched)
    },
    []
  )

  return {
    items,
    getItem,
    refreshItem,
    markMovieWatched,
    markEpisodeWatched,
    markEpisodesWatched,
  }
}
