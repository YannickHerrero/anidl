"use client"

import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react"
import Image from "next/image"
import Link from "next/link"

import { SourceResultsPanel } from "@/components/app/source-results-panel"
import { Button } from "@/components/ui/button"
import { useAppConfig } from "@/hooks/use-app-config"
import { useRecentMedia } from "@/hooks/use-recent-media"
import {
  fetchTmdbExternalIds,
  fetchTmdbMediaDetail,
  getTmdbImageUrl,
  mediaDetailToSearchItem,
  type MediaDetail,
  type SearchMediaType,
} from "@/lib/tmdb"
import {
  fetchTorrentioMovieSources,
  type TorrentioSource,
} from "@/lib/torrentio"

type MediaDetailProps = Readonly<{
  mediaType: SearchMediaType
  tmdbId: number
}>

type DetailState =
  | { status: "loading"; detail: MediaDetail | null }
  | { status: "success"; detail: MediaDetail }
  | { status: "error"; detail: MediaDetail | null; message: string }

type SourceState = {
  status: "idle" | "loading" | "success" | "error"
  sources: TorrentioSource[]
  message: string | null
}

export function MediaDetail({ mediaType, tmdbId }: MediaDetailProps) {
  const { config } = useAppConfig()
  const { addItem, items } = useRecentMedia()
  const recentItem = useMemo(
    () =>
      items.find((item) => item.mediaType === mediaType && item.id === tmdbId),
    [items, mediaType, tmdbId]
  )
  const [state, setState] = useState<DetailState>({
    status: "loading",
    detail: null,
  })
  const [sourceState, setSourceState] = useState<SourceState>({
    status: mediaType === "movie" ? "loading" : "idle",
    sources: [],
    message: null,
  })
  const [selectedSeason, setSelectedSeason] = useState(1)

  useEffect(() => {
    const abortController = new AbortController()

    void fetchTmdbMediaDetail({
      apiKey: config.tmdbApiKey,
      mediaType,
      tmdbId,
      signal: abortController.signal,
    })
      .then((detail) => {
        if (abortController.signal.aborted) {
          return
        }

        addItem(mediaDetailToSearchItem(detail))
        setState({ status: "success", detail })
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) {
          return
        }

        setState((currentState) => ({
          status: "error",
          detail: currentState.detail,
          message:
            error instanceof Error
              ? error.message
              : "Could not load this title.",
        }))
      })

    return () => {
      abortController.abort()
    }
  }, [addItem, config.tmdbApiKey, mediaType, tmdbId])

  const displayDetail =
    state.detail ??
    (recentItem
      ? {
          id: recentItem.id,
          mediaType: recentItem.mediaType,
          title: recentItem.title,
          originalTitle: null,
          overview: recentItem.overview,
          posterPath: recentItem.posterPath,
          backdropPath: recentItem.backdropPath,
          releaseDate: recentItem.releaseDate,
          year: recentItem.year,
          voteAverage: recentItem.voteAverage,
          voteCount: recentItem.voteCount,
          runtime: null,
          genres: [],
          status: null,
          tagline: null,
          productionCompanies: [],
          seasonCount: null,
          episodeCount: null,
          creators: [],
        }
      : null)

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="outline" className="rounded-2xl">
          <Link href="/search">Back to search</Link>
        </Button>
        <div className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
          TMDB {tmdbId}
        </div>
      </div>

      {displayDetail ? (
        <DetailCard detail={displayDetail} />
      ) : (
        <SkeletonCard mediaType={mediaType} tmdbId={tmdbId} />
      )}

      {displayDetail?.mediaType === "tv" && displayDetail.seasonCount ? (
        <SeasonSelector
          seasonCount={displayDetail.seasonCount}
          selectedSeason={selectedSeason}
          onSelect={setSelectedSeason}
        />
      ) : null}

      {mediaType === "movie" ? (
        <MovieSourceSection
          tmdbId={tmdbId}
          tmdbApiKey={config.tmdbApiKey}
          realDebridApiKey={config.realDebridApiKey}
          state={sourceState}
          onStateChange={setSourceState}
        />
      ) : null}

      {state.status === "loading" ? <StatusCard label="Loading" /> : null}
      {state.status === "error" ? <StatusCard label={state.message} /> : null}
    </div>
  )
}

