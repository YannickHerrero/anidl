import { type SearchMediaType } from "@/lib/tmdb"

export const DOWNLOAD_PROGRESS_STORAGE_KEY = "anidl.download-progress"
export const DOWNLOAD_PROGRESS_STORAGE_EVENT = "anidl:download-progress-change"

type MovieDownload = {
  mediaType: "movie"
  tmdbId: number
  downloadedAt: string
}

type TvDownload = {
  mediaType: "tv"
  tmdbId: number
  downloadedEpisodes: string[]
}

export type MediaDownloadProgress = MovieDownload | TvDownload

export type EpisodeRef = {
  seasonNumber: number
  episodeNumber: number
}

export const emptyDownloadProgress: MediaDownloadProgress[] = []

let cachedItems: MediaDownloadProgress[] = emptyDownloadProgress
let cachedSerializedItems = ""

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
}

function buildEpisodeKey({ seasonNumber, episodeNumber }: EpisodeRef) {
  return `${seasonNumber}:${episodeNumber}`
}

function parseEpisodeKey(value: string): EpisodeRef | null {
  const [seasonRaw, episodeRaw] = value.split(":")
  const seasonNumber = Number(seasonRaw)
  const episodeNumber = Number(episodeRaw)

  if (!isPositiveInteger(seasonNumber) || !isPositiveInteger(episodeNumber)) {
    return null
  }

  return { seasonNumber, episodeNumber }
}

function normalizeEpisodeKeys(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return []
  }

  return Array.from(
    new Set(
      input.flatMap((item) => {
        if (typeof item !== "string") {
          return []
        }
        const parsed = parseEpisodeKey(item)
        return parsed ? [buildEpisodeKey(parsed)] : []
      })
    )
  ).sort()
}

function normalizeItem(
  input: Partial<MediaDownloadProgress> | null | undefined
): MediaDownloadProgress | null {
  if (!input || !isPositiveInteger(input.tmdbId)) {
    return null
  }

  if (input.mediaType === "movie") {
    return {
      mediaType: "movie",
      tmdbId: input.tmdbId,
      downloadedAt: input.downloadedAt?.trim() || new Date().toISOString(),
    }
  }

  if (input.mediaType === "tv") {
    return {
      mediaType: "tv",
      tmdbId: input.tmdbId,
      downloadedEpisodes: normalizeEpisodeKeys(input.downloadedEpisodes),
    }
  }

  return null
}

function normalizeItems(input: unknown): MediaDownloadProgress[] {
  if (!Array.isArray(input)) {
    return []
  }

  return input
    .map((item) => normalizeItem(item as Partial<MediaDownloadProgress>))
    .filter((item): item is MediaDownloadProgress => item !== null)
}

export function readStoredDownloadProgress() {
  if (typeof window === "undefined") {
    return emptyDownloadProgress
  }

  try {
    const raw = window.localStorage.getItem(DOWNLOAD_PROGRESS_STORAGE_KEY) ?? ""

    if (raw === cachedSerializedItems) {
      return cachedItems
    }

    if (!raw) {
      cachedSerializedItems = ""
      cachedItems = emptyDownloadProgress
      return cachedItems
    }

    cachedSerializedItems = raw
    cachedItems = normalizeItems(JSON.parse(raw))
    return cachedItems
  } catch {
    cachedSerializedItems = ""
    cachedItems = emptyDownloadProgress
    return cachedItems
  }
}

export function subscribeToDownloadProgress(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {}
  }

  const handleChange = () => {
    onStoreChange()
  }

  window.addEventListener("storage", handleChange)
  window.addEventListener(DOWNLOAD_PROGRESS_STORAGE_EVENT, handleChange)

  return () => {
    window.removeEventListener("storage", handleChange)
    window.removeEventListener(DOWNLOAD_PROGRESS_STORAGE_EVENT, handleChange)
  }
}

function saveStoredDownloadProgress(items: MediaDownloadProgress[]) {
  const normalizedItems = normalizeItems(items)
  const serializedItems = JSON.stringify(normalizedItems)

  cachedItems = normalizedItems
  cachedSerializedItems = serializedItems

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      DOWNLOAD_PROGRESS_STORAGE_KEY,
      serializedItems
    )
    window.dispatchEvent(new Event(DOWNLOAD_PROGRESS_STORAGE_EVENT))
  }

  return normalizedItems
}

export function getMediaDownloadProgress(
  mediaType: SearchMediaType,
  tmdbId: number
) {
  return readStoredDownloadProgress().find(
    (item) => item.mediaType === mediaType && item.tmdbId === tmdbId
  )
}

export function setMovieDownloaded(tmdbId: number, downloaded: boolean) {
  const remaining = readStoredDownloadProgress().filter(
    (item) => !(item.mediaType === "movie" && item.tmdbId === tmdbId)
  )

  if (!downloaded) {
    return saveStoredDownloadProgress(remaining)
  }

  return saveStoredDownloadProgress([
    ...remaining,
    { mediaType: "movie", tmdbId, downloadedAt: new Date().toISOString() },
  ])
}

export function setTvEpisodeDownloaded(
  tmdbId: number,
  seasonNumber: number,
  episodeNumber: number,
  downloaded: boolean
) {
  if (!isPositiveInteger(seasonNumber) || !isPositiveInteger(episodeNumber)) {
    return readStoredDownloadProgress()
  }

  const key = buildEpisodeKey({ seasonNumber, episodeNumber })
  const currentItems = readStoredDownloadProgress()
  const current = currentItems.find(
    (item): item is TvDownload =>
      item.mediaType === "tv" && item.tmdbId === tmdbId
  )
  const remaining = currentItems.filter(
    (item) => !(item.mediaType === "tv" && item.tmdbId === tmdbId)
  )
  const nextEpisodes = downloaded
    ? normalizeEpisodeKeys([...(current?.downloadedEpisodes ?? []), key])
    : (current?.downloadedEpisodes ?? []).filter((value) => value !== key)

  if (nextEpisodes.length === 0) {
    return saveStoredDownloadProgress(remaining)
  }

  return saveStoredDownloadProgress([
    ...remaining,
    { mediaType: "tv", tmdbId, downloadedEpisodes: nextEpisodes },
  ])
}

export function isEpisodeDownloaded(
  progress: MediaDownloadProgress | undefined,
  seasonNumber: number,
  episodeNumber: number
) {
  if (!progress || progress.mediaType !== "tv") {
    return false
  }

  return progress.downloadedEpisodes.includes(
    buildEpisodeKey({ seasonNumber, episodeNumber })
  )
}
