"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

import { useAppConfig } from "@/hooks/use-app-config"
import { useDownloadTracking } from "@/hooks/use-download-tracking"
import { isEpisodeDownloaded } from "@/lib/download-tracking"
import {
  fetchTmdbExternalIds,
  fetchTmdbMediaDetail,
  type SearchMediaType,
} from "@/lib/tmdb"
import {
  fetchTorrentioEpisodeSources,
  fetchTorrentioMovieSources,
  type TorrentioSource,
} from "@/lib/torrentio"
import { cn } from "@/lib/utils"

type SourcesViewProps = {
  mediaType: SearchMediaType
  tmdbId: number
  season: number | null
  episode: number | null
}

type SourcesStatus = "loading" | "success" | "error"

const FILTERS = [
  { key: "cached", label: "RD cached only" },
  { key: "4k", label: "4K" },
  { key: "1080p", label: "1080p" },
  { key: "hdr", label: "HDR / DV" },
  { key: "atmos", label: "Atmos" },
] as const

type FilterKey = (typeof FILTERS)[number]["key"]

export function SourcesView({
  mediaType,
  tmdbId,
  season,
  episode,
}: SourcesViewProps) {
  const { config } = useAppConfig()
  const { getItem, markEpisodeDownloaded, markMovieDownloaded } =
    useDownloadTracking()
  const [title, setTitle] = useState("")
  const [year, setYear] = useState<string | null>(null)
  const [seasons, setSeasons] = useState<
    { seasonNumber: number; episodeCount: number }[]
  >([])
  const [sources, setSources] = useState<TorrentioSource[]>([])
  const [status, setStatus] = useState<SourcesStatus>("loading")
  const [active, setActive] = useState<Set<FilterKey>>(new Set())

  const isEpisode = mediaType === "tv" && season !== null && episode !== null
  const backHref =
    mediaType === "tv"
      ? `/media/tv/${tmdbId}#episodes`
      : `/media/movie/${tmdbId}`

  const downloadProgress = getItem(mediaType, tmdbId)
  const alreadyDownloaded =
    mediaType === "movie"
      ? downloadProgress?.mediaType === "movie"
      : season !== null &&
        episode !== null &&
        isEpisodeDownloaded(downloadProgress, season, episode)

  const handleDownload = () => {
    if (mediaType === "tv" && season !== null && episode !== null) {
      markEpisodeDownloaded(tmdbId, season, episode, true)
    } else if (mediaType === "movie") {
      markMovieDownloaded(tmdbId, true)
    }
  }

  useEffect(() => {
    const abortController = new AbortController()
    void fetchTmdbMediaDetail({
      apiKey: config.tmdbApiKey,
      mediaType,
      tmdbId,
      signal: abortController.signal,
    })
      .then((detail) => {
        if (abortController.signal.aborted) return
        setTitle(detail.title)
        setYear(detail.year)
        setSeasons(detail.seasons)
      })
      .catch(() => {})
    return () => abortController.abort()
  }, [config.tmdbApiKey, mediaType, tmdbId])

  useEffect(() => {
    const abortController = new AbortController()
    const begin = () => setStatus("loading")
    begin()

    void fetchTmdbExternalIds({
      apiKey: config.tmdbApiKey,
      mediaType,
      tmdbId,
      signal: abortController.signal,
    })
      .then((externalIds) => {
        if (!externalIds.imdbId) {
          throw new Error("IMDb ID not found")
        }
        if (mediaType === "tv" && season !== null && episode !== null) {
          return fetchTorrentioEpisodeSources({
            imdbId: externalIds.imdbId,
            seasonNumber: season,
            episodeNumber: episode,
            realDebridApiKey: config.realDebridApiKey,
            signal: abortController.signal,
          })
        }
        return fetchTorrentioMovieSources({
          imdbId: externalIds.imdbId,
          realDebridApiKey: config.realDebridApiKey,
          signal: abortController.signal,
        })
      })
      .then((result) => {
        if (abortController.signal.aborted) return
        setSources(result)
        setStatus("success")
      })
      .catch(() => {
        if (!abortController.signal.aborted) {
          setSources([])
          setStatus("error")
        }
      })

    return () => abortController.abort()
  }, [
    config.tmdbApiKey,
    config.realDebridApiKey,
    mediaType,
    tmdbId,
    season,
    episode,
  ])

  const filtered = useMemo(
    () => applyFilters(sources, active),
    [sources, active]
  )
  const cachedCount = sources.filter((source) => source.isCached).length

  const toggle = (key: FilterKey) =>
    setActive((current) => {
      const next = new Set(current)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })

  const heading = isEpisode
    ? `${title || "Loading"} · S${season}E${episode}`
    : title || "Loading"

  const { prevHref, nextHref } = useMemo(() => {
    if (!isEpisode || season === null || episode === null) {
      return { prevHref: null, nextHref: null }
    }

    const counts = new Map(
      seasons
        .filter((entry) => entry.seasonNumber > 0)
        .map((entry) => [entry.seasonNumber, entry.episodeCount])
    )
    const episodeHref = (s: number, e: number) =>
      `/media/tv/${tmdbId}/sources?s=${s}&e=${e}`
    const currentCount = counts.get(season) ?? null

    let prev: string | null = null
    if (episode > 1) {
      prev = episodeHref(season, episode - 1)
    } else {
      const previousSeason = [...counts.keys()]
        .filter((n) => n < season)
        .sort((a, b) => b - a)[0]
      if (previousSeason !== undefined) {
        prev = episodeHref(previousSeason, counts.get(previousSeason) ?? 1)
      }
    }

    let next: string | null = null
    if (currentCount !== null && episode < currentCount) {
      next = episodeHref(season, episode + 1)
    } else if (currentCount !== null) {
      const nextSeason = [...counts.keys()]
        .filter((n) => n > season)
        .sort((a, b) => a - b)[0]
      if (nextSeason !== undefined) {
        next = episodeHref(nextSeason, 1)
      }
    }

    return { prevHref: prev, nextHref: next }
  }, [isEpisode, season, episode, seasons, tmdbId])

  return (
    <div>
      {/* header */}
      <div className="flex items-center justify-between gap-6 border-b border-border px-10 py-6">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href={backHref}
            className="flex-none rounded-[9px] border border-border bg-secondary px-3 py-2.5 font-mono text-[14px] text-foreground transition-colors hover:border-primary"
          >
            ←
          </Link>
          <div className="min-w-0">
            <div className="font-mono text-[11px] text-faint">
              SELECT A SOURCE FOR
            </div>
            <div className="display mt-[3px] truncate text-[23px]">
              {heading}
              {year ? (
                <span className="ml-2 text-[15px] font-medium text-muted-foreground">
                  ({year})
                </span>
              ) : null}
            </div>
            {alreadyDownloaded ? (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-primary px-2 py-1 font-mono text-[10px] tracking-[0.05em] text-primary">
                ↓ ALREADY DOWNLOADED
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-none items-center gap-2.5">
          {isEpisode ? (
            <div className="flex items-center gap-1.5">
              <EpisodeNavLink href={prevHref} label="← Prev" />
              <EpisodeNavLink href={nextHref} label="Next →" />
            </div>
          ) : null}
          <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
            {cachedCount} cached · {sources.length - cachedCount} uncached
          </span>
          <span className="hidden rounded-[7px] border border-border px-2.5 py-[7px] font-mono text-[10px] text-faint lg:inline">
            sort: score ↓
          </span>
        </div>
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-10 py-4">
        <span className="mr-1 font-mono text-[10px] text-faint">FILTER</span>
        {FILTERS.map((filter) => {
          const on = active.has(filter.key)
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => toggle(filter.key)}
              className={cn(
                "rounded-[7px] border border-border px-[11px] py-[6px] font-mono text-[11px] transition-colors",
                on
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              )}
            >
              {filter.label}
            </button>
          )
        })}
        <span className="flex-1" />
        <span className="font-mono text-[10px] text-faint">
          trailers · samples · CAM dropped
        </span>
      </div>

      {/* rows */}
      <div className="flex max-w-[1180px] flex-col gap-2.5 px-7 py-4 pb-16">
        {status === "loading" ? (
          <StateNote label="Loading sources…" />
        ) : status === "error" ? (
          <StateNote label="Could not load sources for this title." />
        ) : sources.length === 0 ? (
          <StateNote label="No cached torrents found." />
        ) : filtered.length === 0 ? (
          <StateNote label="No sources match the active filters." />
        ) : (
          filtered.map((source) => (
            <SourceRow
              key={source.id}
              source={source}
              onDownload={handleDownload}
            />
          ))
        )}
      </div>
    </div>
  )
}

