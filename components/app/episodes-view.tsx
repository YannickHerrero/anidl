"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { useAnilistWatchedResolver } from "@/hooks/use-anilist-progress"
import { useAppConfig } from "@/hooks/use-app-config"
import { useWatchProgress } from "@/hooks/use-watch-progress"
import {
  fetchTmdbTvSeasonDetail,
  type TvEpisodeDetail,
  type TvSeasonDetail,
} from "@/lib/tmdb"
import {
  getWatchedSeasonEpisodeCount,
  isEpisodeWatched,
} from "@/lib/watch-progress"
import { cn } from "@/lib/utils"

export function EpisodesSection({
  tmdbId,
  seasonCount,
}: {
  tmdbId: number
  seasonCount: number
}) {
  const { config } = useAppConfig()
  const { getItem, markEpisodeWatched } = useWatchProgress()
  const resolveAnilistWatched = useAnilistWatchedResolver()
  const anilistWatched = resolveAnilistWatched(tmdbId)
  const isSynced = anilistWatched !== undefined
  const [selectedSeason, setSelectedSeason] = useState(1)
  const [season, setSeason] = useState<TvSeasonDetail | null>(null)
  const [seasonStatus, setSeasonStatus] = useState<
    "loading" | "success" | "error"
  >("loading")

  const watchProgress = getItem("tv", tmdbId)

  useEffect(() => {
    const abortController = new AbortController()
    const begin = () => setSeasonStatus("loading")
    begin()
    void fetchTmdbTvSeasonDetail({
      apiKey: config.tmdbApiKey,
      tmdbId,
      seasonNumber: selectedSeason,
      signal: abortController.signal,
    })
      .then((detail) => {
        if (abortController.signal.aborted) return
        setSeason(detail)
        setSeasonStatus("success")
      })
      .catch(() => {
        if (!abortController.signal.aborted) {
          setSeason(null)
          setSeasonStatus("error")
        }
      })
    return () => abortController.abort()
  }, [config.tmdbApiKey, tmdbId, selectedSeason])

  const episodes = season?.episodes ?? []
  const isWatched = (episodeNumber: number) =>
    isSynced
      ? episodeNumber <= (anilistWatched ?? 0)
      : isEpisodeWatched(watchProgress, selectedSeason, episodeNumber)
  const watchedInSeason = isSynced
    ? episodes.filter((episode) => isWatched(episode.episodeNumber)).length
    : getWatchedSeasonEpisodeCount(watchProgress, selectedSeason)
  const total = episodes.length
  const pct = total ? Math.round((watchedInSeason / total) * 100) : 0

  return (
    <section
      id="episodes"
      className="max-w-[1180px] scroll-mt-6 px-6 pb-16 sm:px-12"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[11px] tracking-[0.08em] text-foreground">
            EPISODES
          </span>
          {isSynced ? (
            <span className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 font-mono text-[9px] tracking-[0.05em] text-success">
              <span className="size-1.5 rounded-full bg-success" />
              SYNCED FROM ANILIST
            </span>
          ) : null}
        </div>
        <div className="text-right">
          <div className="font-mono text-[11px] text-faint">
            SEASON PROGRESS
          </div>
          <div className="mt-1 text-[15px] font-semibold">
            {total
              ? `${watchedInSeason} of ${total} watched · ${pct}%`
              : `${watchedInSeason} watched`}
          </div>
        </div>
      </div>

      <div className="my-[18px] h-1.5 overflow-hidden rounded-md bg-secondary">
        <div
          className="h-full rounded-md bg-success"
          style={{ width: `${pct}%` }}
        />
      </div>

      {seasonCount > 1 ? (
        <div className="mb-6 flex flex-wrap gap-[9px]">
          {Array.from({ length: seasonCount }, (_, index) => index + 1).map(
            (seasonNumber) => {
              const active = seasonNumber === selectedSeason
              const watched = getWatchedSeasonEpisodeCount(
                watchProgress,
                seasonNumber
              )
              return (
                <button
                  key={seasonNumber}
                  type="button"
                  onClick={() => setSelectedSeason(seasonNumber)}
                  className={cn(
                    "flex items-center gap-2 rounded-[10px] border border-border px-4 py-2.5 text-[13px] transition-colors",
                    active
                      ? "bg-secondary font-semibold text-foreground"
                      : "font-medium text-muted-foreground hover:bg-secondary"
                  )}
                >
                  Season {seasonNumber}
                  {isSynced ? null : (
                    <span
                      className={cn(
                        "font-mono text-[10px]",
                        active ? "text-success" : "text-faint"
                      )}
                    >
                      {watched}
                    </span>
                  )}
                </button>
              )
            }
          )}
        </div>
      ) : null}

      {seasonStatus === "loading" ? (
        <StateNote label="Loading episodes…" />
      ) : seasonStatus === "error" ? (
        <StateNote label="Could not load this season." />
      ) : episodes.length === 0 ? (
        <StateNote label="No episodes found." />
      ) : (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          {episodes.map((episode) => (
            <EpisodeRow
              key={episode.id}
              tmdbId={tmdbId}
              seasonNumber={selectedSeason}
              episode={episode}
              watched={isWatched(episode.episodeNumber)}
              synced={isSynced}
              onToggleWatched={(watched) =>
                markEpisodeWatched(
                  tmdbId,
                  selectedSeason,
                  episode.episodeNumber,
                  watched
                )
              }
            />
          ))}
        </div>
      )}
    </section>
  )
}

