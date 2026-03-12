import { type SearchMediaType } from "@/lib/tmdb"

const TORRENTIO_BASE_URL = "https://torrentio.strem.fun"

const DEFAULT_TORRENTIO_PROVIDERS = [
  "yts",
  "eztv",
  "rarbg",
  "1337x",
  "thepiratebay",
  "kickasstorrents",
  "torrentgalaxy",
  "nyaasi",
] as const

type TorrentioStreamResponse = {
  name: string
  title: string
  url?: string
  infoHash?: string
  fileIdx?: number
}

type TorrentioResponse = {
  streams: TorrentioStreamResponse[]
}

type FetchMovieSourcesOptions = {
  imdbId: string
  realDebridApiKey: string
  signal?: AbortSignal
}

type FetchEpisodeSourcesOptions = {
  imdbId: string
  seasonNumber: number
  episodeNumber: number
  realDebridApiKey: string
  signal?: AbortSignal
}

export type SourceTransport = "direct" | "torrent"

export type TorrentioSource = {
  id: string
  provider: string
  title: string
  quality: string | null
  size: string | null
  sizeBytes: number
  seeders: number | null
  videoCodec: string | null
  audio: string | null
  hdr: string | null
  sourceType: string | null
  languages: string[]
  isCached: boolean
  transport: SourceTransport
  url: string | null
  infoHash: string | null
  fileIdx: number | null
  score: number
  isRecommended: boolean
}

export async function fetchTorrentioMovieSources({
  imdbId,
  realDebridApiKey,
  signal,
}: FetchMovieSourcesOptions) {
  return fetchTorrentioSources({
    path: `movie/${imdbId}`,
    realDebridApiKey,
    mediaType: "movie",
    signal,
  })
}

export async function fetchTorrentioEpisodeSources({
  imdbId,
  seasonNumber,
  episodeNumber,
  realDebridApiKey,
  signal,
}: FetchEpisodeSourcesOptions) {
  return fetchTorrentioSources({
    path: `series/${imdbId}:${seasonNumber}:${episodeNumber}`,
    realDebridApiKey,
    mediaType: "tv",
    signal,
  })
}

export function getSourceLabel(mediaType: SearchMediaType) {
  return mediaType === "movie" ? "Movie sources" : "Episode sources"
}

async function fetchTorrentioSources({
  path,
  realDebridApiKey,
  mediaType,
  signal,
}: {
  path: string
  realDebridApiKey: string
  mediaType: SearchMediaType
  signal?: AbortSignal
}) {
  const config = buildTorrentioConfig(realDebridApiKey)
  const response = await fetch(
    `${TORRENTIO_BASE_URL}/${config}/stream/${path}.json`,
    {
      signal,
    }
  )

  if (!response.ok) {
    throw new Error(`Torrentio request failed with status ${response.status}`)
  }

  const payload = (await response.json()) as TorrentioResponse

  return sortAndRecommendSources(
    payload.streams.map((source, index) =>
      normalizeTorrentioSource(source, index, mediaType)
    )
  )
}

function buildTorrentioConfig(realDebridApiKey: string) {
  const configParts = [
    `providers=${DEFAULT_TORRENTIO_PROVIDERS.join(",")}`,
    "sort=qualitysize",
    "qualityfilter=scr,cam",
    "debridoptions=nodownloadlinks",
    `realdebrid=${realDebridApiKey}`,
  ]

  return configParts.join("|")
}

