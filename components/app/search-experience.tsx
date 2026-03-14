"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAppConfig } from "@/hooks/use-app-config"
import { useRecentMedia } from "@/hooks/use-recent-media"
import { useWatchProgress } from "@/hooks/use-watch-progress"
import {
  getTmdbImageUrl,
  searchTmdbMedia,
  type SearchMediaItem,
} from "@/lib/tmdb"
import {
  getWatchedEpisodeCount,
  type MediaWatchProgress,
} from "@/lib/watch-progress"

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
      return "1 match"
    }

    return `${searchState.totalResults.toLocaleString()} matches`
  }, [hasActiveSearch, searchState.status, searchState.totalResults])

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

    void runSearch(
      queryFromUrl,
      searchState.page + 1,
      true,
      abortController.signal
    )
  }, [
    hasMoreResults,
    queryFromUrl,
    runSearch,
    searchState.page,
    searchState.status,
  ])

  const handleRetry = useCallback(() => {
    if (!queryFromUrl || searchState.status === "loading") {
      return
    }

    const abortController = new AbortController()

    void runSearch(queryFromUrl, 1, false, abortController.signal)
  }, [queryFromUrl, runSearch, searchState.status])

  return (
    <div className="grid gap-6">
      <section className="rounded-[30px] border border-border/70 bg-card/85 p-5 shadow-[0_18px_80px_-38px_rgba(18,38,33,0.45)] backdrop-blur sm:p-6">
        <form
          className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
          onSubmit={(event) => {
            event.preventDefault()
            submitSearch(inputValue)
          }}
        >
          <div className="grid gap-2">
            <label
              htmlFor="search-query"
              className="text-xs font-semibold tracking-[0.24em] text-primary/80 uppercase"
            >
              Search query
            </label>
            <Input
              id="search-query"
              type="search"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Search movies and TV shows on TMDB"
              autoComplete="off"
              className="h-12 rounded-2xl border-border/80 bg-background/80 px-4 text-sm shadow-none"
            />
          </div>

          <Button type="submit" size="lg" className="rounded-2xl px-5">
            Search TMDB
          </Button>
        </form>

        {resultLabel ? (
          <div className="mt-4 text-sm text-muted-foreground">
            {resultLabel}
          </div>
        ) : null}
      </section>

      {!hasActiveSearch ? (
        <div className="grid gap-6">
          <EmptyPrompt />
          <RecentMediaSection items={recentItems} onOpen={addItem} />
        </div>
      ) : isInitialLoading ? (
        <LoadingState query={queryFromUrl} />
      ) : searchState.status === "error" && searchState.items.length === 0 ? (
        <ErrorState
          query={queryFromUrl}
          message={searchState.errorMessage}
          onRetry={handleRetry}
        />
      ) : searchState.items.length === 0 ? (
        <NoResultsState query={queryFromUrl} />
      ) : (
        <section className="grid gap-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-semibold tracking-[0.24em] text-primary/80 uppercase">
              Search results
            </p>
            <div className="rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs font-medium text-muted-foreground">
              Page {searchState.page} of {searchState.totalPages}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {searchState.items.map((item) => (
              <SearchResultCard
                key={`${item.mediaType}-${item.id}`}
                item={item}
                onOpen={addItem}
                progress={getItem(item.mediaType, item.id)}
              />
            ))}
          </div>

          {searchState.status === "error" && searchState.errorMessage ? (
            <div className="rounded-[24px] border border-destructive/25 bg-destructive/5 p-4 text-sm text-muted-foreground">
              Could not load more results right now. {searchState.errorMessage}
            </div>
          ) : null}

          <RecentMediaSection items={recentItems} onOpen={addItem} />

          {hasMoreResults ? (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="rounded-2xl px-5"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? "Loading more..." : "Load more"}
              </Button>
            </div>
          ) : null}
        </section>
      )}
    </div>
  )
}

