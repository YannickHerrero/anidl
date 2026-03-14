"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { useAppConfig } from "@/hooks/use-app-config"
import { useWatchProgress } from "@/hooks/use-watch-progress"
import { validateRealDebridApiKey } from "@/lib/real-debrid"
import {
  buildFamilyBaseline,
  getEpisodeSourceWarnings,
  rankSourceFamilies,
  selectBestFamilyCandidate,
  type EpisodeSourceSet,
} from "@/lib/season-download"
import {
  fetchTmdbExternalIds,
  fetchTmdbMediaDetail,
  fetchTmdbTvSeasonDetail,
  type MediaDetail,
  type TvSeasonDetail,
} from "@/lib/tmdb"
import { fetchTorrentioEpisodeSources } from "@/lib/torrentio"
import {
  getWatchedSeasonEpisodeCount,
  isEpisodeWatched,
} from "@/lib/watch-progress"

type SeasonDownloadReviewProps = Readonly<{
  tmdbId: number
  seasonNumber: number
}>

type ReviewState = {
  status: "loading" | "success" | "error"
  message: string | null
  detail: MediaDetail | null
  season: TvSeasonDetail | null
  episodeSourceSets: EpisodeSourceSet[]
}

export function SeasonDownloadReview({
  tmdbId,
  seasonNumber,
}: SeasonDownloadReviewProps) {
  const { config } = useAppConfig()
  const { getItem, markEpisodeWatched, markEpisodesWatched } =
    useWatchProgress()
  const [reviewState, setReviewState] = useState<ReviewState>({
    status: "loading",
    message: null,
    detail: null,
    season: null,
    episodeSourceSets: [],
  })
  const [selectedFamilyKey, setSelectedFamilyKey] = useState<string | null>(
    null
  )
  const [selectedEpisodes, setSelectedEpisodes] = useState<
    Record<number, boolean>
  >({})
  const [selectedSourceIds, setSelectedSourceIds] = useState<
    Record<number, string>
  >({})
  const [markUntilStatus, setMarkUntilStatus] = useState<
    "idle" | "loading" | "error"
  >("idle")
  const watchProgress = getItem("tv", tmdbId)

  useEffect(() => {
    const abortController = new AbortController()

    void validateRealDebridApiKey({
      apiKey: config.realDebridApiKey,
      signal: abortController.signal,
    })
      .then(() =>
        Promise.all([
          fetchTmdbMediaDetail({
            apiKey: config.tmdbApiKey,
            mediaType: "tv",
            tmdbId,
            signal: abortController.signal,
          }),
          fetchTmdbTvSeasonDetail({
            apiKey: config.tmdbApiKey,
            tmdbId,
            seasonNumber,
            signal: abortController.signal,
          }),
          fetchTmdbExternalIds({
            apiKey: config.tmdbApiKey,
            mediaType: "tv",
            tmdbId,
            signal: abortController.signal,
          }),
        ])
      )
      .then(async ([detail, season, externalIds]) => {
        if (!externalIds.imdbId) {
          throw new Error("IMDb ID not found")
        }

        const episodeSourceSets = await Promise.all(
          season.episodes.map(async (episode) => ({
            episode,
            candidates: (
              await fetchTorrentioEpisodeSources({
                imdbId: externalIds.imdbId!,
                seasonNumber,
                episodeNumber: episode.episodeNumber,
                realDebridApiKey: config.realDebridApiKey,
                signal: abortController.signal,
              })
            ).slice(0, 5),
          }))
        )

        if (abortController.signal.aborted) {
          return
        }

        const nextFamilies = rankSourceFamilies(episodeSourceSets)
        const nextFamilyKey = nextFamilies[0]?.key ?? null
        const nextSelectedSourceIds = Object.fromEntries(
          episodeSourceSets.flatMap(({ episode, candidates }) => {
            const candidate = nextFamilyKey
              ? selectBestFamilyCandidate(nextFamilyKey, candidates)
              : null

            return candidate ? [[episode.episodeNumber, candidate.id]] : []
          })
        )

        setSelectedFamilyKey(nextFamilyKey)
        setSelectedEpisodes(
          Object.fromEntries(
            episodeSourceSets.map(({ episode, candidates }) => [
              episode.episodeNumber,
              nextFamilyKey
                ? selectBestFamilyCandidate(nextFamilyKey, candidates) !== null
                : false,
            ])
          )
        )
        setSelectedSourceIds(nextSelectedSourceIds)

        setReviewState({
          status: "success",
          message: null,
          detail,
          season,
          episodeSourceSets,
        })
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) {
          return
        }

        setReviewState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not load season review",
          detail: null,
          season: null,
          episodeSourceSets: [],
        })
      })

    return () => {
      abortController.abort()
    }
  }, [config.realDebridApiKey, config.tmdbApiKey, seasonNumber, tmdbId])

  const families = useMemo(
    () => rankSourceFamilies(reviewState.episodeSourceSets),
    [reviewState.episodeSourceSets]
  )

  const selectedFamily =
    families.find((family) => family.key === selectedFamilyKey) ?? null
  const selectedCandidates = reviewState.episodeSourceSets.map(
    ({ candidates, episode }) =>
      candidates.find(
        (candidate) => candidate.id === selectedSourceIds[episode.episodeNumber]
      ) ?? null
  )
  const baseline = buildFamilyBaseline(selectedCandidates)

  if (reviewState.status === "loading") {
    return <InfoCard label="Loading" />
  }

  if (reviewState.status === "error") {
    return (
      <InfoCard label={reviewState.message ?? "Could not load season review"} />
    )
  }

  if (!reviewState.detail || !reviewState.season) {
    return <InfoCard label="Season review is unavailable" />
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="outline" className="rounded-2xl">
          <Link href={`/media/tv/${tmdbId}`}>Back to detail</Link>
        </Button>
        <div className="max-w-[50vw] text-right text-xs font-medium tracking-[0.18em] break-words text-muted-foreground uppercase">
          {reviewState.detail.title}
        </div>
      </div>

      <section className="grid gap-4 rounded-[30px] border border-border/70 bg-card/85 p-5 shadow-[0_18px_80px_-38px_rgba(18,38,33,0.38)] md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-semibold tracking-[0.22em] text-primary/80 uppercase">
            Release families
          </p>
          <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium text-foreground">
            {getWatchedSeasonEpisodeCount(watchProgress, seasonNumber)}/
            {reviewState.season.episodes.length} watched
          </span>
          {selectedFamily ? (
            <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
              {selectedFamily.coverageCount}/
              {reviewState.season.episodes.length}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {families.map((family) => (
            <Button
              key={family.key}
              type="button"
              variant={family.key === selectedFamilyKey ? "default" : "outline"}
              className="h-auto max-w-full rounded-2xl py-2 text-left leading-5 break-words whitespace-normal"
              onClick={() => {
                setSelectedFamilyKey(family.key)
                setSelectedEpisodes(
                  Object.fromEntries(
                    reviewState.episodeSourceSets.map(
                      ({ episode, candidates }) => [
                        episode.episodeNumber,
                        selectBestFamilyCandidate(family.key, candidates) !==
                          null,
                      ]
                    )
                  )
                )
                setSelectedSourceIds(
                  Object.fromEntries(
                    reviewState.episodeSourceSets.flatMap(
                      ({ episode, candidates }) => {
                        const candidate = selectBestFamilyCandidate(
                          family.key,
                          candidates
                        )

                        return candidate
                          ? [[episode.episodeNumber, candidate.id]]
                          : []
                      }
                    )
                  )
                )
              }}
            >
              {family.label || "Unnamed family"}
            </Button>
          ))}
        </div>
      </section>

      <section className="grid gap-3 rounded-[30px] border border-border/70 bg-card/85 p-5 shadow-[0_18px_80px_-38px_rgba(18,38,33,0.38)] md:p-6">
        {reviewState.episodeSourceSets.map(({ episode, candidates }) => {
          const selectedSource =
            candidates.find(
              (candidate) =>
                candidate.id === selectedSourceIds[episode.episodeNumber]
            ) ?? null
          const isWatched = isEpisodeWatched(
            watchProgress,
            seasonNumber,
            episode.episodeNumber
          )
          const warnings = getEpisodeSourceWarnings({
            candidate: selectedSource,
            selectedFamilyKey: selectedFamilyKey ?? "",
            baseline,
          })

          return (
            <article
              key={episode.id}
              className="grid gap-4 rounded-[24px] border border-border/70 bg-background/70 p-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center"
            >
              <label className="flex items-center gap-3 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={selectedEpisodes[episode.episodeNumber] ?? false}
                  disabled={!selectedSource}
                  onChange={(event) =>
                    setSelectedEpisodes((current) => ({
                      ...current,
                      [episode.episodeNumber]: event.target.checked,
                    }))
                  }
                />
                <span>Episode {episode.episodeNumber}</span>
              </label>

              <div className="min-w-0">
                <p className="text-sm font-medium break-words text-foreground">
                  {episode.title}
                </p>
                <p className="mt-2 text-sm break-words text-muted-foreground">
                  {selectedSource?.title ?? "No family match"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {isWatched ? (
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-700">
                      Watched
                    </span>
                  ) : (
                    <span className="rounded-full border border-border/70 bg-card px-2.5 py-1 font-medium text-muted-foreground">
                      Unwatched
                    </span>
                  )}
                </div>
                {candidates.length > 0 ? (
                  <select
                    value={selectedSourceIds[episode.episodeNumber] ?? ""}
                    className="mt-3 w-full min-w-0 rounded-2xl border border-border/70 bg-card px-3 py-2 text-sm text-foreground"
                    onChange={(event) => {
                      const nextSourceId = event.target.value

                      setSelectedSourceIds((current) => ({
                        ...current,
                        [episode.episodeNumber]: nextSourceId,
                      }))
                      setSelectedEpisodes((current) => ({
                        ...current,
                        [episode.episodeNumber]: nextSourceId.length > 0,
                      }))
                    }}
                  >
                    <option value="">No source</option>
                    {candidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.provider} - {candidate.quality ?? "Unknown"}{" "}
                        - {candidate.size ?? "Unknown size"}
                      </option>
                    ))}
                  </select>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {warnings.titleMismatch ? (
                    <WarningTag label="Title mismatch" />
                  ) : null}
                  {warnings.providerMismatch ? (
                    <WarningTag label="Provider mismatch" />
                  ) : null}
                  {warnings.sizeOutlier ? (
                    <WarningTag label="Size outlier" />
                  ) : null}
                  {warnings.codecMismatch ? (
                    <WarningTag label="Codec mismatch" />
                  ) : null}
                  {!selectedSource ? (
                    <WarningTag label="Missing episode" />
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                {selectedSource?.url ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() =>
                      window.open(
                        selectedSource.url ?? "",
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                  >
                    Download
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant={isWatched ? "secondary" : "outline"}
                  className="rounded-2xl"
                  onClick={() =>
                    markEpisodeWatched(
                      tmdbId,
                      seasonNumber,
                      episode.episodeNumber,
                      !isWatched
                    )
                  }
                >
                  {isWatched ? "Unwatch" : "Mark watched"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-2xl"
                  disabled={markUntilStatus === "loading"}
                  onClick={async () => {
                    try {
                      setMarkUntilStatus("loading")

                      const seasons = await Promise.all(
                        Array.from(
                          { length: seasonNumber },
                          (_, index) => index + 1
                        ).map(async (currentSeasonNumber) =>
                          fetchTmdbTvSeasonDetail({
                            apiKey: config.tmdbApiKey,
                            tmdbId,
                            seasonNumber: currentSeasonNumber,
                          })
                        )
                      )

                      const episodesToMark = seasons.flatMap((season) =>
                        season.episodes.flatMap((seasonEpisode) =>
                          season.seasonNumber < seasonNumber ||
                          seasonEpisode.episodeNumber <= episode.episodeNumber
                            ? [
                                {
                                  seasonNumber: season.seasonNumber,
                                  episodeNumber: seasonEpisode.episodeNumber,
                                },
                              ]
                            : []
                        )
                      )

                      markEpisodesWatched(tmdbId, episodesToMark, true)
                      setMarkUntilStatus("idle")
                    } catch {
                      setMarkUntilStatus("error")
                    }
                  }}
                >
                  {markUntilStatus === "loading"
                    ? "Updating..."
                    : "Watched until here"}
                </Button>
              </div>
            </article>
          )
        })}
      </section>

      {markUntilStatus === "error" ? (
        <InfoCard label="Could not mark previous episodes as watched" />
      ) : null}
    </div>
  )
}

function InfoCard({ label }: { label: string }) {
  return (
    <section className="rounded-[24px] border border-border/70 bg-card/80 px-4 py-3 text-sm text-muted-foreground shadow-[0_18px_80px_-42px_rgba(18,38,33,0.35)]">
      {label}
    </section>
  )
}

function WarningTag({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 font-medium text-amber-700">
      {label}
    </span>
  )
}
