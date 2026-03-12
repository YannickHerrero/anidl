"use client"

import { useMemo } from "react"

import { useRecentMedia } from "@/hooks/use-recent-media"
import { getTmdbImageUrl, type SearchMediaType } from "@/lib/tmdb"

type MediaDetailPreviewProps = Readonly<{
  mediaType: SearchMediaType
  tmdbId: number
}>

export function MediaDetailPreview({
  mediaType,
  tmdbId,
}: MediaDetailPreviewProps) {
  const { items } = useRecentMedia()
  const item = useMemo(
    () =>
      items.find(
        (entry) => entry.mediaType === mediaType && entry.id === tmdbId
      ),
    [items, mediaType, tmdbId]
  )

  if (!item) {
    return (
      <section className="rounded-[28px] border border-border/70 bg-card/80 p-6 shadow-[0_18px_80px_-38px_rgba(18,38,33,0.45)] backdrop-blur">
        <div className="flex flex-wrap gap-2 text-xs tracking-[0.18em] text-muted-foreground uppercase">
          <span>TMDB {tmdbId}</span>
          <span>{mediaType === "movie" ? "Movie" : "TV show"}</span>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Details and download actions are not available yet. Open this title
          from search once to keep a lightweight local preview here.
        </p>
      </section>
    )
  }

  const posterUrl = getTmdbImageUrl(item.posterPath, "w500")

  return (
    <section className="grid gap-6 rounded-[30px] border border-border/70 bg-card/85 p-5 shadow-[0_18px_80px_-38px_rgba(18,38,33,0.45)] backdrop-blur md:grid-cols-[220px_minmax(0,1fr)] md:p-6">
      <div className="overflow-hidden rounded-[26px] border border-border/70 bg-[linear-gradient(145deg,rgba(208,237,225,0.42),rgba(243,219,180,0.35))]">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={`Poster for ${item.title}`}
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

      <article>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold tracking-[0.18em] text-primary uppercase">
            {mediaType === "movie" ? "Movie" : "TV show"}
          </span>
          <span>TMDB {tmdbId}</span>
          {item.year ? <span>{item.year}</span> : null}
          {item.voteAverage !== null ? (
            <span>{item.voteAverage.toFixed(1)} / 10</span>
          ) : null}
        </div>

        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
          {item.title}
        </h2>

        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          {item.overview ||
            "TMDB did not include an overview for this title in the local preview."}
        </p>

        <div className="mt-5 rounded-[24px] border border-border/70 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
          Search is now wired, but the full metadata and download flow still
          need to be built on top of this route.
        </div>
      </article>
    </section>
  )
}
