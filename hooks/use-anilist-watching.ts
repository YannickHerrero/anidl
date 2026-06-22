"use client"

import { useEffect, useState } from "react"

import { useAppConfig } from "@/hooks/use-app-config"
import {
  fetchAnilistWatching,
  type AnilistWatchingEntry,
} from "@/lib/anilist"

type WatchingState =
  | { status: "idle" | "loading"; entries: AnilistWatchingEntry[] }
  | { status: "success"; entries: AnilistWatchingEntry[] }
  | { status: "error"; entries: AnilistWatchingEntry[] }

export function useAnilistWatching() {
  const { config } = useAppConfig()
  const user = config.anilistUser
  const [state, setState] = useState<WatchingState>({
    status: "idle",
    entries: [],
  })

  useEffect(() => {
    if (!user) {
      const reset = () => setState({ status: "idle", entries: [] })
      reset()
      return
    }

    const abortController = new AbortController()
    const begin = () => setState({ status: "loading", entries: [] })
    begin()

    fetchAnilistWatching(user, abortController.signal)
      .then((entries) => setState({ status: "success", entries }))
      .catch(() => {
        if (!abortController.signal.aborted) {
          setState({ status: "error", entries: [] })
        }
      })

    return () => {
      abortController.abort()
    }
  }, [user])

  return { ...state, user }
}
