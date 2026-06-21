"use client"

import Link from "next/link"
import Image from "next/image"

import { useAnimeTracking } from "@/hooks/use-anime-tracking"
import { useWatchProgress } from "@/hooks/use-watch-progress"
import { type TrackedAnime } from "@/lib/anime-tracking"
import { getWatchedEpisodeCount } from "@/lib/watch-progress"

export function AnimeInProgressSection() {
  const { items } = useAnimeTracking()
  const { getItem } = useWatchProgress()

  const inProgress = items.filter(
    (item) => getWatchedEpisodeCount(getItem("tv", item.tmdbId)) > 0
  )

  if (inProgress.length === 0) {
    return null
  }

  return (
    <section className="grid gap-4 rounded-[30px] border border-border/70 bg-card/80 p-5 shadow-[0_18px_80px_-42px_rgba(18,38,33,0.38)] sm:p-6">
      <p className="text-xs font-semibold tracking-[0.24em] text-primary/80 uppercase">
        Anime in Progress
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {inProgress.map((item) => (
          <InProgressCard
            key={item.anilistId}
            item={item}
            watchedEpisodeCount={getWatchedEpisodeCount(
              getItem("tv", item.tmdbId)
            )}
          />
        ))}
      </div>
    </section>
  )
}

function InProgressCard({
  item,
  watchedEpisodeCount,
}: {
  item: TrackedAnime
  watchedEpisodeCount: number
}) {
  return (
    <Link
      href={`/media/tv/${item.tmdbId}`}
      className="group grid gap-0 overflow-hidden rounded-[20px] border border-border/70 bg-card/85 shadow-[0_18px_80px_-42px_rgba(18,38,33,0.42)] transition-transform duration-200 hover:-translate-y-0.5 hover:border-primary/35"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-[linear-gradient(145deg,rgba(208,237,225,0.42),rgba(243,219,180,0.35))]">
        {item.coverImage ? (
          <Image
            src={item.coverImage}
            alt={`Cover for ${item.title}`}
            className="h-full w-full object-cover"
            fill
            sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
          />
        ) : null}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-center text-white">
          <p className="text-xs font-medium text-white/90">
            {watchedEpisodeCount} watched
          </p>
        </div>
      </div>
    </Link>
  )
}
