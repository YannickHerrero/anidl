"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { EpisodesSection } from "@/components/app/episodes-view"
import { useAnilistWatchedResolver } from "@/hooks/use-anilist-progress"
import { useAnimeTracking } from "@/hooks/use-anime-tracking"
import { useAppConfig } from "@/hooks/use-app-config"
import { useRecentMedia } from "@/hooks/use-recent-media"
import { useWatchProgress } from "@/hooks/use-watch-progress"
import {
  pickBestAnilistMatch,
  searchAnilistAnime,
  type AnilistMedia,
} from "@/lib/anilist"
import {
  fetchTmdbMediaDetail,
  getTmdbImageUrl,
  mediaDetailToSearchItem,
  type MediaDetail as MediaDetailType,
  type SearchMediaType,
} from "@/lib/tmdb"
import { getWatchedEpisodeCount } from "@/lib/watch-progress"
import { cn } from "@/lib/utils"

type MediaDetailProps = Readonly<{
  mediaType: SearchMediaType
  tmdbId: number
}>

type DetailState =
  | { status: "loading"; detail: MediaDetailType | null }
  | { status: "success"; detail: MediaDetailType }
  | { status: "error"; detail: MediaDetailType | null; message: string }

export function MediaDetail({ mediaType, tmdbId }: MediaDetailProps) {
  const router = useRouter()
  const { config } = useAppConfig()
  const { addItem, items } = useRecentMedia()
  const { getItem, markMovieWatched } = useWatchProgress()
  const recentItem = useMemo(
    () =>
      items.find((item) => item.mediaType === mediaType && item.id === tmdbId),
    [items, mediaType, tmdbId]
  )
  const [state, setState] = useState<DetailState>({
    status: "loading",
    detail: null,
  })
  const watchProgress = getItem(mediaType, tmdbId)

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
            error instanceof Error ? error.message : "Could not load this title.",
        }))
      })

    return () => {
      abortController.abort()
    }
  }, [addItem, config.tmdbApiKey, mediaType, tmdbId])

  const detail: MediaDetailType | null =
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
          seasons: [],
        }
      : null)

  const isMovie = mediaType === "movie"
  const backdropUrl = getTmdbImageUrl(detail?.backdropPath ?? null, "w1280")
  const posterUrl = getTmdbImageUrl(detail?.posterPath ?? null, "w500")
  const movieWatched = watchProgress?.mediaType === "movie"
  const resolveAnilistWatched = useAnilistWatchedResolver()
  const watchedEpisodeCount =
    resolveAnilistWatched(tmdbId) ?? getWatchedEpisodeCount(watchProgress)

  return (
    <div>
      {/* hero */}
      <div className="relative h-[280px] overflow-hidden bg-secondary sm:h-[340px]">
        {backdropUrl ? (
          <Image
            src={backdropUrl}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--background)_4%,transparent_72%)]" />
        <div className="absolute top-6 left-6 flex items-center gap-3 sm:left-11">
          <Link
            href="/search"
            className="rounded-lg border border-border bg-background/55 px-3 py-2 font-mono text-[11px] text-foreground backdrop-blur transition-colors hover:bg-secondary"
          >
            ← back to search
          </Link>
          <span className="rounded-lg border border-border bg-background/55 px-3 py-2 font-mono text-[11px] text-muted-foreground backdrop-blur">
            TMDB {tmdbId}
          </span>
        </div>
      </div>

      <div className="relative -mt-28 flex max-w-[1180px] flex-col gap-9 px-6 pb-14 sm:flex-row sm:px-12">
        {/* poster + actions */}
        <div className="w-[200px] flex-none sm:w-[240px]">
          <div className="relative aspect-[2/3] overflow-hidden rounded-[14px] border border-border bg-secondary shadow-[var(--shadow)]">
            {posterUrl ? (
              <Image
                src={posterUrl}
                alt={detail ? `Poster for ${detail.title}` : ""}
                fill
                sizes="240px"
                className="object-cover"
              />
            ) : null}
          </div>
          <div className="mt-4 flex flex-col gap-[9px]">
            <button
              type="button"
              onClick={() => {
                if (isMovie) {
                  router.push(`/media/movie/${tmdbId}/sources`)
                } else {
                  document
                    .getElementById("episodes")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              }}
              className="rounded-[11px] bg-primary px-3 py-3.5 text-[14px] font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {isMovie ? "▸ Open sources" : "▸ View episodes"}
            </button>
            {isMovie ? (
              <button
                type="button"
                onClick={() => markMovieWatched(tmdbId, !movieWatched)}
                className="rounded-[11px] border border-border bg-secondary px-3 py-[13px] text-[13.5px] font-semibold text-foreground transition-colors hover:bg-secondary/70"
              >
                {movieWatched ? "✓ Watched" : "＋ Mark as watched"}
              </button>
            ) : (
              <div className="flex items-center justify-between rounded-[11px] border border-border px-3.5 py-3 text-[13px] text-foreground">
                <span>
                  {watchedEpisodeCount === 0
                    ? "Not started"
                    : detail?.episodeCount
                      ? `${watchedEpisodeCount}/${detail.episodeCount} watched`
                      : `${watchedEpisodeCount} episodes watched`}
                </span>
                <span
                  className={cn(
                    "size-2 rounded-full",
                    watchedEpisodeCount > 0 ? "bg-success" : "bg-faint"
                  )}
                />
              </div>
            )}
          </div>
        </div>

        {/* info */}
        <div className="min-w-0 flex-1 pt-2 sm:pt-[150px]">
          {detail ? (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2.5">
                <span className="rounded-md bg-primary px-[9px] py-1 font-mono text-[10px] tracking-[0.06em] text-primary-foreground">
                  {isMovie ? "FILM" : "TV SERIES"}
                </span>
                {detail.year ? (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {detail.year}
                  </span>
                ) : null}
                {detail.status ? (
                  <>
                    <span className="size-1 rounded-full bg-faint" />
                    <span className="font-mono text-[11px] text-success">
                      {detail.status}
                    </span>
                  </>
                ) : null}
              </div>
              <h1 className="display text-[40px] leading-[0.96] sm:text-[52px]">
                {detail.title}
              </h1>
              {detail.overview ? (
                <p className="mt-5 max-w-[62ch] text-[15px] leading-[1.6] text-muted-foreground">
                  {detail.overview}
                </p>
              ) : null}

              <FactsGrid detail={detail} />

              {detail.genres.length > 0 || detail.creators.length > 0 ? (
                <div className="mt-6 flex flex-wrap items-center gap-2">
                  {detail.genres.map((genre) => (
                    <span
                      key={genre}
                      className="rounded-[20px] border border-border px-3.5 py-[7px] text-[12.5px] text-muted-foreground"
                    >
                      {genre}
                    </span>
                  ))}
                  {detail.creators.length > 0 ||
                  detail.productionCompanies.length > 0 ? (
                    <>
                      <span className="mx-1 h-5 w-px bg-border" />
                      <span className="font-mono text-[11px] text-faint">
                        {isMovie ? "DIRECTED BY" : "STUDIO"}
                      </span>
                      <span className="rounded-[20px] border border-border px-3.5 py-[7px] text-[12.5px] text-foreground">
                        {(detail.creators[0] ??
                          detail.productionCompanies[0]) ||
                          "—"}
                      </span>
                    </>
                  ) : null}
                </div>
              ) : null}

              {mediaType === "tv" ? (
                <AnimeTrackingSection
                  tmdbId={tmdbId}
                  title={detail.title}
                  year={detail.year}
                />
              ) : null}
            </>
          ) : (
            <p className="font-mono text-[12px] text-faint">
              {state.status === "error" ? state.message : "Loading…"}
            </p>
          )}
        </div>
      </div>

      {mediaType === "tv" ? (
        <EpisodesSection
          tmdbId={tmdbId}
          seasonCount={detail?.seasonCount ?? 1}
          seasonEpisodeCounts={detail?.seasons ?? []}
        />
      ) : null}
    </div>
  )
}