function normalizeTorrentioSource(
  source: TorrentioStreamResponse,
  index: number,
  mediaType: SearchMediaType
): TorrentioSource {
  const sizeMatch = source.title.match(/💾\s*([\d.]+\s*(?:GB|MB|TB))/i)
  const seedersMatch = source.title.match(/👤\s*(\d+)/)
  const qualityMatch = source.title.match(
    /\b(2160p|4K|1080p|720p|480p|360p)\b/i
  )
  const hdrMatch = source.title.match(
    /\b(HDR10\+|HDR10|DoVi|DV|Dolby[\s.]?Vision|HDR)\b/i
  )
  const codecMatch = source.title.match(
    /\b(HEVC|x265|x264|AVC|AV1|H\.?265|H\.?264|VC-1|10bit|10-bit)\b/i
  )
  const audioMatch = source.title.match(
    /(DTS-HD[\s.]?MA|TrueHD|Atmos|DTS|AAC|FLAC|EAC3|E-AC-3|AC3|DD\+|DD|LPCM)(?:[\s.]?\d\.\d)?/i
  )
  const sourceTypeMatch = source.title.match(
    /\b(UHD[\s.]?BluRay|BluRay|Blu-Ray|BDRip|BRRip|WEB-DL|WEBDL|WEBRip|REMUX|HDTV|DVDRip)\b/i
  )
  const languageMatches = Array.from(
    source.title.matchAll(
      /(🇬🇧|🇺🇸|🇩🇪|🇫🇷|🇮🇹|🇪🇸|🇯🇵|🇰🇷|🇨🇳|🇧🇷|🇵🇹|🇷🇺|🇳🇱|🇵🇱|🇸🇪|🇳🇴|🇩🇰|🇫🇮|🇬🇷|🇹🇷|🇮🇳|🇹🇭|🇻🇳|🇮🇩|🇲🇽|🇦🇷)/g
    )
  )

  const provider = source.name.trim() || "torrentio"
  const normalizedTitle = source.title.replace(/\n+/g, " ").trim()
  const sizeBytes = parseSizeBytes(sizeMatch?.[1] ?? null)
  const quality = qualityMatch?.[1]?.toUpperCase() ?? null

  return {
    id: `${provider}-${source.infoHash ?? source.url ?? index}`,
    provider,
    title: normalizedTitle,
    quality,
    size: sizeMatch?.[1] ?? null,
    sizeBytes,
    seeders: seedersMatch ? Number(seedersMatch[1]) : null,
    videoCodec: codecMatch?.[1] ?? null,
    audio: audioMatch?.[0] ?? null,
    hdr: hdrMatch?.[1] ?? null,
    sourceType: sourceTypeMatch?.[1] ?? null,
    languages: languageMatches
      .map((match) => flagToLanguage(match[0]))
      .filter((language, index, items) => items.indexOf(language) === index),
    isCached: source.title.includes("[RD+") || source.title.includes("[⚡]"),
    transport: source.url ? "direct" : "torrent",
    url: source.url ?? null,
    infoHash: source.infoHash ?? null,
    fileIdx: typeof source.fileIdx === "number" ? source.fileIdx : null,
    score: calculateSourceScore({
      title: normalizedTitle,
      quality,
      sizeBytes,
      seeders: seedersMatch ? Number(seedersMatch[1]) : null,
      isCached: source.title.includes("[RD+") || source.title.includes("[⚡]"),
      languageCount: languageMatches.length,
      mediaType,
    }),
    isRecommended: false,
  }
}

function sortAndRecommendSources(sources: TorrentioSource[]) {
  const sortedSources = [...sources].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score
    }

    const qualityRankDelta =
      getQualityRank(right.quality) - getQualityRank(left.quality)

    if (qualityRankDelta !== 0) {
      return qualityRankDelta
    }

    return left.sizeBytes - right.sizeBytes
  })

  return sortedSources.map((source, index) => ({
    ...source,
    isRecommended: index < 3 && source.score > 0,
  }))
}

function calculateSourceScore({
  title,
  quality,
  sizeBytes,
  seeders,
  isCached,
  languageCount,
  mediaType,
}: {
  title: string
  quality: string | null
  sizeBytes: number
  seeders: number | null
  isCached: boolean
  languageCount: number
  mediaType: SearchMediaType
}) {
  if (isLikelyTrailer({ title, quality, sizeBytes, mediaType })) {
    return -10000
  }

  let score = 0

  if (quality?.includes("1080P")) {
    score += 1000
  } else if (quality?.includes("720P")) {
    score += 800
  } else if (quality?.includes("2160P") || quality?.includes("4K")) {
    score += 600
  } else {
    score += 400
  }

  if (isCached) {
    score += 1000
  }

  score += languageCount * 30

  if (seeders && seeders > 0) {
    score += Math.log2(seeders + 1) * 50
  }

  if (sizeBytes < Number.MAX_SAFE_INTEGER) {
    const sizeGb = sizeBytes / (1024 * 1024 * 1024)
    score -= Math.pow(sizeGb, 1.5) * 80
  }

  return score
}

