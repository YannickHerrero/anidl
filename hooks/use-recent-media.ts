"use client"

import { useCallback, useSyncExternalStore } from "react"

import {
  addRecentMediaItem,
  emptyRecentMedia,
  readStoredRecentMedia,
  subscribeToRecentMedia,
  type RecentMediaItem,
} from "@/lib/recent-media"
import { type SearchMediaItem } from "@/lib/tmdb"

export function useRecentMedia() {
  const items = useSyncExternalStore<RecentMediaItem[]>(
    subscribeToRecentMedia,
    readStoredRecentMedia,
    () => emptyRecentMedia
  )

  const addItem = useCallback((item: SearchMediaItem) => {
    return addRecentMediaItem(item)
  }, [])

  return {
    items,
    addItem,
  }
}