function FactsGrid({ detail }: { detail: MediaDetailType }) {
  const facts = buildFacts(detail)

  if (facts.length === 0) {
    return null
  }

  return (
    <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-[13px] border border-border bg-border sm:grid-cols-4">
      {facts.map((fact) => (
        <div key={fact.label} className="bg-background px-[17px] py-[15px]">
          <div className="font-mono text-[10px] text-faint">{fact.label}</div>
          <div className="mt-[5px] text-[15px] font-semibold">{fact.value}</div>
        </div>
      ))}
    </div>
  )
}

function AnimeTrackingSection({
  tmdbId,
  title,
  year,
}: {
  tmdbId: number
  title: string
  year: string | null
}) {
  const { getByTmdbId, addItem, removeItem, updateMatch } = useAnimeTracking()
  const tracked = getByTmdbId(tmdbId)
  const [status, setStatus] = useState<
    "idle" | "searching" | "no-match" | "error"
  >("idle")
  const [pickerResults, setPickerResults] = useState<AnilistMedia[] | null>(null)

  const handleAdd = async () => {
    setStatus("searching")
    setPickerResults(null)
    try {
      const results = await searchAnilistAnime(title)
      const best = pickBestAnilistMatch(results, year)
      if (!best) {
        setStatus("no-match")
        return
      }
      addItem({
        anilistId: best.id,
        tmdbId,
        title: best.title,
        coverImage: best.coverImage,
      })
      setStatus("idle")
    } catch {
      setStatus("error")
    }
  }

  const handleOpenPicker = async () => {
    setStatus("searching")
    try {
      const results = await searchAnilistAnime(title)
      setPickerResults(results)
      setStatus(results.length === 0 ? "no-match" : "idle")
    } catch {
      setStatus("error")
    }
  }

  const handlePick = (media: AnilistMedia) => {
    if (tracked) {
      updateMatch(tmdbId, media)
    } else {
      addItem({
        anilistId: media.id,
        tmdbId,
        title: media.title,
        coverImage: media.coverImage,
      })
    }
    setPickerResults(null)
    setStatus("idle")
  }

  return (
    <div className="mt-7 rounded-[14px] border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="size-[7px] flex-none rounded-full bg-success" />
          <span className="font-mono text-[11px] tracking-[0.05em] text-foreground">
            ANILIST · {tracked ? "MATCHED" : "NOT TRACKED"}
          </span>
          <span className="truncate text-[13px] text-muted-foreground">
            {tracked
              ? tracked.title
              : status === "searching"
                ? "searching…"
                : status === "no-match"
                  ? "no anime match found"
                  : status === "error"
                    ? "could not reach AniList"
                    : "add this anime to track airing"}
          </span>
        </div>
        <div className="flex gap-2">
          {tracked ? (
            <>
              <a
                href={`https://anilist.co/anime/${tracked.anilistId}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-[9px] border border-border bg-secondary px-[15px] py-[9px] text-[12.5px] font-semibold text-foreground transition-colors hover:bg-secondary/70"
              >
                View on AniList ↗
              </a>
              <button
                type="button"
                onClick={handleOpenPicker}
                disabled={status === "searching"}
                className="rounded-[9px] border border-border bg-secondary px-[15px] py-[9px] text-[12.5px] font-semibold text-foreground transition-colors hover:bg-secondary/70 disabled:opacity-50"
              >
                Change match
              </button>
              <button
                type="button"
                onClick={() => {
                  removeItem(tmdbId)
                  setPickerResults(null)
                  setStatus("idle")
                }}
                className="rounded-[9px] border border-border px-[15px] py-[9px] text-[12.5px] font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                Remove from list
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              disabled={status === "searching"}
              className="rounded-[9px] bg-primary px-[15px] py-[9px] text-[12.5px] font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Add to my list
            </button>
          )}
        </div>
      </div>

      {pickerResults && pickerResults.length > 0 ? (
        <div className="mt-4 grid gap-2">
          <p className="font-mono text-[10px] tracking-[0.05em] text-faint">
            PICK THE MATCHING ANILIST ENTRY
          </p>
          {pickerResults.map((media) => (
            <button
              key={media.id}
              type="button"
              onClick={() => handlePick(media)}
              className="flex items-center justify-between gap-3 rounded-[9px] border border-border bg-background px-4 py-2.5 text-left text-sm transition-colors hover:border-primary/50"
            >
              <span className="min-w-0 truncate text-foreground">
                {media.title}
              </span>
              <span className="shrink-0 font-mono text-[11px] text-faint">
                {[media.format, media.seasonYear].filter(Boolean).join(" · ")}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function buildFacts(detail: MediaDetailType) {
  const facts: Array<{ label: string; value: string }> = []

  if (detail.releaseDate) {
    facts.push({ label: "RELEASE", value: formatDate(detail.releaseDate) })
  }
  if (detail.voteAverage !== null) {
    facts.push({ label: "RATING", value: `★ ${detail.voteAverage.toFixed(1)}` })
  }
  if (detail.runtime) {
    facts.push({ label: "RUNTIME", value: `${detail.runtime} min` })
  }
  if (detail.status) {
    facts.push({ label: "STATUS", value: detail.status })
  }
  if (detail.seasonCount) {
    facts.push({ label: "SEASONS", value: String(detail.seasonCount) })
  }
  if (detail.episodeCount) {
    facts.push({ label: "EPISODES", value: String(detail.episodeCount) })
  }
  if (detail.voteCount > 0) {
    facts.push({ label: "VOTES", value: detail.voteCount.toLocaleString() })
  }
  if (detail.originalTitle && detail.originalTitle !== detail.title) {
    facts.push({ label: "ORIGINAL", value: detail.originalTitle })
  }

  return facts.slice(0, 8)
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
