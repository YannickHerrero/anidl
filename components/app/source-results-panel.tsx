"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { type TorrentioSource } from "@/lib/torrentio"

type SourceResultsPanelProps = Readonly<{
  title: string
  status: "idle" | "loading" | "success" | "error"
  sources: TorrentioSource[]
  message?: string | null
}>

export function SourceResultsPanel({
  title,
  status,
  sources,
  message,
}: SourceResultsPanelProps) {
  return (
    <section className="grid gap-4 rounded-[30px] border border-border/70 bg-card/85 p-5 shadow-[0_18px_80px_-38px_rgba(18,38,33,0.38)] md:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary/80 uppercase">
          {title}
        </p>
        {status === "success" ? (
          <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
            {sources.length}
          </span>
        ) : null}
      </div>

      {status === "loading" ? <StateRow label="Loading" /> : null}
      {status === "error" ? (
        <StateRow label={message ?? "Could not load sources"} />
      ) : null}
      {status === "success" && sources.length === 0 ? (
        <StateRow label="No cached torrents found" />
      ) : null}

      {status === "success" && sources.length > 0 ? (
        <div className="grid gap-3">
          {sources.map((source) => (
            <article
              key={source.id}
              className={`grid gap-4 rounded-[24px] border p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center ${
                source.isRecommended
                  ? "border-primary/35 bg-primary/8"
                  : "border-border/70 bg-background/70"
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                  {source.isRecommended ? <span>Best pick</span> : null}
                  <span>{source.provider}</span>
                  {source.quality ? <span>{source.quality}</span> : null}
                  {source.size ? <span>{source.size}</span> : null}
                  {source.seeders !== null ? (
                    <span>{source.seeders} seeders</span>
                  ) : null}
                  {source.sourceType ? <span>{source.sourceType}</span> : null}
                </div>
                <p className="mt-2 text-sm font-medium break-words text-foreground">
                  {source.title}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {source.videoCodec ? (
                    <FactTag value={source.videoCodec} />
                  ) : null}
                  {source.audio ? <FactTag value={source.audio} /> : null}
                  {source.hdr ? <FactTag value={source.hdr} /> : null}
                  {source.languages.map((language) => (
                    <FactTag key={language} value={language} />
                  ))}
                </div>
              </div>

              {source.url ? (
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button asChild variant="outline" className="rounded-2xl">
                    <Link href={source.url} target="_blank" rel="noreferrer">
                      Open
                    </Link>
                  </Button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function FactTag({ value }: { value: string }) {
  return (
    <span className="rounded-full border border-border/70 bg-card px-2.5 py-1 font-medium text-foreground">
      {value}
    </span>
  )
}

function StateRow({ label }: { label: string }) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
      {label}
    </div>
  )
}
