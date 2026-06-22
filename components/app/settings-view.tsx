"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"

import { useAppConfig } from "@/hooks/use-app-config"
import { useRealDebridUser } from "@/hooks/use-real-debrid-user"
import { validateRealDebridApiKey, describeRealDebridPlan } from "@/lib/real-debrid"
import { validateTmdbApiKey } from "@/lib/tmdb"
import { cn } from "@/lib/utils"

type SaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string }

export function SettingsView() {
  const { config, saveConfig } = useAppConfig()
  const router = useRouter()
  const [tmdbKey, setTmdbKey] = useState(config.tmdbApiKey)
  const [rdKey, setRdKey] = useState(config.realDebridApiKey)
  const [revealTmdb, setRevealTmdb] = useState(false)
  const [revealRd, setRevealRd] = useState(false)
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" })
  const [anilistUser, setAnilistUser] = useState(config.anilistUser)
  const [anilistSaved, setAnilistSaved] = useState(false)

  const handleSave = async () => {
    const nextTmdb = tmdbKey.trim()
    const nextRd = rdKey.trim()

    if (!nextTmdb || !nextRd) {
      setStatus({ kind: "error", message: "Both keys are required." })
      return
    }

    setStatus({ kind: "saving" })

    const [tmdbResult, rdResult] = await Promise.allSettled([
      validateTmdbApiKey({ apiKey: nextTmdb }),
      validateRealDebridApiKey({ apiKey: nextRd }),
    ])

    if (tmdbResult.status === "rejected") {
      setStatus({ kind: "error", message: "TMDB rejected this API key." })
      return
    }

    if (rdResult.status === "rejected") {
      setStatus({ kind: "error", message: "Real-Debrid rejected this API key." })
      return
    }

    saveConfig({
      tmdbApiKey: nextTmdb,
      realDebridApiKey: nextRd,
      anilistUser: config.anilistUser,
    })
    setStatus({ kind: "saved" })
  }

  const handleSaveAnilist = () => {
    saveConfig({
      tmdbApiKey: config.tmdbApiKey,
      realDebridApiKey: config.realDebridApiKey,
      anilistUser: anilistUser.trim(),
    })
    setAnilistSaved(true)
  }

  const handleReset = () => {
    saveConfig({ tmdbApiKey: "", realDebridApiKey: "", anilistUser: "" })
    router.push("/onboarding")
  }

  return (
    <div className="max-w-[820px] px-8 py-12 pb-20 sm:px-14">
      <h1 className="display text-[40px]">Settings</h1>
      <div className="mt-2.5 font-mono text-[11px] text-faint">
        Manage credentials, appearance, and connected services
      </div>

      <SectionLabel>Credentials</SectionLabel>
      <div className="flex flex-col gap-3.5">
        <CredentialCard
          label="TMDB API key"
          value={tmdbKey}
          onChange={setTmdbKey}
          reveal={revealTmdb}
          onToggleReveal={() => setRevealTmdb((v) => !v)}
          validated={tmdbKey.trim() === config.tmdbApiKey && tmdbKey.trim() !== ""}
          hint="Used for search & metadata."
          link={{
            label: "Get a key in your TMDB settings →",
            href: "https://www.themoviedb.org/settings/api",
          }}
        />
        <CredentialCard
          label="Real-Debrid API key"
          value={rdKey}
          onChange={setRdKey}
          reveal={revealRd}
          onToggleReveal={() => setRevealRd((v) => !v)}
          validated={
            rdKey.trim() === config.realDebridApiKey && rdKey.trim() !== ""
          }
          hint="Resolves cached torrents to direct links."
          link={{
            label: "Open your RD token page →",
            href: "https://real-debrid.com/apitoken",
          }}
        />
      </div>

      <div className="mt-[18px] flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={status.kind === "saving"}
          className="rounded-[11px] bg-primary px-6 py-3 text-[13.5px] font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {status.kind === "saving" ? "Validating…" : "Validate & save"}
        </button>
        <span
          className={cn(
            "font-mono text-[11px]",
            status.kind === "error" ? "text-primary" : "text-faint"
          )}
        >
          {status.kind === "saved"
            ? "Saved."
            : status.kind === "error"
              ? status.message
              : status.kind === "saving"
                ? "Checking both keys…"
                : "Keys are stored locally in this browser."}
        </span>
      </div>

      <SectionLabel>Appearance</SectionLabel>
      <ThemeRow />

      <SectionLabel>AniList profile</SectionLabel>
      <div className="rounded-[14px] border border-border bg-card p-[22px]">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-semibold">
            Username, ID, or profile URL
          </span>
          {config.anilistUser ? (
            <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.05em] text-success">
              <span className="size-1.5 rounded-full bg-success" />
              LINKED
            </span>
          ) : null}
        </div>
        <div className="mt-3.5 flex items-center gap-2.5 rounded-[10px] border border-border bg-background px-[15px] py-[13px]">
          <input
            value={anilistUser}
            onChange={(event) => {
              setAnilistUser(event.target.value)
              setAnilistSaved(false)
            }}
            autoComplete="off"
            placeholder="e.g. yourname or https://anilist.co/user/yourname"
            className="flex-1 bg-transparent font-mono text-[13px] text-foreground outline-none placeholder:text-faint"
          />
          <button
            type="button"
            onClick={handleSaveAnilist}
            className="rounded-md bg-primary px-3 py-[7px] text-[11px] font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Save
          </button>
        </div>
        <div className="mt-3 text-[12.5px] text-muted-foreground">
          Powers the AniList page with your Watching list. Your AniList list must
          be public. {anilistSaved ? "Saved." : null}
        </div>
      </div>

      <SectionLabel>Connected services</SectionLabel>
      <ConnectedServices />

      <div className="mt-6 flex items-center justify-between rounded-[14px] border border-border px-[22px] py-[18px]">
        <div>
          <div className="text-[14px] font-semibold text-primary">
            Reset credentials
          </div>
          <div className="mt-1 font-mono text-[11px] text-faint">
            Clears saved keys and returns to onboarding
          </div>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-[10px] border border-primary px-[18px] py-[11px] text-[13px] font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          Reset
        </button>
      </div>
    </div>
  )
}

