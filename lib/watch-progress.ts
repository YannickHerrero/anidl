import { type SearchMediaType } from "@/lib/tmdb"

export const WATCH_PROGRESS_STORAGE_KEY = "anidl.watch-progress"
export const WATCH_PROGRESS_STORAGE_EVENT = "anidl:watch-progress-change"

type MovieWatchProgress = {
  mediaType: "movie"
  tmdbId: number
  watchedAt: string
}

type TvWatchProgress = {
  mediaType: "tv"
  tmdbId: number
  watchedEpisodes: string[]
}

export type MediaWatchProgress = MovieWatchProgress | TvWatchProgress

export type EpisodeRef = {
  seasonNumber: number
  episodeNumber: number
}

export const emptyWatchProgress: MediaWatchProgress[] = []

let cachedItems: MediaWatchProgress[] = emptyWatchProgress
let cachedSerializedItems = ""

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
}

function buildEpisodeKey({ seasonNumber, episodeNumber }: EpisodeRef) {
  return `${seasonNumber}:${episodeNumber}`
}

function parseEpisodeKey(value: string): EpisodeRef | null {
  const [seasonNumberRaw, episodeNumberRaw] = value.split(":")
  const seasonNumber = Number(seasonNumberRaw)
  const episodeNumber = Number(episodeNumberRaw)

  if (!isPositiveInteger(seasonNumber) || !isPositiveInteger(episodeNumber)) {
    return null
  }

  return { seasonNumber, episodeNumber }
}

function normalizeEpisodeRefs(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return []
  }

  return Array.from(
    new Set(
      input.flatMap((item) => {
        if (typeof item === "string") {
          const parsedItem = parseEpisodeKey(item)
          return parsedItem ? [buildEpisodeKey(parsedItem)] : []
        }

        if (typeof item !== "object" || item === null) {
          return []
        }

        const record = item as Partial<EpisodeRef>

        return isPositiveInteger(record.seasonNumber) &&
          isPositiveInteger(record.episodeNumber)
          ? [
              buildEpisodeKey({
                seasonNumber: record.seasonNumber,
                episodeNumber: record.episodeNumber,
              }),
            ]
          : []
      })
    )
  ).sort((left, right) => {
    const leftEpisode = parseEpisodeKey(left)
    const rightEpisode = parseEpisodeKey(right)

    if (!leftEpisode || !rightEpisode) {
      return 0
    }

    if (leftEpisode.seasonNumber !== rightEpisode.seasonNumber) {
      return leftEpisode.seasonNumber - rightEpisode.seasonNumber
    }

    return leftEpisode.episodeNumber - rightEpisode.episodeNumber
  })
}

function normalizeMediaWatchProgress(
  input: Partial<MediaWatchProgress> | null | undefined
): MediaWatchProgress | null {
  if (!input || !isPositiveInteger(input.tmdbId)) {
    return null
  }

  if (input.mediaType === "movie") {
    const watchedAt = input.watchedAt?.trim() || new Date().toISOString()

    return {
      mediaType: "movie",
      tmdbId: input.tmdbId,
      watchedAt,
    }
  }

  if (input.mediaType === "tv") {
    return {
      mediaType: "tv",
      tmdbId: input.tmdbId,
      watchedEpisodes: normalizeEpisodeRefs(input.watchedEpisodes),
    }
  }

  return null
}

function normalizeMediaWatchProgressItems(
  input: unknown
): MediaWatchProgress[] {
  if (!Array.isArray(input)) {
    return []
  }

  return input
    .map((item) =>
      normalizeMediaWatchProgress(item as Partial<MediaWatchProgress>)
    )
    .filter((item): item is MediaWatchProgress => item !== null)
}

export function readStoredWatchProgress() {
  if (typeof window === "undefined") {
    return emptyWatchProgress
  }

  try {
    const raw = window.localStorage.getItem(WATCH_PROGRESS_STORAGE_KEY) ?? ""

    if (raw === cachedSerializedItems) {
      return cachedItems
    }

    if (!raw) {
      cachedSerializedItems = ""
      cachedItems = emptyWatchProgress
      return cachedItems
    }

    cachedSerializedItems = raw
    cachedItems = normalizeMediaWatchProgressItems(JSON.parse(raw))
    return cachedItems
  } catch {
    cachedSerializedItems = ""
    cachedItems = emptyWatchProgress
    return cachedItems
  }
}

