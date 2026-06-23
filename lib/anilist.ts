export type AnilistAiringEpisode = {
  episode: number
  airingAt: number
  timeUntilAiring: number
}

export type AnilistMedia = {
  id: number
  title: string
  coverImage: string | null
  format: string | null
  seasonYear: number | null
  episodes: number | null
  status: string | null
  nextAiringEpisode: AnilistAiringEpisode | null
}

type AnilistMediaResponse = {
  id: number
  title?: {
    english?: string | null
    romaji?: string | null
    native?: string | null
  } | null
  coverImage?: {
    large?: string | null
    medium?: string | null
  } | null
  format?: string | null
  seasonYear?: number | null
  episodes?: number | null
  status?: string | null
  nextAiringEpisode?: {
    episode?: number | null
    airingAt?: number | null
    timeUntilAiring?: number | null
  } | null
}

type AnilistPageResponse = {
  data?: {
    Page?: {
      media?: AnilistMediaResponse[] | null
    } | null
  } | null
  errors?: Array<{ message?: string }> | null
}

type AnilistGraphqlRequest = {
  query: string
  variables?: Record<string, unknown>
  signal?: AbortSignal
}

const MEDIA_FIELDS = `
  id
  title {
    english
    romaji
    native
  }
  coverImage {
    large
    medium
  }
  format
  seasonYear
  episodes
  status
  nextAiringEpisode {
    episode
    airingAt
    timeUntilAiring
  }
`

const SEARCH_ANIME_QUERY = `
  query ($search: String) {
    Page(perPage: 5) {
      media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
        ${MEDIA_FIELDS}
      }
    }
  }
`

const AIRING_QUERY = `
  query ($ids: [Int]) {
    Page(perPage: 50) {
      media(id_in: $ids, type: ANIME) {
        ${MEDIA_FIELDS}
      }
    }
  }
`

const WATCHING_QUERY = `
  query ($userName: String, $userId: Int) {
    MediaListCollection(
      userName: $userName
      userId: $userId
      type: ANIME
      status: CURRENT
    ) {
      lists {
        entries {
          progress
          updatedAt
          media {
            ${MEDIA_FIELDS}
          }
        }
      }
    }
  }
`

const PREFERRED_TV_FORMATS = new Set(["TV", "TV_SHORT", "ONA"])

export type AnilistWatchingEntry = {
  media: AnilistMedia
  progress: number
  updatedAt: number
}

type AnilistListResponse = {
  data?: {
    MediaListCollection?: {
      lists?: Array<{
        entries?: Array<{
          progress?: number | null
          updatedAt?: number | null
          media?: AnilistMediaResponse | null
        } | null> | null
      } | null> | null
    } | null
  } | null
  errors?: Array<{ message?: string }> | null
}

async function requestAnilist({
  query,
  variables,
  signal,
}: AnilistGraphqlRequest): Promise<AnilistMedia[]> {
  const response = await fetch("/api/anilist", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    signal,
  })

  if (!response.ok) {
    throw new Error(`AniList request failed with status ${response.status}`)
  }

  const payload = (await response.json()) as AnilistPageResponse

  if (payload.errors?.length) {
    throw new Error(
      payload.errors[0]?.message ?? "AniList returned an error response."
    )
  }

  return (payload.data?.Page?.media ?? []).map(normalizeAnilistMedia)
}

export async function searchAnilistAnime(
  title: string,
  signal?: AbortSignal
): Promise<AnilistMedia[]> {
  const trimmedTitle = title.trim()

  if (!trimmedTitle) {
    return []
  }

  return requestAnilist({
    query: SEARCH_ANIME_QUERY,
    variables: { search: trimmedTitle },
    signal,
  })
}

export async function fetchAnilistAiring(
  ids: number[],
  signal?: AbortSignal
): Promise<AnilistMedia[]> {
  const validIds = Array.from(
    new Set(ids.filter((id) => Number.isInteger(id) && id > 0))
  )

  if (validIds.length === 0) {
    return []
  }

  return requestAnilist({
    query: AIRING_QUERY,
    variables: { ids: validIds },
    signal,
  })
}

