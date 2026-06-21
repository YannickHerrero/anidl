"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { useAnimeTracking } from "@/hooks/use-anime-tracking"
import {
  fetchAnilistAiring,
  formatCountdown,
  type AnilistMedia,
} from "@/lib/anilist"
import { type TrackedAnime } from "@/lib/anime-tracking"

export function AnimeListView() {
  const { items, removeItem } = useAnimeTracking()
  const trackedIdsKey = items.map((item) => item.anilistId).join(",")
  const [mediaById, setMediaById] = useState<Map<number, AnilistMedia>>(
    new Map()
  )

  useEffect(() => {
    const ids = trackedIdsKey
      ? trackedIdsKey.split(",").map((value) => Number(value))
      : []

    if (ids.length === 0) {
      setMediaById(new Map())
      return
    }

    const abortController = new AbortController()

    fetchAnilistAiring(ids, abortController.signal)
      .then((media) => {
        setMediaById(new Map(media.map((entry) => [entry.id, entry])))
      })
      .catch(() => {
        if (!abortController.signal.aborted) {
          setMediaById(new Map())
        }
      })

    return () => {
      abortController.abort()
    }
  }, [trackedIdsKey])

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="outline" className="rounded-2xl">
          <Link href="/search">Back to search</Link>
        </Button>
        <div className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
          {items.length} tracked
        </div>
      </div>

      {items.length === 0 ? (
        <section className="rounded-[30px] border border-dashed border-border/75 bg-card/65 p-8 text-center shadow-[0_18px_80px_-42px_rgba(18,38,33,0.35)]">
          <p className="text-xs font-semibold tracking-[0.28em] text-primary/80 uppercase">
            No anime tracked yet
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">
            Open an anime and add it to your list.
          </h2>
        </section>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <AnimeListRow
              key={item.anilistId}
              item={item}
              media={mediaById.get(item.anilistId)}
              onRemove={() => removeItem(item.tmdbId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AnimeListRow({
  item,
  media,
  onRemove,
}: {
  item: TrackedAnime
  media: AnilistMedia | undefined
  onRemove: () => void
}) {
  const nextEpisode = media?.nextAiringEpisode
  const secondsUntil = nextEpisode
    ? Math.max(0, nextEpisode.airingAt - Math.floor(Date.now() / 1000))
    : null

  return (
    <section className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 rounded-[24px] border border-border/70 bg-card/85 p-4 shadow-[0_18px_80px_-42px_rgba(18,38,33,0.38)]">
      <div className="relative aspect-[2/3] overflow-hidden rounded-[14px] border border-border/60 bg-[linear-gradient(145deg,rgba(208,237,225,0.42),rgba(243,219,180,0.35))]">
        {item.coverImage ? (
          <Image
            src={item.coverImage}
            alt={`Cover for ${item.title}`}
            className="h-full w-full object-cover"
            fill
            sizes="64px"
          />
        ) : null}
      </div>

      <div className="min-w-0">
        <Link
          href={`/media/tv/${item.tmdbId}`}
          className="block truncate text-lg font-semibold tracking-[-0.02em] text-foreground hover:text-primary"
        >
          {item.title}
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">
          {nextEpisode && secondsUntil !== null
            ? `Ep ${nextEpisode.episode} in ${formatCountdown(secondsUntil)}`
            : (media?.status ?? "No upcoming episode")}
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="rounded-2xl"
        onClick={onRemove}
      >
        Remove
      </Button>
    </section>
  )
}
