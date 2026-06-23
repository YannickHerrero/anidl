"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { useAnilistWatchedResolver } from "@/hooks/use-anilist-progress"
import { useAppConfig } from "@/hooks/use-app-config"
import { useAiring } from "@/hooks/use-airing"
import { useCountdown } from "@/hooks/use-countdown"
import { useRecentMedia } from "@/hooks/use-recent-media"
import { useWatchProgress } from "@/hooks/use-watch-progress"
import { formatCountdown, type AnilistAiringEpisode } from "@/lib/anilist"
import {
  getTmdbImageUrl,
  searchTmdbMedia,
  type SearchMediaItem,
} from "@/lib/tmdb"
import {
  getWatchedEpisodeCount,
  type MediaWatchProgress,
} from "@/lib/watch-progress"
import { type AiringEntry } from "@/hooks/use-airing"
import { cn } from "@/lib/utils"

type SearchStatus = "idle" | "loading" | "success" | "error"

type SearchState = {
  status: SearchStatus
  query: string
  items: SearchMediaItem[]
  page: number
  totalPages: number
  totalResults: number
  errorMessage: string | null
}

const initialSearchState: SearchState = {
  status: "idle",
  query: "",
  items: [],
  page: 0,
  totalPages: 0,
  totalResults: 0,
  errorMessage: null,
}

