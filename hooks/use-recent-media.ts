"use client"

import { useCallback, useSyncExternalStore } from "react"

import {
  addRecentMediaItem,
  readStoredRecentMedia,
  subscribeToRecentMedia,
  type RecentMediaItem,
} from "@/lib/recent-media"
import { type SearchMediaItem } from "@/lib/tmdb"

export function useRecentMedia() {
  const items = useSyncExternalStore<RecentMediaItem[]>(
    subscribeToRecentMedia,
    readStoredRecentMedia,
    () => []
  )

  const addItem = useCallback((item: SearchMediaItem) => {
    return addRecentMediaItem(item)
  }, [])

  return {
    items,
    addItem,
  }
}
