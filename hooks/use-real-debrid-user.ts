"use client"

import { useEffect, useState } from "react"

import { useAppConfig } from "@/hooks/use-app-config"
import {
  validateRealDebridApiKey,
  type RealDebridUser,
} from "@/lib/real-debrid"

type RealDebridUserState =
  | { status: "idle" | "loading"; user: null }
  | { status: "success"; user: RealDebridUser }
  | { status: "error"; user: null }

export function useRealDebridUser() {
  const { config } = useAppConfig()
  const apiKey = config.realDebridApiKey
  const [state, setState] = useState<RealDebridUserState>({
    status: "idle",
    user: null,
  })

  useEffect(() => {
    if (!apiKey) {
      const reset = () => setState({ status: "idle", user: null })
      reset()
      return
    }

    const abortController = new AbortController()
    const begin = () => setState({ status: "loading", user: null })
    begin()

    validateRealDebridApiKey({ apiKey, signal: abortController.signal })
      .then((user) => setState({ status: "success", user }))
      .catch(() => {
        if (!abortController.signal.aborted) {
          setState({ status: "error", user: null })
        }
      })

    return () => {
      abortController.abort()
    }
  }, [apiKey])

  return state
}
