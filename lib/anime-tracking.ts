import { type AnilistMedia } from "@/lib/anilist"

export const ANIME_TRACKING_STORAGE_KEY = "anidl.anime-tracking"
export const ANIME_TRACKING_STORAGE_EVENT = "anidl:anime-tracking-change"

export type TrackedAnime = {
  anilistId: number
  tmdbId: number
  title: string
  coverImage: string | null
  addedAt: string
}

export const emptyTrackedAnime: TrackedAnime[] = []

let cachedItems: TrackedAnime[] = emptyTrackedAnime
let cachedSerializedItems = ""

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
}

function normalizeTrackedAnime(
  input: Partial<TrackedAnime> | null | undefined
): TrackedAnime | null {
  if (!input || !isPositiveInteger(input.anilistId) || !isPositiveInteger(input.tmdbId)) {
    return null
  }

  const title = input.title?.trim()

  if (!title) {
    return null
  }

  return {
    anilistId: input.anilistId,
    tmdbId: input.tmdbId,
    title,
    coverImage: input.coverImage?.trim() || null,
    addedAt: input.addedAt?.trim() || new Date().toISOString(),
  }
}

function normalizeTrackedAnimeItems(input: unknown): TrackedAnime[] {
  if (!Array.isArray(input)) {
    return []
  }

  return input
    .map((item) => normalizeTrackedAnime(item as Partial<TrackedAnime>))
    .filter((item): item is TrackedAnime => item !== null)
}

export function readStoredTrackedAnime() {
  if (typeof window === "undefined") {
    return emptyTrackedAnime
  }

  try {
    const raw = window.localStorage.getItem(ANIME_TRACKING_STORAGE_KEY) ?? ""

    if (raw === cachedSerializedItems) {
      return cachedItems
    }

    if (!raw) {
      cachedSerializedItems = ""
      cachedItems = emptyTrackedAnime
      return cachedItems
    }

    cachedSerializedItems = raw
    cachedItems = normalizeTrackedAnimeItems(JSON.parse(raw))
    return cachedItems
  } catch {
    cachedSerializedItems = ""
    cachedItems = emptyTrackedAnime
    return cachedItems
  }
}

export function subscribeToTrackedAnime(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {}
  }

  const handleChange = () => {
    onStoreChange()
  }

  window.addEventListener("storage", handleChange)
  window.addEventListener(ANIME_TRACKING_STORAGE_EVENT, handleChange)

  return () => {
    window.removeEventListener("storage", handleChange)
    window.removeEventListener(ANIME_TRACKING_STORAGE_EVENT, handleChange)
  }
}

function saveStoredTrackedAnime(items: TrackedAnime[]) {
  const normalizedItems = normalizeTrackedAnimeItems(items)
  const serializedItems = JSON.stringify(normalizedItems)

  cachedItems = normalizedItems
  cachedSerializedItems = serializedItems

  if (typeof window !== "undefined") {
    window.localStorage.setItem(ANIME_TRACKING_STORAGE_KEY, serializedItems)
    window.dispatchEvent(new Event(ANIME_TRACKING_STORAGE_EVENT))
  }

  return normalizedItems
}

export function getTrackedByTmdbId(tmdbId: number) {
  return readStoredTrackedAnime().find((item) => item.tmdbId === tmdbId)
}

export function addTrackedAnime(input: {
  anilistId: number
  tmdbId: number
  title: string
  coverImage: string | null
}) {
  const nextItem = normalizeTrackedAnime({
    ...input,
    addedAt: new Date().toISOString(),
  })

  if (!nextItem) {
    return readStoredTrackedAnime()
  }

  const previousItems = readStoredTrackedAnime().filter(
    (item) => item.tmdbId !== nextItem.tmdbId
  )

  return saveStoredTrackedAnime([nextItem, ...previousItems])
}

export function removeTrackedAnimeByTmdbId(tmdbId: number) {
  const previousItems = readStoredTrackedAnime()
  const remainingItems = previousItems.filter((item) => item.tmdbId !== tmdbId)

  if (remainingItems.length === previousItems.length) {
    return previousItems
  }

  return saveStoredTrackedAnime(remainingItems)
}

export function updateTrackedAnimeMatch(tmdbId: number, media: AnilistMedia) {
  const previousItems = readStoredTrackedAnime()
  const existingItem = previousItems.find((item) => item.tmdbId === tmdbId)

  if (!existingItem) {
    return previousItems
  }

  const updatedItem = normalizeTrackedAnime({
    anilistId: media.id,
    tmdbId,
    title: media.title,
    coverImage: media.coverImage,
    addedAt: existingItem.addedAt,
  })

  if (!updatedItem) {
    return previousItems
  }

  return saveStoredTrackedAnime(
    previousItems.map((item) => (item.tmdbId === tmdbId ? updatedItem : item))
  )
}
