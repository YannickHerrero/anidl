"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"

import { useAnimeTracking } from "@/hooks/use-anime-tracking"
import { useCountdown } from "@/hooks/use-countdown"
import {
  fetchAnilistAiring,
  formatCountdown,
  type AnilistMedia,
} from "@/lib/anilist"
import { type TrackedAnime } from "@/lib/anime-tracking"

type AiringEntry = {
  tracked: TrackedAnime
  media: AnilistMedia
  episode: number
  airingAt: number
}

export function AiringSection() {
  const { items } = useAnimeTracking()
  const trackedIds = items.map((item) => item.anilistId)
  const trackedIdsKey = trackedIds.join(",")
  const [airingMedia, setAiringMedia] = useState<AnilistMedia[]>([])
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const abortController = new AbortController()
    const ids = trackedIdsKey
      ? trackedIdsKey.split(",").map((value) => Number(value))
      : []

    fetchAnilistAiring(ids, abortController.signal)
      .then((media) => {
        setAiringMedia(media)
        setHasError(false)
      })
      .catch(() => {
        if (!abortController.signal.aborted) {
          setAiringMedia([])
          setHasError(true)
        }
      })

    return () => {
      abortController.abort()
    }
  }, [trackedIdsKey])

  const mediaById = new Map(airingMedia.map((media) => [media.id, media]))

  const entries: AiringEntry[] = items
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

  if (entries.length === 0) {
    return null
  }

  return (
    <section className="grid gap-4 rounded-[30px] border border-border/70 bg-card/80 p-5 shadow-[0_18px_80px_-42px_rgba(18,38,33,0.38)] sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-semibold tracking-[0.24em] text-primary/80 uppercase">
          Airing
        </p>
        <Link
          href="/list"
          className="text-xs font-medium text-primary hover:underline"
        >
          Manage list
        </Link>
      </div>

      {hasError ? (
        <p className="text-sm text-muted-foreground">
          Could not reach AniList for airing schedules right now.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {entries.map((entry) => (
          <AiringCard key={entry.tracked.anilistId} entry={entry} />
        ))}
      </div>
    </section>
  )
}

function AiringCard({ entry }: { entry: AiringEntry }) {
  const secondsUntil = useCountdown(entry.airingAt)

  return (
    <Link
      href={`/media/tv/${entry.tracked.tmdbId}`}
      className="group grid gap-0 overflow-hidden rounded-[20px] border border-border/70 bg-card/85 shadow-[0_18px_80px_-42px_rgba(18,38,33,0.42)] transition-transform duration-200 hover:-translate-y-0.5 hover:border-primary/35"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-[linear-gradient(145deg,rgba(208,237,225,0.42),rgba(243,219,180,0.35))]">
        {entry.tracked.coverImage ? (
          <Image
            src={entry.tracked.coverImage}
            alt={`Cover for ${entry.tracked.title}`}
            className="h-full w-full object-cover"
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          />
        ) : null}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent p-3 text-center text-white">
          <p className="text-sm font-semibold">Ep {entry.episode}</p>
          <p className="text-xs text-white/85">
            {formatCountdown(secondsUntil)}
          </p>
        </div>
      </div>

      <div className="h-1 bg-rose-500/80" />
    </Link>
  )
}