export function SearchExperience() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { config } = useAppConfig()
  const { addItem, items: recentItems } = useRecentMedia()
  const { getItem } = useWatchProgress()
  const resolveAnilistWatched = useAnilistWatchedResolver()
  const { items: trackedAnime, mediaById } = useAiring()
  const animeByTmdb = useMemo(() => {
    const map = new Map<number, AnimeAiringInfo>()
    for (const tracked of trackedAnime) {
      const media = mediaById.get(tracked.anilistId)
      if (media) {
        map.set(tracked.tmdbId, {
          total: media.episodes,
          next: media.nextAiringEpisode,
        })
      }
    }
    return map
  }, [trackedAnime, mediaById])
  const requestIdRef = useRef(0)
  const queryFromUrl = searchParams.get("q")?.trim() ?? ""
  const [inputValue, setInputValue] = useState(queryFromUrl)
  const [searchState, setSearchState] =
    useState<SearchState>(initialSearchState)

  const hasActiveSearch = queryFromUrl.length > 0
  const isInitialLoading =
    searchState.status === "loading" && searchState.items.length === 0
  const isLoadingMore =
    searchState.status === "loading" && searchState.items.length > 0
  const hasMoreResults = searchState.page < searchState.totalPages

  useEffect(() => {
    setInputValue(queryFromUrl)
  }, [queryFromUrl])

  const runSearch = useCallback(
    async (
      query: string,
      page: number,
      append: boolean,
      signal: AbortSignal
    ) => {
      const currentRequestId = requestIdRef.current + 1
      requestIdRef.current = currentRequestId

      setSearchState((currentState) => ({
        ...currentState,
        status: "loading",
        query,
        errorMessage: null,
      }))

      try {
        const response = await searchTmdbMedia({
          apiKey: config.tmdbApiKey,
          query,
          page,
          includeAdult: true,
          signal,
        })

        if (requestIdRef.current !== currentRequestId) {
          return
        }

        setSearchState((currentState) => ({
          status: "success",
          query,
          items: append
            ? [...currentState.items, ...response.items]
            : response.items,
          page: response.page,
          totalPages: response.totalPages,
          totalResults: response.totalResults,
          errorMessage: null,
        }))
      } catch (error) {
        if (signal.aborted || requestIdRef.current !== currentRequestId) {
          return
        }

        setSearchState((currentState) => ({
          ...currentState,
          status: "error",
          query,
          errorMessage:
            error instanceof Error
              ? error.message
              : "Something went wrong while reaching TMDB.",
        }))
      }
    },
    [config.tmdbApiKey]
  )

  useEffect(() => {
    if (!queryFromUrl) {
      setSearchState(initialSearchState)
      return
    }

    const abortController = new AbortController()
    void runSearch(queryFromUrl, 1, false, abortController.signal)

    return () => {
      abortController.abort()
    }
  }, [queryFromUrl, runSearch])

  const resultLabel = useMemo(() => {
    if (!hasActiveSearch || searchState.status !== "success") {
      return null
    }

    if (searchState.totalResults === 1) {
      return "1 result"
    }

    return `${searchState.totalResults.toLocaleString()} results · page ${searchState.page} of ${searchState.totalPages}`
  }, [
    hasActiveSearch,
    searchState.status,
    searchState.totalResults,
    searchState.page,
    searchState.totalPages,
  ])

  const submitSearch = useCallback(
    (rawQuery: string) => {
      const trimmedQuery = rawQuery.trim()
      const params = new URLSearchParams(searchParams.toString())

      if (!trimmedQuery) {
        params.delete("q")
      } else {
        params.set("q", trimmedQuery)
      }

      const nextUrl = params.toString() ? `${pathname}?${params}` : pathname
      router.push(nextUrl)
    },
    [pathname, router, searchParams]
  )

  const handleLoadMore = useCallback(() => {
    if (!queryFromUrl || !hasMoreResults || searchState.status === "loading") {
      return
    }

    const abortController = new AbortController()
    void runSearch(queryFromUrl, searchState.page + 1, true, abortController.signal)
  }, [
    hasMoreResults,
    queryFromUrl,
    runSearch,
    searchState.page,
    searchState.status,
  ])

  return (
    <div className="flex max-w-[1220px] flex-col gap-10 px-8 py-12 pb-20 sm:px-14">
      <div>
        <h1 className="display max-w-[14ch] text-[40px] leading-none sm:text-[48px]">
          What are we watching?
        </h1>
        <form
          className="mt-6 flex max-w-[680px] items-center gap-3.5 rounded-[14px] border border-border bg-card px-5 py-4"
          onSubmit={(event) => {
            event.preventDefault()
            submitSearch(inputValue)
          }}
        >
          <span className="size-[17px] flex-none rounded-full border-2 border-faint" />
          <input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Search movies & TV…"
            autoComplete="off"
            type="search"
            className="flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-faint"
          />
          <span className="rounded-md border border-border px-2 py-1 font-mono text-[11px] text-faint">
            ↵ enter
          </span>
        </form>
        {resultLabel ? (
          <div className="mt-3 font-mono text-[11px] text-faint">
            {resultLabel}
          </div>
        ) : null}
      </div>

      {!hasActiveSearch ? (
        <>
          <AiringStrip />
          {recentItems.length > 0 ? (
            <ResultsGrid
              label="Recently opened"
              items={recentItems}
              onOpen={addItem}
              getProgress={getItem}
              animeByTmdb={animeByTmdb}
              resolveAnilistWatched={resolveAnilistWatched}
            />
          ) : (
            <EmptyPrompt />
          )}
        </>
      ) : isInitialLoading ? (
        <SectionNote label="Searching TMDB" body={`Looking for "${queryFromUrl}".`} />
      ) : searchState.status === "error" && searchState.items.length === 0 ? (
        <SectionNote
          label="Search failed"
          body={searchState.errorMessage ?? "Check the saved TMDB key and try again."}
        />
      ) : searchState.items.length === 0 ? (
        <SectionNote
          label="No matches"
          body={`TMDB returned nothing for "${queryFromUrl}".`}
        />
      ) : (
        <div className="flex flex-col gap-9">
          <ResultsGrid
            label="Results"
            items={searchState.items}
            onOpen={addItem}
            getProgress={getItem}
            animeByTmdb={animeByTmdb}
            resolveAnilistWatched={resolveAnilistWatched}
          />
          {hasMoreResults ? (
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="rounded-[10px] border border-border bg-card px-6 py-3 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
              >
                {isLoadingMore ? "Loading…" : "Load more"}
              </button>
              <span className="font-mono text-[11px] text-faint">
                showing {searchState.items.length} / {searchState.totalResults}
              </span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

type AnimeAiringInfo = {
  total: number | null
  next: AnilistAiringEpisode | null
}

function ResultsGrid({
  label,
  items,
  onOpen,
  getProgress,
  animeByTmdb,
  resolveAnilistWatched,
}: {
  label: string
  items: SearchMediaItem[]
  onOpen: (item: SearchMediaItem) => void
  getProgress: (
    mediaType: SearchMediaItem["mediaType"],
    id: number
  ) => MediaWatchProgress | undefined
  animeByTmdb: Map<number, AnimeAiringInfo>
  resolveAnilistWatched: (tmdbId: number) => number | undefined
}) {
  return (
    <div>
      <SectionHeader label={label} />
      <div className="grid grid-cols-2 gap-x-[18px] gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item) => (
          <PosterCard
            key={`${item.mediaType}-${item.id}`}
            item={item}
            onOpen={onOpen}
            progress={getProgress(item.mediaType, item.id)}
            anime={animeByTmdb.get(item.id)}
            anilistWatched={resolveAnilistWatched(item.id)}
          />
        ))}
      </div>
    </div>
  )
}

function PosterCard({
  item,
  onOpen,
  progress,
  anime,
  anilistWatched,
}: {
  item: SearchMediaItem
  onOpen: (item: SearchMediaItem) => void
  progress?: MediaWatchProgress
  anime?: AnimeAiringInfo
  anilistWatched?: number
}) {
  const posterUrl = getTmdbImageUrl(item.posterPath)
  const cardProgress = buildCardProgress(progress, anime, anilistWatched)

  return (
    <Link
      href={`/media/${item.mediaType}/${item.id}`}
      onClick={() => onOpen(item)}
      className="group flex flex-col gap-3 transition-transform duration-150 hover:-translate-y-1"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border bg-secondary">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={`Poster for ${item.title}`}
            fill
            sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover"
          />
        ) : null}
        <span className="absolute top-2.5 left-2.5 rounded-md bg-black/45 px-[7px] py-[3px] font-mono text-[10px] text-white backdrop-blur">
          ★ {item.voteAverage !== null ? item.voteAverage.toFixed(1) : "—"}
        </span>
        <span className="absolute top-2.5 right-2.5 rounded-md bg-black/45 px-[6px] py-[3px] font-mono text-[9px] tracking-[0.06em] text-white backdrop-blur">
          {item.mediaType === "movie" ? "FILM" : "TV"}
        </span>
      </div>
      <div>
        <div className="truncate text-[13.5px] font-semibold text-foreground">
          {item.title}
        </div>
        <div className="mt-[3px] font-mono text-[10.5px] text-faint">
          {[item.year, item.mediaType === "movie" ? "MOVIE" : "TV"]
            .filter(Boolean)
            .join(" · ")}
        </div>
        {cardProgress ? (
          <div className={cn("mt-1 font-mono text-[10.5px]", cardProgress.tone)}>
            {cardProgress.label}
          </div>
        ) : null}
      </div>
    </Link>
  )
}