export function parseAnilistUser(input: string): {
  userName: string | null
  userId: number | null
} {
  const trimmed = input.trim()

  if (!trimmed) {
    return { userName: null, userId: null }
  }

  const urlMatch = trimmed.match(/anilist\.co\/user\/([^/?#]+)/i)

  if (urlMatch) {
    return { userName: decodeURIComponent(urlMatch[1]), userId: null }
  }

  if (/^\d+$/.test(trimmed)) {
    return { userName: null, userId: Number(trimmed) }
  }

  return { userName: trimmed, userId: null }
}

/**
 * Strips trailing season/part markers from an AniList title so it matches the
 * base show on TMDB (which groups cours under one entry). Conservative — no bare
 * numbers or roman numerals, to avoid false strips like "Mob Psycho 100".
 */
export function baseAnimeTitle(title: string): string {
  let result = title.trim()

  const patterns = [
    /\s*[:-]?\s*(?:the\s+)?final\s+season$/i,
    /\s*[:-]?\s*\d+(?:st|nd|rd|th)\s+season$/i,
    /\s*[:-]?\s*season\s+\d+$/i,
    /\s*[:-]?\s*part\s+\d+$/i,
    /\s*[:-]?\s*cour\s+\d+$/i,
  ]

  let changed = true
  while (changed) {
    changed = false
    for (const pattern of patterns) {
      const next = result.replace(pattern, "").trim()
      if (next && next !== result) {
        result = next
        changed = true
      }
    }
  }

  return result || title.trim()
}

export type AnilistFranchiseEntry = {
  id: number
  episodes: number | null
}

type AnilistRelationsResponse = {
  data?: {
    Media?: {
      id: number
      episodes?: number | null
      relations?: {
        edges?: Array<{
          relationType?: string | null
          node?: {
            id?: number | null
            episodes?: number | null
            format?: string | null
          } | null
        } | null> | null
      } | null
    } | null
  } | null
  errors?: Array<{ message?: string }> | null
}

const RELATIONS_QUERY = `
  query ($id: Int) {
    Media(id: $id) {
      id
      episodes
      relations {
        edges {
          relationType
          node {
            id
            episodes
            format
          }
        }
      }
    }
  }
`

const relationsCache = new Map<number, Promise<AnilistRelationsResponse>>()

function fetchRelations(
  id: number,
  signal?: AbortSignal
): Promise<AnilistRelationsResponse> {
  const cached = relationsCache.get(id)
  if (cached) {
    return cached
  }

  const promise = fetch("/api/anilist", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: RELATIONS_QUERY, variables: { id } }),
    signal,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`AniList request failed with status ${response.status}`)
      }
      return response.json() as Promise<AnilistRelationsResponse>
    })
    .catch((error: unknown) => {
      relationsCache.delete(id)
      throw error
    })

  relationsCache.set(id, promise)
  return promise
}

function findRelated(
  payload: AnilistRelationsResponse,
  relationType: "PREQUEL" | "SEQUEL",
  seen: Set<number>
): AnilistFranchiseEntry | null {
  for (const edge of payload.data?.Media?.relations?.edges ?? []) {
    const node = edge?.node
    if (
      edge?.relationType === relationType &&
      node &&
      typeof node.id === "number" &&
      !seen.has(node.id) &&
      node.format !== null &&
      node.format !== undefined &&
      PREFERRED_TV_FORMATS.has(node.format)
    ) {
      return {
        id: node.id,
        episodes: typeof node.episodes === "number" ? node.episodes : null,
      }
    }
  }
  return null
}

/**
 * Walks the AniList prequel/sequel chain from a starting media id and returns
 * the franchise's TV entries ordered oldest -> newest. Used to map AniList's
 * per-cour progress onto TMDB's grouped seasons via absolute numbering.
 */
export async function fetchAnilistFranchise(
  anilistId: number,
  signal?: AbortSignal
): Promise<AnilistFranchiseEntry[]> {
  const seen = new Set<number>([anilistId])
  const startPayload = await fetchRelations(anilistId, signal)
  const startEpisodes = startPayload.data?.Media?.episodes
  const start: AnilistFranchiseEntry = {
    id: anilistId,
    episodes: typeof startEpisodes === "number" ? startEpisodes : null,
  }

  const before: AnilistFranchiseEntry[] = []
  let cursor = startPayload
  for (let hop = 0; hop < 12; hop += 1) {
    const prequel = findRelated(cursor, "PREQUEL", seen)
    if (!prequel) break
    seen.add(prequel.id)
    before.push(prequel)
    cursor = await fetchRelations(prequel.id, signal)
  }

  const after: AnilistFranchiseEntry[] = []
  cursor = startPayload
  for (let hop = 0; hop < 12; hop += 1) {
    const sequel = findRelated(cursor, "SEQUEL", seen)
    if (!sequel) break
    seen.add(sequel.id)
    after.push(sequel)
    cursor = await fetchRelations(sequel.id, signal)
  }

  return [...before.reverse(), start, ...after]
}

const PROGRESS_QUERY = `
  query ($userName: String, $userId: Int) {
    MediaListCollection(userName: $userName, userId: $userId, type: ANIME) {
      lists {
        entries {
          progress
          media {
            id
          }
        }
      }
    }
  }
`