function SourceRow({
  source,
  onDownload,
}: {
  source: TorrentioSource
  onDownload: () => void
}) {
  const href =
    source.url ??
    (source.infoHash ? `magnet:?xt=urn:btih:${source.infoHash}` : null)

  return (
    <div className="flex items-center gap-[18px] rounded-[13px] border border-border bg-card px-[18px] py-4">
      <div className="w-12 flex-none text-center">
        <div className="display text-[22px]">{Math.round(source.score)}</div>
        <div className="font-mono text-[8.5px] tracking-[0.05em] text-faint">
          SCORE
        </div>
      </div>
      <div className="w-px self-stretch bg-border" />
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2.5">
          {source.quality ? (
            <span className="rounded-md border border-border bg-secondary px-2 py-[3px] font-mono text-[10px] tracking-[0.04em] text-foreground">
              {source.quality}
            </span>
          ) : null}
          {source.sourceType ? (
            <span className="font-mono text-[10px] text-muted-foreground">
              {source.sourceType}
            </span>
          ) : null}
          {source.videoCodec ? (
            <span className="font-mono text-[10px] text-muted-foreground">
              {source.videoCodec}
            </span>
          ) : null}
          {source.isRecommended ? (
            <span className="rounded-md bg-primary px-2 py-[3px] font-mono text-[9px] tracking-[0.06em] text-primary-foreground">
              ★ BEST PICK
            </span>
          ) : null}
        </div>
        <div className="truncate font-mono text-[12px] text-muted-foreground">
          {source.title}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 font-mono text-[11px] text-faint">
          {source.size ? <span>◆ {source.size}</span> : null}
          {source.seeders !== null ? (
            <span className="text-success">▲ {source.seeders} seeders</span>
          ) : null}
          {source.audio ? <span>♪ {source.audio}</span> : null}
          {source.hdr ? <span>{source.hdr}</span> : null}
          {source.languages.length > 0 ? (
            <span>{source.languages.join(" · ")}</span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-none flex-col items-end gap-2.5">
        <span
          className={cn(
            "flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.05em]",
            source.isCached ? "text-success" : "text-faint"
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              source.isCached ? "bg-success" : "bg-faint"
            )}
          />
          {source.isCached ? "RD CACHED" : "NOT CACHED"}
        </span>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            onClick={onDownload}
            className={cn(
              "rounded-[10px] border border-border px-[22px] py-2.5 text-[13px] font-bold whitespace-nowrap transition-opacity hover:opacity-90",
              source.isRecommended
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground"
            )}
          >
            {source.isCached ? "Open ▸" : "Open"}
          </a>
        ) : (
          <span className="rounded-[10px] border border-border px-[22px] py-2.5 text-[13px] font-semibold text-faint">
            No link
          </span>
        )}
      </div>
    </div>
  )
}