export function subscribeToWatchProgress(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {}
  }

  const handleChange = () => {
    onStoreChange()
  }

  window.addEventListener("storage", handleChange)
  window.addEventListener(WATCH_PROGRESS_STORAGE_EVENT, handleChange)

  return () => {
    window.removeEventListener("storage", handleChange)
    window.removeEventListener(WATCH_PROGRESS_STORAGE_EVENT, handleChange)
  }
}

function saveStoredWatchProgress(items: MediaWatchProgress[]) {
  const normalizedItems = normalizeMediaWatchProgressItems(items)
  const serializedItems = JSON.stringify(normalizedItems)

  cachedItems = normalizedItems
  cachedSerializedItems = serializedItems

  if (typeof window !== "undefined") {
    window.localStorage.setItem(WATCH_PROGRESS_STORAGE_KEY, serializedItems)
    window.dispatchEvent(new Event(WATCH_PROGRESS_STORAGE_EVENT))
  }

  return normalizedItems
}

export function getMediaWatchProgress(
  mediaType: SearchMediaType,
  tmdbId: number
) {
  return readStoredWatchProgress().find(
    (item) => item.mediaType === mediaType && item.tmdbId === tmdbId
  )
}

export function setMovieWatched(tmdbId: number, watched: boolean) {
  const currentItems = readStoredWatchProgress().filter(
    (item) => !(item.mediaType === "movie" && item.tmdbId === tmdbId)
  )

  if (!watched) {
    return saveStoredWatchProgress(currentItems)
  }

  return saveStoredWatchProgress([
    ...currentItems,
    {
      mediaType: "movie",
      tmdbId,
      watchedAt: new Date().toISOString(),
    },
  ])
}

export function setTvEpisodesWatched(
  tmdbId: number,
  episodes: EpisodeRef[],
  watched: boolean
) {
  const normalizedKeys = normalizeEpisodeRefs(episodes)
  const currentItems = readStoredWatchProgress()
  const currentEntry = currentItems.find(
    (item): item is TvWatchProgress =>
      item.mediaType === "tv" && item.tmdbId === tmdbId
  )
  const remainingItems = currentItems.filter(
    (item) => !(item.mediaType === "tv" && item.tmdbId === tmdbId)
  )
  const watchedEpisodeKeys = watched
    ? normalizeEpisodeRefs([
        ...(currentEntry?.watchedEpisodes ?? []),
        ...normalizedKeys,
      ])
    : (currentEntry?.watchedEpisodes ?? []).filter(
        (episodeKey) => !normalizedKeys.includes(episodeKey)
      )

  if (watchedEpisodeKeys.length === 0) {
    return saveStoredWatchProgress(remainingItems)
  }

  return saveStoredWatchProgress([
    ...remainingItems,
    {
      mediaType: "tv",
      tmdbId,
      watchedEpisodes: watchedEpisodeKeys,
    },
  ])
}

export function setTvEpisodeWatched(
  tmdbId: number,
  seasonNumber: number,
  episodeNumber: number,
  watched: boolean
) {
  return setTvEpisodesWatched(
    tmdbId,
    [{ seasonNumber, episodeNumber }],
    watched
  )
}

export function isEpisodeWatched(
  progress: MediaWatchProgress | undefined,
  seasonNumber: number,
  episodeNumber: number
) {
  if (!progress || progress.mediaType !== "tv") {
    return false
  }

  return progress.watchedEpisodes.includes(
    buildEpisodeKey({ seasonNumber, episodeNumber })
  )
}

export function getWatchedEpisodeCount(
  progress: MediaWatchProgress | undefined
) {
  return progress?.mediaType === "tv" ? progress.watchedEpisodes.length : 0
}

export function getWatchedSeasonEpisodeCount(
  progress: MediaWatchProgress | undefined,
  seasonNumber: number
) {
  if (!progress || progress.mediaType !== "tv") {
    return 0
  }

  return progress.watchedEpisodes.reduce((count, episodeKey) => {
    const parsedEpisode = parseEpisodeKey(episodeKey)

    return parsedEpisode?.seasonNumber === seasonNumber ? count + 1 : count
  }, 0)
}
