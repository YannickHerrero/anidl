"use client"

import Link from "next/link"
import Image from "next/image"

import { useAnilistWatching } from "@/hooks/use-anilist-watching"
import { type AnilistMedia, type AnilistWatchingEntry } from "@/lib/anilist"
import { cn } from "@/lib/utils"

export function AnilistWatchingView() {
  const { status, entries, user } = useAnilistWatching()

  return (
    <div className="max-w-[1220px] px-8 py-12 pb-20 sm:px-14">
      <div className="flex items-center gap-[11px]">
        <span className="size-2 rounded-full bg-success" />
        <h1 className="display text-[40px]">AniList</h1>
      </div>
      <div className="mt-2.5 font-mono text-[11px] text-faint">
        {!user
          ? "Add your AniList profile in Settings to see what you're watching."
          : status === "loading"
            ? "Loading your watching list…"
            : status === "error"
              ? "Could not load this AniList profile. Make sure the list is public."
              : `${entries.length} anime currently watching · ${user}`}
      </div>

      {!user ? (
        <div className="mt-9 rounded-[14px] border border-dashed border-border bg-card/60 p-10 text-center">
          <p className="font-mono text-[11px] tracking-[0.1em] text-primary">
            NO ANILIST PROFILE
          </p>
          <h2 className="display mt-3 text-2xl">Connect your AniList profile</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Enter your AniList username, ID, or profile URL in Settings to mirror
            your Watching list here.
          </p>
          <Link
            href="/settings"
            className="mt-5 inline-block rounded-[11px] bg-primary px-5 py-2.5 text-[13.5px] font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Open Settings
          </Link>
        </div>
      ) : status === "loading" ? (
        <div className="mt-9 grid grid-cols-2 gap-x-[18px] gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, index) => (
            <WatchingSkeleton key={index} />
          ))}
        </div>
      ) : status === "success" && entries.length === 0 ? (
        <div className="mt-9 rounded-[14px] border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Nothing on your Watching list right now.
        </div>
      ) : status === "success" ? (
        <div className="mt-9 grid grid-cols-2 gap-x-[18px] gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
          {entries.map((entry) => (
            <WatchingCard key={entry.media.id} entry={entry} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function WatchingCard({ entry }: { entry: AnilistWatchingEntry }) {
  const { media, progress } = entry
  const info = describeProgress(progress, media)

  return (
    <a
      href={`https://anilist.co/anime/${media.id}`}
      target="_blank"
      rel="noreferrer"
      className="group flex flex-col gap-3 transition-transform duration-150 hover:-translate-y-1"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border bg-secondary">
        {media.coverImage ? (
          <Image
            src={media.coverImage}
            alt={`Cover for ${media.title}`}
            fill
            sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover"
          />
        ) : null}
        {media.format ? (
          <span className="absolute top-2.5 right-2.5 rounded-md bg-black/45 px-[6px] py-[3px] font-mono text-[9px] tracking-[0.06em] text-white backdrop-blur">
            {media.format}
          </span>
        ) : null}
      </div>
      <div>
        <div className="truncate text-[13.5px] font-semibold text-foreground">
          {media.title}
        </div>
        <div className={cn("mt-1 font-mono text-[10.5px]", info.tone)}>
          {info.label}
        </div>
      </div>
    </a>
  )
}

function WatchingSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-[2/3] animate-pulse rounded-xl bg-secondary" />
      <div className="space-y-1.5">
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-secondary" />
        <div className="h-2.5 w-1/2 animate-pulse rounded bg-secondary" />
      </div>
    </div>
  )
}

function describeProgress(
  progress: number,
  media: AnilistMedia
): { label: string; tone: string } {
  if (media.nextAiringEpisode) {
    const aired = Math.max(media.nextAiringEpisode.episode - 1, progress)
    const behind = aired - progress
    return {
      label: `${progress}/${aired} · ${behind <= 0 ? "up to date" : `${behind} behind`}`,
      tone: behind > 0 ? "text-primary" : "text-success",
    }
  }

  if (media.episodes) {
    return { label: `${progress}/${media.episodes}`, tone: "text-faint" }
  }

  return { label: `${progress} watched`, tone: "text-faint" }
}