function CredentialCard({
  label,
  value,
  onChange,
  reveal,
  onToggleReveal,
  validated,
  hint,
  link,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  reveal: boolean
  onToggleReveal: () => void
  validated: boolean
  hint: string
  link: { label: string; href: string }
}) {
  return (
    <div className="rounded-[14px] border border-border bg-card p-[22px]">
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-semibold">{label}</span>
        {validated ? (
          <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.05em] text-success">
            <span className="size-1.5 rounded-full bg-success" />
            VALIDATED
          </span>
        ) : (
          <span className="font-mono text-[10px] tracking-[0.05em] text-faint">
            UNSAVED
          </span>
        )}
      </div>
      <div className="mt-3.5 flex items-center gap-2.5 rounded-[10px] border border-border bg-background px-[15px] py-[13px]">
        <input
          type={reveal ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="off"
          className="flex-1 bg-transparent font-mono text-[13px] tracking-[0.06em] text-foreground outline-none"
        />
        <button
          type="button"
          onClick={onToggleReveal}
          className="rounded-md border border-border bg-secondary px-[9px] py-[5px] font-mono text-[10px] text-muted-foreground"
        >
          {reveal ? "hide" : "reveal"}
        </button>
      </div>
      <div className="mt-3 text-[12.5px] text-muted-foreground">
        {hint}{" "}
        <a
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className="border-b border-primary text-primary"
        >
          {link.label}
        </a>
      </div>
    </div>
  )
}

function ThemeRow() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme !== "light"

  return (
    <div className="flex items-center justify-between rounded-[14px] border border-border bg-card px-[22px] py-[18px]">
      <div>
        <div className="text-[15px] font-semibold">Theme</div>
        <div className="mt-1 font-mono text-[11px] text-faint">
          Persists across sessions
        </div>
      </div>
      <div className="flex gap-1 rounded-[10px] border border-border bg-background p-1">
        {[
          { key: "dark", label: "Dark", active: isDark },
          { key: "light", label: "Light", active: !isDark },
        ].map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setTheme(option.key)}
            className={cn(
              "rounded-[7px] px-[18px] py-[9px] text-[13px] font-semibold transition-colors",
              option.active
                ? "bg-foreground text-background"
                : "text-muted-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ConnectedServices() {
  const rd = useRealDebridUser()
  const rdDetail =
    rd.status === "success" ? describeRealDebridPlan(rd.user) : "search & resolve"

  const services = [
    { name: "TMDB", detail: "search & metadata", connected: true },
    {
      name: "Real-Debrid",
      detail: rdDetail,
      connected: rd.status === "success",
    },
    { name: "AniList", detail: "anime tracking", connected: true },
    { name: "Torrentio", detail: "source indexer", connected: false },
  ]

  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-card">
      {services.map((service, index) => (
        <div
          key={service.name}
          className={cn(
            "flex items-center justify-between px-[22px] py-4",
            index < services.length - 1 && "border-b border-border"
          )}
        >
          <div>
            <span className="text-[14px] font-semibold">{service.name}</span>
            <span className="ml-2.5 font-mono text-[11px] text-faint">
              {service.detail}
            </span>
          </div>
          <span
            className={cn(
              "flex items-center gap-1.5 font-mono text-[11px]",
              service.connected ? "text-success" : "text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                service.connected ? "bg-success" : "bg-faint"
              )}
            />
            {service.name === "Torrentio"
              ? "Default config"
              : service.name === "AniList"
                ? "Public API"
                : service.connected
                  ? "Connected"
                  : "Offline"}
          </span>
        </div>
      ))}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-11 mb-4 flex items-center gap-2.5">
      <span className="font-mono text-[11px] tracking-[0.08em] text-foreground uppercase">
        {children}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
