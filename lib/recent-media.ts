import { type SearchMediaItem } from "@/lib/tmdb"

export const RECENT_MEDIA_STORAGE_KEY = "anidl.recent-media"
export const RECENT_MEDIA_STORAGE_EVENT = "anidl:recent-media-change"

const MAX_RECENT_MEDIA_ITEMS = 8

export type RecentMediaItem = SearchMediaItem & {
  openedAt: string
}

let cachedItems: RecentMediaItem[] = []
let cachedSerializedItems = ""

function normalizeRecentMediaItem(
  input: Partial<RecentMediaItem> | null | undefined
): RecentMediaItem | null {
  if (!input) {
    return null
  }

  if (input.mediaType !== "movie" && input.mediaType !== "tv") {
    return null
  }

  if (typeof input.id !== "number" || !Number.isFinite(input.id)) {
    return null
  }

  const title = input.title?.trim()

  if (!title) {
    return null
  }

  return {
    id: input.id,
    mediaType: input.mediaType,
    title,
    overview: input.overview?.trim() ?? "",
    posterPath: input.posterPath ?? null,
    backdropPath: input.backdropPath ?? null,
    releaseDate: input.releaseDate?.trim() || null,
    year: input.year?.trim() || null,
    voteAverage:
      typeof input.voteAverage === "number" ? input.voteAverage : null,
    voteCount: typeof input.voteCount === "number" ? input.voteCount : 0,
    openedAt: input.openedAt?.trim() || new Date().toISOString(),
  }
}

function normalizeRecentMediaItems(input: unknown): RecentMediaItem[] {
  if (!Array.isArray(input)) {
    return []
  }

  return input
    .map((item) => normalizeRecentMediaItem(item as Partial<RecentMediaItem>))
    .filter((item): item is RecentMediaItem => item !== null)
    .slice(0, MAX_RECENT_MEDIA_ITEMS)
}

export function readStoredRecentMedia() {
  if (typeof window === "undefined") {
    return []
  }

  try {
    const raw = window.localStorage.getItem(RECENT_MEDIA_STORAGE_KEY) ?? ""

    if (!raw) {
      cachedSerializedItems = ""
      cachedItems = []
      return cachedItems
    }

    if (raw === cachedSerializedItems) {
      return cachedItems
    }

    cachedSerializedItems = raw
    cachedItems = normalizeRecentMediaItems(JSON.parse(raw))
    return cachedItems
  } catch {
    cachedSerializedItems = ""
    cachedItems = []
    return cachedItems
  }
}

export function subscribeToRecentMedia(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {}
  }

  const handleChange = () => {
    onStoreChange()
  }

  window.addEventListener("storage", handleChange)
  window.addEventListener(RECENT_MEDIA_STORAGE_EVENT, handleChange)

  return () => {
    window.removeEventListener("storage", handleChange)
    window.removeEventListener(RECENT_MEDIA_STORAGE_EVENT, handleChange)
  }
}

function saveStoredRecentMedia(items: RecentMediaItem[]) {
  const normalizedItems = normalizeRecentMediaItems(items)
  const serializedItems = JSON.stringify(normalizedItems)

  cachedItems = normalizedItems
  cachedSerializedItems = serializedItems

  if (typeof window !== "undefined") {
    window.localStorage.setItem(RECENT_MEDIA_STORAGE_KEY, serializedItems)
    window.dispatchEvent(new Event(RECENT_MEDIA_STORAGE_EVENT))
  }

  return normalizedItems
}

export function addRecentMediaItem(item: SearchMediaItem) {
  const nextItem = normalizeRecentMediaItem({
    ...item,
    openedAt: new Date().toISOString(),
  })

  if (!nextItem) {
    return readStoredRecentMedia()
  }

  const previousItems = readStoredRecentMedia()
  const deduplicatedItems = previousItems.filter(
    (previousItem) =>
      !(
        previousItem.id === nextItem.id &&
        previousItem.mediaType === nextItem.mediaType
      )
  )

  return saveStoredRecentMedia([nextItem, ...deduplicatedItems])
}

export function getRecentMediaItem(mediaType: string, id: number) {
  return readStoredRecentMedia().find(
    (item) => item.mediaType === mediaType && item.id === id
  )
}