function isLikelyTrailer({
  title,
  quality,
  sizeBytes,
  mediaType,
}: {
  title: string
  quality: string | null
  sizeBytes: number
  mediaType: SearchMediaType
}) {
  if (
    /\b(trailer|promo|sample|preview|clip|extra|bonus|teaser|opening|ending|op|ed)\b/i.test(
      title
    )
  ) {
    return true
  }

  if (sizeBytes === Number.MAX_SAFE_INTEGER) {
    return false
  }

  const sizeMb = sizeBytes / (1024 * 1024)
  const normalizedQuality = quality?.toLowerCase() ?? ""

  if (mediaType === "tv") {
    if (
      normalizedQuality.includes("2160p") ||
      normalizedQuality.includes("4k")
    ) {
      return sizeMb < 400
    }

    if (normalizedQuality.includes("1080p")) {
      return sizeMb < 150
    }

    if (normalizedQuality.includes("720p")) {
      return sizeMb < 80
    }

    return sizeMb < 30
  }

  if (normalizedQuality.includes("2160p") || normalizedQuality.includes("4k")) {
    return sizeMb < 2000
  }

  if (normalizedQuality.includes("1080p")) {
    return sizeMb < 800
  }

  if (normalizedQuality.includes("720p")) {
    return sizeMb < 400
  }

  return sizeMb < 150
}

function getQualityRank(quality: string | null) {
  if (!quality) {
    return 0
  }

  if (quality.includes("2160P") || quality.includes("4K")) {
    return 4
  }

  if (quality.includes("1080P")) {
    return 3
  }

  if (quality.includes("720P")) {
    return 2
  }

  if (quality.includes("480P")) {
    return 1
  }

  return 0
}

function parseSizeBytes(size: string | null) {
  if (!size) {
    return Number.MAX_SAFE_INTEGER
  }

  const match = size.match(/^([\d.]+)\s*(GB|MB|TB)$/i)

  if (!match) {
    return Number.MAX_SAFE_INTEGER
  }

  const value = Number(match[1])

  if (!Number.isFinite(value)) {
    return Number.MAX_SAFE_INTEGER
  }

  const unit = match[2].toUpperCase()

  if (unit === "TB") {
    return value * 1024 * 1024 * 1024 * 1024
  }

  if (unit === "GB") {
    return value * 1024 * 1024 * 1024
  }

  return value * 1024 * 1024
}

function flagToLanguage(flag: string) {
  switch (flag) {
    case "🇬🇧":
    case "🇺🇸":
      return "English"
    case "🇩🇪":
      return "German"
    case "🇫🇷":
      return "French"
    case "🇮🇹":
      return "Italian"
    case "🇪🇸":
    case "🇲🇽":
    case "🇦🇷":
      return "Spanish"
    case "🇯🇵":
      return "Japanese"
    case "🇰🇷":
      return "Korean"
    case "🇨🇳":
      return "Chinese"
    case "🇧🇷":
    case "🇵🇹":
      return "Portuguese"
    case "🇷🇺":
      return "Russian"
    case "🇳🇱":
      return "Dutch"
    case "🇵🇱":
      return "Polish"
    case "🇸🇪":
      return "Swedish"
    case "🇳🇴":
      return "Norwegian"
    case "🇩🇰":
      return "Danish"
    case "🇫🇮":
      return "Finnish"
    case "🇬🇷":
      return "Greek"
    case "🇹🇷":
      return "Turkish"
    case "🇮🇳":
      return "Hindi"
    case "🇹🇭":
      return "Thai"
    case "🇻🇳":
      return "Vietnamese"
    case "🇮🇩":
      return "Indonesian"
    default:
      return "Unknown"
  }
}