function AiringStrip() {
  const { items, airing, status } = useAiring()

  // While AniList loads, reserve space with skeletons so the section doesn't
  // pop in. Tracked count is known synchronously from localStorage.
  const isLoading = status === "loading" && items.length > 0
  const skeletonCount = Math.min(Math.max(items.length, 1), 3)

  if (!isLoading && airing.length === 0) {
    return null
  }

  return (
    <div>
      <div className="mb-[15px] flex items-center gap-2.5">
        <span className="size-[7px] animate-[anidlPulse_1.6s_ease-in-out_infinite] rounded-full bg-primary" />
        <span className="font-mono text-[11px] tracking-[0.08em] text-foreground">
          AIRING NOW
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: skeletonCount }, (_, index) => (
              <AiringStripSkeleton key={index} />
            ))
          : airing
              .slice(0, 6)
              .map((entry) => (
                <AiringStripCard key={entry.tracked.anilistId} entry={entry} />
              ))}
      </div>
    </div>
  )
}

function AiringStripSkeleton() {
  return (
    <div className="flex items-center gap-3.5 rounded-[13px] border border-l-2 border-border border-l-primary/40 bg-card p-3.5">
      <div className="h-[62px] w-[46px] flex-none animate-pulse rounded-[7px] bg-secondary" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-secondary" />
        <div className="h-2.5 w-10 animate-pulse rounded bg-secondary" />
        <div className="h-3 w-20 animate-pulse rounded bg-secondary" />
      </div>
    </div>
  )
}

function AiringStripCard({ entry }: { entry: AiringEntry }) {
  const secondsUntil = useCountdown(entry.airingAt)

  return (
    <Link
      href={`/media/tv/${entry.tracked.tmdbId}`}
      className="flex items-center gap-3.5 rounded-[13px] border border-l-2 border-border border-l-primary bg-card p-3.5 transition-transform duration-150 hover:-translate-y-[3px]"
    >
      <div className="relative h-[62px] w-[46px] flex-none overflow-hidden rounded-[7px] bg-secondary">
        {entry.tracked.coverImage ? (
          <Image
            src={entry.tracked.coverImage}
            alt=""
            fill
            sizes="46px"
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="min-w-0">
        <div className="truncate text-[13.5px] font-semibold text-foreground">
          {entry.tracked.title}
        </div>
        <div className="mt-[3px] font-mono text-[11px] text-primary">
          EP {entry.episode}
        </div>
        <div className="mt-[5px] font-mono text-[12px] text-muted-foreground">
          {formatCountdown(secondsUntil)}
        </div>
      </div>
    </Link>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="font-mono text-[11px] tracking-[0.08em] text-foreground">
        {label.toUpperCase()}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

function SectionNote({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <p className="font-mono text-[11px] tracking-[0.08em] text-primary">
        {label.toUpperCase()}
      </p>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  )
}

function EmptyPrompt() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
      <p className="font-mono text-[11px] tracking-[0.1em] text-primary">
        READY TO SEARCH
      </p>
      <h2 className="display mt-3 text-3xl">Start with a movie or TV title.</h2>
    </div>
  )
}

function buildCardProgress(
  progress: MediaWatchProgress | undefined,
  anime: AnimeAiringInfo | undefined,
  anilistWatched: number | undefined
): { label: string; tone: string } | null {
  if (progress?.mediaType === "movie") {
    return { label: "Watched", tone: "text-success" }
  }

  const count =
    anilistWatched ??
    (progress?.mediaType === "tv" ? getWatchedEpisodeCount(progress) : 0)

  if (anime?.next) {
    const aired = Math.max(anime.next.episode - 1, count)
    const behind = aired - count
    return {
      label: `${count}/${aired} · ${behind <= 0 ? "up to date" : `${behind} behind`}`,
      tone: behind > 0 ? "text-primary" : "text-success",
    }
  }

  if (anime?.total) {
    return { label: `${count}/${anime.total} watched`, tone: "text-faint" }
  }

  // Untracked show with no AniList total: only show once there's progress.
  return count > 0 ? { label: `${count} watched`, tone: "text-faint" } : null
}
