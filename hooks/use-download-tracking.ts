"use client"

import { useCallback, useSyncExternalStore } from "react"

import {
  emptyDownloadProgress,
  readStoredDownloadProgress,
  setMovieDownloaded,
  setTvEpisodeDownloaded,
  subscribeToDownloadProgress,
  type MediaDownloadProgress,
} from "@/lib/download-tracking"
import { type SearchMediaType } from "@/lib/tmdb"

export function useDownloadTracking() {
  const items = useSyncExternalStore<MediaDownloadProgress[]>(
    subscribeToDownloadProgress,
    readStoredDownloadProgress,
    () => emptyDownloadProgress
  )

  const getItem = useCallback(
    (mediaType: SearchMediaType, tmdbId: number) => {
      return items.find(
        (item) => item.mediaType === mediaType && item.tmdbId === tmdbId
      )
    },
    [items]
  )

  const markMovieDownloaded = useCallback(
    (tmdbId: number, downloaded: boolean) => {
      return setMovieDownloaded(tmdbId, downloaded)
    },
    []
  )

  const markEpisodeDownloaded = useCallback(
    (
      tmdbId: number,
      seasonNumber: number,
      episodeNumber: number,
      downloaded: boolean
    ) => {
      return setTvEpisodeDownloaded(
        tmdbId,
        seasonNumber,
        episodeNumber,
        downloaded
      )
    },
    []
  )

  return {
    items,
    getItem,
    markMovieDownloaded,
    markEpisodeDownloaded,
  }
}
