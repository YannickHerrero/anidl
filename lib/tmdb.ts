export type SearchMediaType = "movie" | "tv"

type TmdbMultiSearchResult = {
  id: number
  media_type: string
  title?: string
  name?: string
  overview?: string
  poster_path?: string | null
  backdrop_path?: string | null
  release_date?: string
  first_air_date?: string
  vote_average?: number
  vote_count?: number
}

type TmdbMultiSearchResponse = {
  page: number
  total_pages: number
  total_results: number
  results: TmdbMultiSearchResult[]
}

export type SearchMediaItem = {
  id: number
  mediaType: SearchMediaType
  title: string
  overview: string
  posterPath: string | null
  backdropPath: string | null
  releaseDate: string | null
  year: string | null
  voteAverage: number | null
  voteCount: number
}

export type SearchMediaResponse = {
  page: number
  totalPages: number
  totalResults: number
  items: SearchMediaItem[]
}

type SearchTmdbMediaOptions = {
  apiKey: string
  query: string
  page?: number
  includeAdult?: boolean
  signal?: AbortSignal
}

const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p"

export function getTmdbImageUrl(path: string | null, size = "w342") {
  if (!path) {
    return null
  }

  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`
}

export async function searchTmdbMedia({
  apiKey,
  query,
  page = 1,
  includeAdult = true,
  signal,
}: SearchTmdbMediaOptions): Promise<SearchMediaResponse> {
  const trimmedQuery = query.trim()

  if (!trimmedQuery) {
    return {
      page: 1,
      totalPages: 0,
      totalResults: 0,
      items: [],
    }
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    query: trimmedQuery,
    page: String(page),
    include_adult: String(includeAdult),
  })

  const response = await fetch(`${TMDB_BASE_URL}/search/multi?${params}`, {
    signal,
  })

  if (!response.ok) {
    throw new Error(`TMDB search failed with status ${response.status}`)
  }

  const payload = (await response.json()) as TmdbMultiSearchResponse

  return {
    page: payload.page,
    totalPages: payload.total_pages,
    totalResults: payload.total_results,
    items: payload.results.flatMap(normalizeSearchMediaItem),
  }
}

function normalizeSearchMediaItem(
  item: TmdbMultiSearchResult
): SearchMediaItem[] {
  if (item.media_type !== "movie" && item.media_type !== "tv") {
    return []
  }

  const title = (item.media_type === "movie" ? item.title : item.name)?.trim()

  if (!title) {
    return []
  }

  const releaseDate =
    item.media_type === "movie" ? item.release_date : item.first_air_date

  return [
    {
      id: item.id,
      mediaType: item.media_type,
      title,
      overview: item.overview?.trim() ?? "",
      posterPath: item.poster_path ?? null,
      backdropPath: item.backdrop_path ?? null,
      releaseDate: releaseDate?.trim() || null,
      year: releaseDate?.slice(0, 4) || null,
      voteAverage:
        typeof item.vote_average === "number" ? item.vote_average : null,
      voteCount: typeof item.vote_count === "number" ? item.vote_count : 0,
    },
  ]
}