/**
 * Fetches the configured user's whole anime list and returns a map of
 * AniList media id -> episodes watched. Used as the watched-status source of
 * truth for tracked anime. Returns an empty map for an unset/private profile.
 */
export async function fetchAnilistProgressMap(
  user: string,
  signal?: AbortSignal
): Promise<Map<number, number>> {
  const { userName, userId } = parseAnilistUser(user)

  if (!userName && userId === null) {
    return new Map()
  }

  const response = await fetch("/api/anilist", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: PROGRESS_QUERY,
      variables: { userName, userId },
    }),
    signal,
  })

  if (!response.ok) {
    throw new Error(`AniList request failed with status ${response.status}`)
  }

  const payload = (await response.json()) as AnilistListResponse

  if (payload.errors?.length) {
    return new Map()
  }

  const map = new Map<number, number>()

  for (const list of payload.data?.MediaListCollection?.lists ?? []) {
    for (const entry of list?.entries ?? []) {
      const id = entry?.media?.id

      if (typeof id === "number") {
        map.set(id, typeof entry?.progress === "number" ? entry.progress : 0)
      }
    }
  }

  return map
}

export async function fetchAnilistWatching(
  user: string,
  signal?: AbortSignal
): Promise<AnilistWatchingEntry[]> {
  const { userName, userId } = parseAnilistUser(user)

  if (!userName && userId === null) {
    return []
  }

  const response = await fetch("/api/anilist", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: WATCHING_QUERY,
      variables: { userName, userId },
    }),
    signal,
  })

  if (!response.ok) {
    throw new Error(`AniList request failed with status ${response.status}`)
  }

  const payload = (await response.json()) as AnilistListResponse

  if (payload.errors?.length) {
    throw new Error(
      payload.errors[0]?.message ?? "AniList returned an error response."
    )
  }

  const entries =
    payload.data?.MediaListCollection?.lists?.flatMap(
      (list) => list?.entries ?? []
    ) ?? []

  return entries
    .flatMap((entry) => {
      if (!entry?.media) {
        return []
      }

      return [
        {
          media: normalizeAnilistMedia(entry.media),
          progress: typeof entry.progress === "number" ? entry.progress : 0,
          updatedAt: typeof entry.updatedAt === "number" ? entry.updatedAt : 0,
        },
      ]
    })
    .sort((left, right) => right.updatedAt - left.updatedAt)
}

export function pickBestAnilistMatch(
  results: AnilistMedia[],
  year?: string | null
): AnilistMedia | null {
  if (results.length === 0) {
    return null
  }

  const targetYear = year ? Number(year) : null

  if (targetYear) {
    const yearAndTvMatch = results.find(
      (media) =>
        media.seasonYear === targetYear &&
        media.format !== null &&
        PREFERRED_TV_FORMATS.has(media.format)
    )

    if (yearAndTvMatch) {
      return yearAndTvMatch
    }

    const yearMatch = results.find((media) => media.seasonYear === targetYear)

    if (yearMatch) {
      return yearMatch
    }
  }

  const tvMatch = results.find(
    (media) => media.format !== null && PREFERRED_TV_FORMATS.has(media.format)
  )

  return tvMatch ?? results[0]
}

export function formatCountdown(secondsUntil: number): string {
  const totalSeconds = Math.max(0, Math.floor(secondsUntil))
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  if (minutes > 0) {
    return `${minutes}m`
  }

  return "Airing now"
}

function normalizeAnilistMedia(media: AnilistMediaResponse): AnilistMedia {
  const title =
    media.title?.english?.trim() ||
    media.title?.romaji?.trim() ||
    media.title?.native?.trim() ||
    `Anime ${media.id}`

  return {
    id: media.id,
    title,
    coverImage: media.coverImage?.large ?? media.coverImage?.medium ?? null,
    format: media.format ?? null,
    seasonYear:
      typeof media.seasonYear === "number" ? media.seasonYear : null,
    episodes: typeof media.episodes === "number" ? media.episodes : null,
    status: media.status ?? null,
    nextAiringEpisode: normalizeNextAiringEpisode(media.nextAiringEpisode),
  }
}

function normalizeNextAiringEpisode(
  episode: AnilistMediaResponse["nextAiringEpisode"]
): AnilistAiringEpisode | null {
  if (
    !episode ||
    typeof episode.episode !== "number" ||
    typeof episode.airingAt !== "number"
  ) {
    return null
  }

  return {
    episode: episode.episode,
    airingAt: episode.airingAt,
    timeUntilAiring:
      typeof episode.timeUntilAiring === "number"
        ? episode.timeUntilAiring
        : 0,
  }
}
