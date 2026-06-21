"use client"

import { useEffect, useState } from "react"

import { useAnimeTracking } from "@/hooks/use-anime-tracking"
import { fetchAnilistAiring, type AnilistMedia } from "@/lib/anilist"
import { type TrackedAnime } from "@/lib/anime-tracking"

export type AiringEntry = {
  tracked: TrackedAnime
  media: AnilistMedia
  episode: number
  airingAt: number
}

/**
 * Joins the local tracking list with AniList airing data. Returns the full
 * media map (for My List status) plus the subset that has an upcoming episode,
 * sorted by air time. Used by the home strip, the Airing page, and My List.
 */
export function useAiring() {
  const { items } = useAnimeTracking()
  const idsKey = items.map((item) => item.anilistId).join(",")
  const [mediaById, setMediaById] = useState<Map<number, AnilistMedia>>(
    new Map()
  )
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle")

  useEffect(() => {
    const abortController = new AbortController()
    const ids = idsKey ? idsKey.split(",").map((value) => Number(value)) : []
    const begin = () => setStatus("loading")
    begin()

    fetchAnilistAiring(ids, abortController.signal)
      .then((media) => {
        setMediaById(new Map(media.map((entry) => [entry.id, entry])))
        setStatus("idle")
      })
      .catch(() => {
        if (!abortController.signal.aborted) {
          setMediaById(new Map())
          setStatus("error")
        }
      })

    return () => {
      abortController.abort()
    }
  }, [idsKey])

  const airing: AiringEntry[] = items
    .flatMap((tracked) => {
      const media = mediaById.get(tracked.anilistId)

      if (!media?.nextAiringEpisode) {
        return []
      }

      return [
        {
          tracked,
          media,
          episode: media.nextAiringEpisode.episode,
          airingAt: media.nextAiringEpisode.airingAt,
        },
      ]
    })
    .sort((left, right) => left.airingAt - right.airingAt)

  return { items, mediaById, airing, status }
}