function SearchResultCard({
  item,
  onOpen,
  progress,
}: {
  item: SearchMediaItem
  onOpen?: (item: SearchMediaItem) => void
  progress?: MediaWatchProgress
}) {
  const posterUrl = getTmdbImageUrl(item.posterPath)

  return (
    <Link
      href={`/media/${item.mediaType}/${item.id}`}
      onClick={() => onOpen?.(item)}
      className="group grid gap-4 rounded-[30px] border border-border/70 bg-card/85 p-4 shadow-[0_18px_80px_-42px_rgba(18,38,33,0.42)] transition-transform duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-card sm:grid-cols-[112px_minmax(0,1fr)] sm:p-5"
    >
      <div className="overflow-hidden rounded-[24px] border border-border/60 bg-[linear-gradient(145deg,rgba(208,237,225,0.42),rgba(243,219,180,0.35))]">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={`Poster for ${item.title}`}
            className="aspect-[2/3] h-full w-full object-cover"
            width={342}
            height={513}
          />
        ) : (
          <div className="flex aspect-[2/3] items-end p-4">
            <span className="rounded-full border border-border/70 bg-background/85 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              No poster
            </span>
          </div>
        )}
      </div>

      <article className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold tracking-[0.18em] text-primary uppercase">
            {item.mediaType === "movie" ? "Movie" : "TV show"}
          </span>
          <WatchBadge progress={progress} />
          {item.year ? (
            <span className="text-xs font-medium text-muted-foreground">
              {item.year}
            </span>
          ) : null}
          {item.voteAverage !== null ? (
            <span className="text-xs font-medium text-muted-foreground">
              {item.voteAverage.toFixed(1)} / 10
            </span>
          ) : null}
        </div>

        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground transition-colors group-hover:text-primary">
          {item.title}
        </h2>

        <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground">
          {item.overview ||
            "TMDB did not provide an overview for this title yet."}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>
            {item.voteCount > 0
              ? `${item.voteCount.toLocaleString()} votes`
              : "No rating count yet"}
          </span>
          <span className="font-medium text-primary">Open details</span>
        </div>
      </article>
    </Link>
  )
}

function RecentMediaSection({
  items,
  onOpen,
}: {
  items: SearchMediaItem[]
  onOpen: (item: SearchMediaItem) => void
}) {
  const { getItem } = useWatchProgress()

  if (items.length === 0) {
    return null
  }

  return (
    <section className="grid gap-4 rounded-[30px] border border-border/70 bg-card/80 p-5 shadow-[0_18px_80px_-42px_rgba(18,38,33,0.38)] sm:p-6">
      <p className="text-xs font-semibold tracking-[0.24em] text-primary/80 uppercase">
        Recently opened
      </p>

      <div className="grid gap-4 xl:grid-cols-2">
        {items.map((item) => (
          <SearchResultCard
            key={`recent-${item.mediaType}-${item.id}`}
            item={item}
            onOpen={onOpen}
            progress={getItem(item.mediaType, item.id)}
          />
        ))}
      </div>
    </section>
  )
}

function WatchBadge({ progress }: { progress?: MediaWatchProgress }) {
  if (!progress) {
    return null
  }

  if (progress.mediaType === "movie") {
    return (
      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold tracking-[0.18em] text-emerald-700 uppercase">
        Watched
      </span>
    )
  }

  const watchedEpisodeCount = getWatchedEpisodeCount(progress)

  if (watchedEpisodeCount === 0) {
    return null
  }

  return (
    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold tracking-[0.18em] text-emerald-700 uppercase">
      {watchedEpisodeCount} watched
    </span>
  )
}

function EmptyPrompt() {
  return (
    <section className="rounded-[30px] border border-dashed border-border/75 bg-card/65 p-8 text-center shadow-[0_18px_80px_-42px_rgba(18,38,33,0.35)]">
      <p className="text-xs font-semibold tracking-[0.28em] text-primary/80 uppercase">
        Ready to search
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground">
        Start with a movie or TV title.
      </h2>
    </section>
  )
}

function LoadingState({ query }: { query: string }) {
  return (
    <section className="rounded-[30px] border border-border/70 bg-card/80 p-6 shadow-[0_18px_80px_-42px_rgba(18,38,33,0.4)]">
      <p className="text-xs font-semibold tracking-[0.24em] text-primary/80 uppercase">
        Searching TMDB
      </p>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Looking for matches for{" "}
        <span className="font-medium text-foreground">{query}</span>.
      </p>
    </section>
  )
}

function ErrorState({
  query,
  message,
  onRetry,
}: {
  query: string
  message: string | null
  onRetry: () => void
}) {
  return (
    <section className="rounded-[30px] border border-destructive/25 bg-destructive/5 p-6 shadow-[0_18px_80px_-42px_rgba(130,40,34,0.16)]">
      <p className="text-xs font-semibold tracking-[0.24em] text-destructive uppercase">
        Search failed
      </p>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        TMDB could not complete the search for{" "}
        <span className="font-medium text-foreground">{query}</span>.
      </p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {message ?? "Check the saved TMDB key and try again."}
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-4 rounded-2xl"
        onClick={onRetry}
      >
        Retry search
      </Button>
    </section>
  )
}

function NoResultsState({ query }: { query: string }) {
  return (
    <section className="rounded-[30px] border border-border/70 bg-card/80 p-6 shadow-[0_18px_80px_-42px_rgba(18,38,33,0.4)]">
      <p className="text-xs font-semibold tracking-[0.24em] text-primary/80 uppercase">
        No matches found
      </p>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        TMDB did not return any movie or TV result for{" "}
        <span className="font-medium text-foreground">{query}</span>.
      </p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Try a broader title, an original title, or remove the year from your
        query.
      </p>
    </section>
  )
}
