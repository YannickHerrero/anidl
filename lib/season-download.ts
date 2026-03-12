import { type TorrentioSource } from "@/lib/torrentio"
import { type TvEpisodeDetail } from "@/lib/tmdb"

export type EpisodeSourceSet = {
  episode: TvEpisodeDetail
  candidates: TorrentioSource[]
}

export type SourceFamily = {
  key: string
  label: string
  coverageCount: number
  averageScore: number
  providerCount: number
}

export type EpisodeSourceWarnings = {
  titleMismatch: boolean
  providerMismatch: boolean
  sizeOutlier: boolean
  codecMismatch: boolean
}

type FamilyStats = {
  label: string
  totalScore: number
  episodeNumbers: Set<number>
  providers: Set<string>
}

export function rankSourceFamilies(
  episodes: EpisodeSourceSet[]
): SourceFamily[] {
  const familyStats = new Map<string, FamilyStats>()

  for (const { episode, candidates } of episodes) {
    const seenFamilyKeys = new Set<string>()

    for (const candidate of candidates) {
      const familyKey = getSourceFamilyKey(candidate.title)

      if (seenFamilyKeys.has(familyKey)) {
        continue
      }

      seenFamilyKeys.add(familyKey)

      const existingStats = familyStats.get(familyKey)

      if (existingStats) {
        existingStats.totalScore += candidate.score
        existingStats.episodeNumbers.add(episode.episodeNumber)
        existingStats.providers.add(candidate.provider)
        continue
      }

      familyStats.set(familyKey, {
        label: getSourceFamilyLabel(candidate.title),
        totalScore: candidate.score,
        episodeNumbers: new Set([episode.episodeNumber]),
        providers: new Set([candidate.provider]),
      })
    }
  }

  return Array.from(familyStats.entries())
    .map(([key, stats]) => ({
      key,
      label: stats.label,
      coverageCount: stats.episodeNumbers.size,
      averageScore: stats.totalScore / stats.episodeNumbers.size,
      providerCount: stats.providers.size,
    }))
    .sort((left, right) => {
      if (right.coverageCount !== left.coverageCount) {
        return right.coverageCount - left.coverageCount
      }

      if (right.averageScore !== left.averageScore) {
        return right.averageScore - left.averageScore
      }

      return left.providerCount - right.providerCount
    })
}

export function selectBestFamilyCandidate(
  familyKey: string,
  candidates: TorrentioSource[]
) {
  const familyCandidates = candidates.filter(
    (candidate) => getSourceFamilyKey(candidate.title) === familyKey
  )

  if (familyCandidates.length === 0) {
    return null
  }

  return [...familyCandidates].sort(
    (left, right) => right.score - left.score
  )[0]
}

export function buildFamilyBaseline(candidates: Array<TorrentioSource | null>) {
  const selectedCandidates = candidates.filter(
    (candidate): candidate is TorrentioSource => candidate !== null
  )

  const sizes = selectedCandidates
    .map((candidate) => candidate.sizeBytes)
    .filter((size) => size < Number.MAX_SAFE_INTEGER)
    .sort((left, right) => left - right)

  return {
    provider: getMostCommonValue(
      selectedCandidates.map((candidate) => candidate.provider)
    ),
    codec: getMostCommonValue(
      selectedCandidates.map(
        (candidate) => `${candidate.videoCodec ?? ""}|${candidate.audio ?? ""}`
      )
    ),
    medianSizeBytes:
      sizes.length > 0 ? sizes[Math.floor(sizes.length / 2)] : null,
  }
}

export function getEpisodeSourceWarnings({
  candidate,
  selectedFamilyKey,
  baseline,
}: {
  candidate: TorrentioSource | null
  selectedFamilyKey: string
  baseline: ReturnType<typeof buildFamilyBaseline>
}): EpisodeSourceWarnings {
  if (!candidate) {
    return {
      titleMismatch: true,
      providerMismatch: false,
      sizeOutlier: false,
      codecMismatch: false,
    }
  }

  const codec = `${candidate.videoCodec ?? ""}|${candidate.audio ?? ""}`

  return {
    titleMismatch: getSourceFamilyKey(candidate.title) !== selectedFamilyKey,
    providerMismatch:
      baseline.provider !== null && candidate.provider !== baseline.provider,
    sizeOutlier:
      baseline.medianSizeBytes !== null &&
      candidate.sizeBytes < Number.MAX_SAFE_INTEGER &&
      Math.abs(candidate.sizeBytes - baseline.medianSizeBytes) /
        baseline.medianSizeBytes >
        0.35,
    codecMismatch: baseline.codec !== null && codec !== baseline.codec,
  }
}

export function getSourceFamilyKey(title: string) {
  const beforeEpisodeMarker = extractFamilyStem(title)

  return beforeEpisodeMarker
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^\)]*\)/g, " ")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase()
}

export function getSourceFamilyLabel(title: string) {
  const beforeEpisodeMarker = extractFamilyStem(title)

  return beforeEpisodeMarker
    .replace(/[_-]{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function extractFamilyStem(title: string) {
  const withoutExtension = title.replace(/\.[a-z0-9]{2,4}$/i, "")
  const patterns = [
    /^(.*?)(?:s\d{1,2}[\s._-]*e\d{1,3})\b/i,
    /^(.*?)(?:\be\d{1,3}\b)/i,
    /^(.*?)(?:[_ .-]{1,4}\d{1,3}(?=[_ .-]*[\[(]))/i,
  ]

  for (const pattern of patterns) {
    const match = withoutExtension.match(pattern)

    if (match?.[1]?.trim()) {
      return match[1].trim()
    }
  }

  return withoutExtension
}

function getMostCommonValue(values: string[]) {
  const counts = new Map<string, number>()

  for (const value of values) {
    if (!value) {
      continue
    }

    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  let bestValue: string | null = null
  let bestCount = 0

  for (const [value, count] of counts.entries()) {
    if (count > bestCount) {
      bestValue = value
      bestCount = count
    }
  }

  return bestValue
}
