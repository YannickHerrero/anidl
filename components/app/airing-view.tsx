"use client"

import Link from "next/link"
import Image from "next/image"

import { useAiring, type AiringEntry } from "@/hooks/use-airing"
import { useCountdown } from "@/hooks/use-countdown"
import { useWatchProgress } from "@/hooks/use-watch-progress"
import { formatCountdown } from "@/lib/anilist"
import { type AnilistMedia } from "@/lib/anilist"
import { type TrackedAnime } from "@/lib/anime-tracking"
import { getWatchedEpisodeCount } from "@/lib/watch-progress"

export function AiringView() {
  const { items, mediaById, airing, status } = useAiring()
  const { getItem } = useWatchProgress()
  const isLoading = status === "loading" && items.length > 0

  const inProgress = items
    .map((tracked) => ({
      tracked,
      media: mediaById.get(tracked.anilistId),
      watched: getWatchedEpisodeCount(getItem("tv", tracked.tmdbId)),
    }))
    .filter((entry) => entry.watched > 0)

  return (
    <div className="max-w-[1040px] px-8 py-12 pb-20 sm:px-14">
      <div className="flex items-center gap-[11px]">
        <span className="size-2 animate-[anidlPulse_1.6s_ease-in-out_infinite] rounded-full bg-primary" />
        <h1 className="display text-[40px]">Airing</h1>
      </div>
      <div className="mt-2.5 font-mono text-[11px] text-faint">
        {isLoading
          ? "Loading airing schedules…"
          : airing.length > 0
            ? `${airing.length} tracked anime with an upcoming episode · sorted by air time`
            : status === "error"
              ? "Could not reach AniList for airing schedules."
              : "No tracked anime is currently airing."}
      </div>

      {isLoading ? (
        <div className="mt-9 flex flex-col gap-3.5">
          {Array.from(
            { length: Math.min(Math.max(items.length, 1), 4) },
            (_, index) => (
              <AiringRowSkeleton key={index} />
            )
          )}
        </div>
      ) : airing.length > 0 ? (
        <div className="mt-9 flex flex-col gap-3.5">
          {airing.map((entry) => (
            <AiringRow key={entry.tracked.anilistId} entry={entry} />
          ))}
        </div>
      ) : null}

      {inProgress.length > 0 ? (
        <>
          <div className="mt-12 mb-[18px] flex items-center gap-2.5">
            <span className="font-mono text-[11px] tracking-[0.08em] text-foreground">
              ANIME IN PROGRESS
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inProgress.map((entry) => (
              <ProgressCard
                key={entry.tracked.anilistId}
                tracked={entry.tracked}
                media={entry.media}
                watched={entry.watched}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

function AiringRow({ entry }: { entry: AiringEntry }) {
  const secondsUntil = useCountdown(entry.airingAt)

  return (
    <Link
      href={`/media/tv/${entry.tracked.tmdbId}`}
      className="flex items-center gap-[22px] rounded-[15px] border border-l-[3px] border-border border-l-primary bg-card px-[22px] py-[18px] transition-transform duration-150 hover:translate-x-1"
    >
      <div className="relative h-20 w-14 flex-none overflow-hidden rounded-[9px] bg-secondary">
        {entry.tracked.coverImage ? (
          <Image
            src={entry.tracked.coverImage}
            alt=""
            fill
            sizes="56px"
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="display truncate text-[22px]">{entry.tracked.title}</div>
        <div className="mt-[7px] flex items-center gap-3">
          <span className="rounded-md bg-primary px-[9px] py-[3px] font-mono text-[11px] text-primary-foreground">
            EP {entry.episode}
          </span>
        </div>
      </div>
      <div className="flex-none text-right">
        <div className="font-mono text-[9px] tracking-[0.1em] text-faint">
          AIRS IN
        </div>
        <div className="mt-[5px] font-mono text-[22px] font-medium text-primary">
          {formatCountdown(secondsUntil)}
        </div>
      </div>
    </Link>
  )
}

function AiringRowSkeleton() {
  return (
    <div className="flex items-center gap-[22px] rounded-[15px] border border-l-[3px] border-border border-l-primary/40 bg-card px-[22px] py-[18px]">
      <div className="h-20 w-14 flex-none animate-pulse rounded-[9px] bg-secondary" />
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="h-5 w-1/2 animate-pulse rounded bg-secondary" />
        <div className="h-4 w-16 animate-pulse rounded bg-secondary" />
      </div>
      <div className="h-7 w-24 flex-none animate-pulse rounded bg-secondary" />
    </div>
  )
}

function ProgressCard({
  tracked,
  media,
  watched,
}: {
  tracked: TrackedAnime
  media: AnilistMedia | undefined
  watched: number
}) {
  const total = media?.episodes ?? null
  const pct = total ? Math.min(100, Math.round((watched / total) * 100)) : 0

  return (
    <Link
      href={`/media/tv/${tracked.tmdbId}`}
      className="rounded-[14px] border border-border bg-card p-[18px] transition-transform duration-150 hover:-translate-y-[3px]"
    >
      <div className="flex items-center gap-3.5">
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
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-foreground">
            {tracked.title}
          </div>
          <div className="mt-[5px] font-mono text-[10.5px] text-faint">
            {total ? `${watched} / ${total} watched` : `${watched} watched`}
          </div>
        </div>
      </div>
      <div className="mt-4 h-[5px] overflow-hidden rounded-[5px] bg-secondary">
        <div
          className="h-full rounded-[5px] bg-success"
          style={{ width: `${pct}%` }}
        />
      </div>
    </Link>
  )
}
