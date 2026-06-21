"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"

import { useAiring } from "@/hooks/use-airing"
import { useAnimeTracking } from "@/hooks/use-anime-tracking"
import { useCountdown } from "@/hooks/use-countdown"
import { useWatchProgress } from "@/hooks/use-watch-progress"
import { formatCountdown, type AnilistMedia } from "@/lib/anilist"
import { type TrackedAnime } from "@/lib/anime-tracking"
import { getWatchedEpisodeCount } from "@/lib/watch-progress"
import { cn } from "@/lib/utils"

type ListFilter = "all" | "airing" | "completed"

const FILTERS: { key: ListFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "airing", label: "Airing" },
  { key: "completed", label: "Completed" },
]

export function AnimeListView() {
  const { items, mediaById, airing } = useAiring()
  const { removeItem } = useAnimeTracking()
  const { getItem } = useWatchProgress()
  const [filter, setFilter] = useState<ListFilter>("all")

  const rows = items
    .map((tracked) => {
      const media = mediaById.get(tracked.anilistId)
      const watched = getWatchedEpisodeCount(getItem("tv", tracked.tmdbId))
      const total = media?.episodes ?? null
      const isAiring = Boolean(media?.nextAiringEpisode)
      const isCompleted =
        !isAiring && total !== null && watched >= total && total > 0
      return { tracked, media, watched, total, isAiring, isCompleted }
    })
    .filter((row) => {
      if (filter === "airing") return row.isAiring
      if (filter === "completed") return row.isCompleted
      return true
    })

  return (
    <div className="max-w-[1180px] px-8 py-12 pb-20 sm:px-[52px]">
      <div className="mb-[30px] flex items-end justify-between gap-4">
        <div>
          <h1 className="display text-[40px]">My List</h1>
          <div className="mt-2 font-mono text-[11px] text-faint">
            {items.length} tracked · {airing.length} currently airing
          </div>
        </div>
        <div className="flex gap-2">
          {FILTERS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setFilter(option.key)}
              className={cn(
                "rounded-lg border border-border px-[13px] py-2 font-mono text-[11px] transition-colors",
                filter === option.key
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
          <p className="font-mono text-[11px] tracking-[0.1em] text-primary">
            NO ANIME TRACKED YET
          </p>
          <h2 className="display mt-3 text-2xl">
            Open an anime and add it to your list.
          </h2>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <AnimeListRow
              key={row.tracked.anilistId}
              tracked={row.tracked}
              media={row.media}
              watched={row.watched}
              total={row.total}
              onRemove={() => removeItem(row.tracked.tmdbId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AnimeListRow({
  tracked,
  media,
  watched,
  total,
  onRemove,
}: {
  tracked: TrackedAnime
  media: AnilistMedia | undefined
  watched: number
  total: number | null
  onRemove: () => void
}) {
  const next = media?.nextAiringEpisode
  const secondsUntil = useCountdown(next?.airingAt ?? 0)
  const live = Boolean(next)
  const pct = total ? Math.min(100, Math.round((watched / total) * 100)) : 0

  const status = next
    ? `Ep ${next.episode} airs in ${formatCountdown(secondsUntil)}`
    : describeStatus(media?.status)

  return (
    <div
      className={cn(
        "flex items-center gap-5 rounded-[14px] border border-l-[3px] bg-card px-5 py-4",
        live ? "border-border border-l-primary" : "border-border border-l-border"
      )}
    >
      <Link
        href={`/media/tv/${tracked.tmdbId}`}
        className="flex min-w-0 flex-1 items-center gap-5"
      >
        <div className="relative h-[68px] w-12 flex-none overflow-hidden rounded-lg bg-secondary">
          {tracked.coverImage ? (
            <Image
              src={tracked.coverImage}
              alt=""
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="display truncate text-[19px]">{tracked.title}</div>
          <div className="mt-1.5 flex items-center gap-2">
            {live ? (
              <span className="size-1.5 flex-none animate-[anidlPulse_1.6s_ease-in-out_infinite] rounded-full bg-primary" />
            ) : null}
            <span
              className={cn(
                "font-mono text-[11.5px]",
                live ? "text-primary" : "text-faint"
              )}
            >
              {status}
            </span>
          </div>
        </div>
        <div className="hidden w-[200px] flex-none sm:block">
          <div className="mb-[7px] flex justify-between font-mono text-[11px] text-faint">
            <span>WATCHED</span>
            <span className="text-foreground">
              {total ? `${watched} / ${total}` : watched}
            </span>
          </div>
          <div className="h-[5px] overflow-hidden rounded-[5px] bg-secondary">
            <div
              className="h-full rounded-[5px] bg-success"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </Link>
      <button
        type="button"
        onClick={onRemove}
        className="flex-none rounded-[9px] border border-border px-4 py-2.5 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        Remove
      </button>
    </div>
  )
}

function describeStatus(status: string | null | undefined): string {
  switch (status) {
    case "FINISHED":
      return "Finished airing"
    case "RELEASING":
      return "Releasing"
    case "NOT_YET_RELEASED":
      return "Not yet released"
    case "CANCELLED":
      return "Cancelled"
    case "HIATUS":
      return "On hiatus"
    default:
      return "No upcoming episode"
  }
}