function EpisodeRow({
  tmdbId,
  seasonNumber,
  episode,
  watched,
  synced,
  onToggleWatched,
}: {
  tmdbId: number
  seasonNumber: number
  episode: TvEpisodeDetail
  watched: boolean
  synced: boolean
  onToggleWatched: (watched: boolean) => void
}) {
  const code = `S${String(seasonNumber).padStart(2, "0")}E${String(
    episode.episodeNumber
  ).padStart(2, "0")}`
  const meta = [
    episode.airDate ? formatDate(episode.airDate) : null,
    episode.runtime ? `${episode.runtime}m` : null,
    episode.voteAverage !== null ? `★ ${episode.voteAverage.toFixed(1)}` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="flex items-center gap-4 rounded-[13px] border border-border bg-card p-3.5">
      <div className="w-[54px] flex-none text-center">
        <div className="display text-2xl">{episode.episodeNumber}</div>
        <div className="font-mono text-[9px] text-faint">{code}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <span className="truncate text-[14.5px] font-semibold">
            {episode.title}
          </span>
          {watched ? (
            <span className="flex-none rounded-[5px] bg-success px-1.5 py-[3px] font-mono text-[8.5px] tracking-[0.04em] text-success-foreground">
              WATCHED
            </span>
          ) : null}
        </div>
        <div className="mt-[5px] font-mono text-[10.5px] text-faint">{meta}</div>
      </div>
      <div className="flex flex-none items-center gap-2">
        {synced ? null : (
          <button
            type="button"
            onClick={() => onToggleWatched(!watched)}
            aria-label={watched ? "Mark unwatched" : "Mark watched"}
            className={cn(
              "rounded-[9px] border border-border px-2.5 py-[9px] font-mono text-[11px] transition-colors",
              watched
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary"
            )}
          >
            ✓
          </button>
        )}
        <Link
          href={`/media/tv/${tmdbId}/sources?s=${seasonNumber}&e=${episode.episodeNumber}`}
          className="rounded-[9px] border border-border bg-secondary px-3 py-[9px] text-[12px] font-semibold whitespace-nowrap text-foreground transition-colors hover:border-primary"
        >
          {watched ? "Re-watch" : "Open sources"}
        </Link>
      </div>
    </div>
  )
}

function StateNote({ label }: { label: string }) {
  return (
    <div className="rounded-[13px] border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
      {label}
    </div>
  )
}

function formatDate(value: string) {
  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsedDate)
}
