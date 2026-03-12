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

type TmdbGenre = {
  id: number
  name: string
}

type TmdbProductionCompany = {
  id: number
  name: string
}

type TmdbDetailBase = {
  id: number
  overview?: string
  poster_path?: string | null
  backdrop_path?: string | null
  genres?: TmdbGenre[]
  vote_average?: number
  vote_count?: number
  status?: string
  tagline?: string | null
  production_companies?: TmdbProductionCompany[]
}

type TmdbMovieDetailResponse = TmdbDetailBase & {
  title?: string
  original_title?: string
  release_date?: string
  runtime?: number | null
}

type TmdbTvDetailResponse = TmdbDetailBase & {
  name?: string
  original_name?: string
  first_air_date?: string
  episode_run_time?: number[]
  number_of_seasons?: number
  number_of_episodes?: number
  created_by?: Array<{
    id: number
    name: string
  }>
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

export type MediaDetail = {
  id: number
  mediaType: SearchMediaType
  title: string
  originalTitle: string | null
  overview: string
  posterPath: string | null
  backdropPath: string | null
  releaseDate: string | null
  year: string | null
  voteAverage: number | null
  voteCount: number
  runtime: number | null
  genres: string[]
  status: string | null
  tagline: string | null
  productionCompanies: string[]
  seasonCount: number | null
  episodeCount: number | null
  creators: string[]
}

type SearchTmdbMediaOptions = {
  apiKey: string
  query: string
  page?: number
  includeAdult?: boolean
  signal?: AbortSignal
}

type FetchTmdbMediaDetailOptions = {
  apiKey: string
  mediaType: SearchMediaType
  tmdbId: number
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

export async function fetchTmdbMediaDetail({
  apiKey,
  mediaType,
  tmdbId,
  signal,
}: FetchTmdbMediaDetailOptions): Promise<MediaDetail> {
  const params = new URLSearchParams({
    api_key: apiKey,
  })

  const response = await fetch(
    `${TMDB_BASE_URL}/${mediaType}/${tmdbId}?${params}`,
    {
      signal,
    }
  )

  if (!response.ok) {
    throw new Error(`TMDB detail failed with status ${response.status}`)
  }

  if (mediaType === "movie") {
    const payload = (await response.json()) as TmdbMovieDetailResponse
    return normalizeMovieDetail(payload)
  }

  const payload = (await response.json()) as TmdbTvDetailResponse
  return normalizeTvDetail(payload)
}

export function mediaDetailToSearchItem(detail: MediaDetail): SearchMediaItem {
  return {
    id: detail.id,
    mediaType: detail.mediaType,
    title: detail.title,
    overview: detail.overview,
    posterPath: detail.posterPath,
    backdropPath: detail.backdropPath,
    releaseDate: detail.releaseDate,
    year: detail.year,
    voteAverage: detail.voteAverage,
    voteCount: detail.voteCount,
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

function normalizeMovieDetail(payload: TmdbMovieDetailResponse): MediaDetail {
  const releaseDate = payload.release_date?.trim() || null

  return {
    id: payload.id,
    mediaType: "movie",
    title: payload.title?.trim() || `Movie ${payload.id}`,
    originalTitle: normalizeOptionalText(payload.original_title),
    overview: payload.overview?.trim() ?? "",
    posterPath: payload.poster_path ?? null,
    backdropPath: payload.backdrop_path ?? null,
    releaseDate,
    year: releaseDate?.slice(0, 4) || null,
    voteAverage:
      typeof payload.vote_average === "number" ? payload.vote_average : null,
    voteCount: typeof payload.vote_count === "number" ? payload.vote_count : 0,
    runtime: typeof payload.runtime === "number" ? payload.runtime : null,
    genres: normalizeGenres(payload.genres),
    status: normalizeOptionalText(payload.status),
    tagline: normalizeOptionalText(payload.tagline),
    productionCompanies: normalizeProductionCompanies(
      payload.production_companies
    ),
    seasonCount: null,
    episodeCount: null,
    creators: [],
  }
}

function normalizeTvDetail(payload: TmdbTvDetailResponse): MediaDetail {
  const releaseDate = payload.first_air_date?.trim() || null
  const runtime = payload.episode_run_time?.find(
    (value) => typeof value === "number" && value > 0
  )

  return {
    id: payload.id,
    mediaType: "tv",
    title: payload.name?.trim() || `TV ${payload.id}`,
    originalTitle: normalizeOptionalText(payload.original_name),
    overview: payload.overview?.trim() ?? "",
    posterPath: payload.poster_path ?? null,
    backdropPath: payload.backdrop_path ?? null,
    releaseDate,
    year: releaseDate?.slice(0, 4) || null,
    voteAverage:
      typeof payload.vote_average === "number" ? payload.vote_average : null,
    voteCount: typeof payload.vote_count === "number" ? payload.vote_count : 0,
    runtime: runtime ?? null,
    genres: normalizeGenres(payload.genres),
    status: normalizeOptionalText(payload.status),
    tagline: normalizeOptionalText(payload.tagline),
    productionCompanies: normalizeProductionCompanies(
      payload.production_companies
    ),
    seasonCount:
      typeof payload.number_of_seasons === "number"
        ? payload.number_of_seasons
        : null,
    episodeCount:
      typeof payload.number_of_episodes === "number"
        ? payload.number_of_episodes
        : null,
    creators:
      payload.created_by
        ?.map((creator) => creator.name.trim())
        .filter((name) => name.length > 0) ?? [],
  }
}

function normalizeGenres(genres: TmdbGenre[] | undefined) {
  return (
    genres
      ?.map((genre) => genre.name.trim())
      .filter((name) => name.length > 0) ?? []
  )
}

function normalizeProductionCompanies(
  companies: TmdbProductionCompany[] | undefined
) {
  return (
    companies
      ?.map((company) => company.name.trim())
      .filter((name) => name.length > 0) ?? []
  )
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalizedValue = value?.trim()

  return normalizedValue ? normalizedValue : null
}