function applyFilters(sources: TorrentioSource[], active: Set<FilterKey>) {
  if (active.size === 0) {
    return sources
  }

  const qualityKeys: FilterKey[] = ["4k", "1080p"]
  const activeQuality = qualityKeys.filter((key) => active.has(key))

  return sources.filter((source) => {
    if (active.has("cached") && !source.isCached) {
      return false
    }
    if (active.has("hdr") && !source.hdr) {
      return false
    }
    if (active.has("atmos") && !/atmos/i.test(source.audio ?? "")) {
      return false
    }
    if (activeQuality.length > 0) {
      const quality = source.quality ?? ""
      const matchesQuality = activeQuality.some((key) =>
        key === "4k"
          ? quality.includes("2160P") || quality.includes("4K")
          : quality.includes("1080P")
      )
      if (!matchesQuality) {
        return false
      }
    }
    return true
  })
}

function EpisodeNavLink({
  href,
  label,
}: {
  href: string | null
  label: string
}) {
  const base =
    "rounded-[9px] border border-border px-3 py-2 font-mono text-[11px] whitespace-nowrap"

  if (!href) {
    return (
      <span aria-disabled className={cn(base, "text-faint opacity-40")}>
        {label}
      </span>
    )
  }

  return (
    <Link
      href={href}
      className={cn(base, "text-foreground transition-colors hover:border-primary")}
    >
      {label}
    </Link>
  )
}

function StateNote({ label }: { label: string }) {
  return (
    <div className="rounded-[13px] border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
      {label}
    </div>
  )
}