function SeasonSelector({
  seasonCount,
  selectedSeason,
  onSelect,
}: {
  seasonCount: number
  selectedSeason: number
  onSelect: (seasonNumber: number) => void
}) {
  return (
    <section className="grid gap-4 rounded-[30px] border border-border/70 bg-card/85 p-5 shadow-[0_18px_80px_-38px_rgba(18,38,33,0.38)] md:p-6">
      <p className="text-xs font-semibold tracking-[0.22em] text-primary/80 uppercase">
        Seasons
      </p>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: seasonCount }, (_, index) => index + 1).map(
          (seasonNumber) => (
            <Button
              key={seasonNumber}
              type="button"
              variant={seasonNumber === selectedSeason ? "default" : "outline"}
              className="rounded-2xl"
              onClick={() => onSelect(seasonNumber)}
            >
              Season {seasonNumber}
            </Button>
          )
        )}
      </div>
    </section>
  )
}

function MovieSourceSection({
  tmdbId,
  tmdbApiKey,
  realDebridApiKey,
  state,
  onStateChange,
}: {
  tmdbId: number
  tmdbApiKey: string
  realDebridApiKey: string
  state: SourceState
  onStateChange: Dispatch<SetStateAction<SourceState>>
}) {
  useEffect(() => {
    const abortController = new AbortController()

    void fetchTmdbExternalIds({
      apiKey: tmdbApiKey,
      mediaType: "movie",
      tmdbId,
      signal: abortController.signal,
    })
      .then((externalIds) => {
        if (!externalIds.imdbId) {
          throw new Error("IMDb ID not found")
        }

        return fetchTorrentioMovieSources({
          imdbId: externalIds.imdbId,
          realDebridApiKey,
          signal: abortController.signal,
        })
      })
      .then((sources) => {
        if (abortController.signal.aborted) {
          return
        }

        onStateChange({
          status: "success",
          sources,
          message: null,
        })
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) {
          return
        }

        onStateChange({
          status: "error",
          sources: [],
          message:
            error instanceof Error ? error.message : "Could not load sources",
        })
      })

    return () => {
      abortController.abort()
    }
  }, [onStateChange, realDebridApiKey, tmdbApiKey, tmdbId])

  return (
    <SourceResultsPanel
      title="Sources"
      status={state.status}
      sources={state.sources}
      message={state.message}
    />
  )
}

