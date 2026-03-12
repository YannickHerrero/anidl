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
}

export async function fetchTorrentioMovieSources({
  imdbId,
  realDebridApiKey,
  signal,
}: FetchMovieSourcesOptions) {
  return fetchTorrentioSources({
    path: `movie/${imdbId}`,
    realDebridApiKey,
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
    signal,
  })
}

export function getSourceLabel(mediaType: SearchMediaType) {
  return mediaType === "movie" ? "Movie sources" : "Episode sources"
}

async function fetchTorrentioSources({
  path,
  realDebridApiKey,
  signal,
}: {
  path: string
  realDebridApiKey: string
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

  return payload.streams.map(normalizeTorrentioSource)
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
  index: number
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

  return {
    id: `${provider}-${source.infoHash ?? source.url ?? index}`,
    provider,
    title: normalizedTitle,
    quality: qualityMatch?.[1]?.toUpperCase() ?? null,
    size: sizeMatch?.[1] ?? null,
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
  }
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