function DetailCard({ detail }: { detail: MediaDetail }) {
  const posterUrl = getTmdbImageUrl(detail.posterPath, "w500")
  const backdropUrl = getTmdbImageUrl(detail.backdropPath, "w1280")
  const facts = buildFacts(detail)

  return (
    <section className="overflow-hidden rounded-[32px] border border-border/70 bg-card/85 shadow-[0_18px_80px_-38px_rgba(18,38,33,0.45)] backdrop-blur">
      <div className="relative border-b border-border/70">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(10,24,21,0.75),rgba(10,24,21,0.3))]" />
        {backdropUrl ? (
          <Image
            src={backdropUrl}
            alt=""
            width={1280}
            height={720}
            className="h-40 w-full object-cover sm:h-48 lg:h-56"
          />
        ) : (
          <div className="h-40 bg-[radial-gradient(circle_at_top_left,rgba(208,237,225,0.9),transparent_34%),radial-gradient(circle_at_top_right,rgba(243,219,180,0.72),transparent_28%),linear-gradient(180deg,#dce9df_0%,#efe7d7_100%)] sm:h-48 lg:h-56" />
        )}
        <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6 lg:p-7">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-white/78 uppercase">
            <span>{detail.mediaType === "movie" ? "Movie" : "TV show"}</span>
            {detail.year ? <span>{detail.year}</span> : null}
            {detail.status ? <span>{detail.status}</span> : null}
          </div>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl lg:text-[2.8rem]">
            {detail.title}
          </h1>
          {detail.tagline ? (
            <p className="mt-2 max-w-2xl text-sm text-white/78 lg:text-[0.95rem]">
              {detail.tagline}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 p-5 md:grid-cols-[200px_minmax(0,1fr)] md:p-6 xl:grid-cols-[180px_minmax(0,1fr)] 2xl:grid-cols-[200px_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-[240px] overflow-hidden rounded-[26px] border border-border/70 bg-[linear-gradient(145deg,rgba(208,237,225,0.42),rgba(243,219,180,0.35))] md:mx-0 md:max-w-none">
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={`Poster for ${detail.title}`}
              width={500}
              height={750}
              className="aspect-[2/3] h-full w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[2/3] items-end p-4">
              <span className="rounded-full border border-border/70 bg-background/85 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                No poster
              </span>
            </div>
          )}
        </div>

        <div className="grid gap-6 xl:max-w-5xl">
          {detail.overview ? (
            <section>
              <h2 className="text-xs font-semibold tracking-[0.22em] text-primary/80 uppercase">
                Overview
              </h2>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-muted-foreground">
                {detail.overview}
              </p>
            </section>
          ) : null}

          {facts.length > 0 ? (
            <section>
              <h2 className="text-xs font-semibold tracking-[0.22em] text-primary/80 uppercase">
                Facts
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {facts.map((fact) => (
                  <article
                    key={fact.label}
                    className="rounded-[24px] border border-border/70 bg-background/70 p-4"
                  >
                    <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                      {fact.label}
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {fact.value}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {detail.genres.length > 0 ? (
            <TagSection title="Genres" items={detail.genres} />
          ) : null}

          {detail.creators.length > 0 ? (
            <TagSection title="Created by" items={detail.creators} />
          ) : null}

          {detail.productionCompanies.length > 0 ? (
            <TagSection title="Studios" items={detail.productionCompanies} />
          ) : null}
        </div>
      </div>
    </section>
  )
}

function TagSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h2 className="text-xs font-semibold tracking-[0.22em] text-primary/80 uppercase">
        {title}
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground"
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  )
}

function SkeletonCard({
  mediaType,
  tmdbId,
}: {
  mediaType: SearchMediaType
  tmdbId: number
}) {
  return (
    <section className="rounded-[32px] border border-border/70 bg-card/85 p-6 shadow-[0_18px_80px_-38px_rgba(18,38,33,0.45)] backdrop-blur">
      <div className="flex flex-wrap gap-2 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
        <span>{mediaType === "movie" ? "Movie" : "TV show"}</span>
        <span>TMDB {tmdbId}</span>
      </div>
    </section>
  )
}

function StatusCard({ label }: { label: string }) {
  return (
    <section className="rounded-[24px] border border-border/70 bg-card/80 px-4 py-3 text-sm text-muted-foreground shadow-[0_18px_80px_-42px_rgba(18,38,33,0.35)]">
      {label}
    </section>
  )
}

function buildFacts(detail: MediaDetail) {
  const facts: Array<{ label: string; value: string }> = []

  if (detail.releaseDate) {
    facts.push({ label: "Release", value: formatDate(detail.releaseDate) })
  }

  if (detail.runtime) {
    facts.push({ label: "Runtime", value: `${detail.runtime} min` })
  }

  if (detail.voteAverage !== null) {
    facts.push({
      label: "Rating",
      value: `${detail.voteAverage.toFixed(1)} / 10`,
    })
  }

  if (detail.voteCount > 0) {
    facts.push({ label: "Votes", value: detail.voteCount.toLocaleString() })
  }

  if (detail.originalTitle && detail.originalTitle !== detail.title) {
    facts.push({ label: "Original", value: detail.originalTitle })
  }

  if (detail.seasonCount) {
    facts.push({ label: "Seasons", value: String(detail.seasonCount) })
  }

  if (detail.episodeCount) {
    facts.push({ label: "Episodes", value: String(detail.episodeCount) })
  }

  return facts
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
