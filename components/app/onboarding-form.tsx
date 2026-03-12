"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAppConfig } from "@/hooks/use-app-config"
import { type AppConfig } from "@/lib/app-config"

type FieldName = keyof AppConfig

type Errors = Partial<Record<FieldName, string>>

const fieldMeta: Array<{
  name: FieldName
  label: string
  hint: string
  href: string
  hrefLabel: string
}> = [
  {
    name: "tmdbApiKey",
    label: "TMDB API key",
    hint: 'Use the "API Key (v3 auth)" from your TMDB account settings.',
    href: "https://www.themoviedb.org/settings/api",
    hrefLabel: "Open TMDB settings",
  },
  {
    name: "realDebridApiKey",
    label: "Real-Debrid API key",
    hint: "Use the personal API token generated on the Real-Debrid apitoken page.",
    href: "https://real-debrid.com/apitoken",
    hrefLabel: "Open Real-Debrid token page",
  },
]

function validateConfig(values: AppConfig) {
  const errors: Errors = {}

  if (!values.tmdbApiKey.trim()) {
    errors.tmdbApiKey = "TMDB is mandatory for title search and metadata."
  }

  if (!values.realDebridApiKey.trim()) {
    errors.realDebridApiKey =
      "Real-Debrid is mandatory for the download-only flow."
  }

  return errors
}

export function OnboardingForm() {
  const router = useRouter()
  const { config, isConfigured, isHydrated, saveConfig } = useAppConfig()

  if (!isHydrated) {
    return (
      <div className="rounded-[30px] border border-border/70 bg-card/84 p-6 shadow-[0_18px_80px_-38px_rgba(18,38,33,0.45)] backdrop-blur sm:p-8">
        <p className="text-sm font-semibold tracking-[0.24em] text-muted-foreground uppercase">
          Credentials
        </p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Loading the locally saved keys for this browser.
        </p>
      </div>
    )
  }

  return (
    <OnboardingFormFields
      initialConfig={config}
      isConfigured={isConfigured}
      onSave={saveConfig}
      onComplete={() => router.push("/search")}
    />
  )
}

type OnboardingFormFieldsProps = {
  initialConfig: AppConfig
  isConfigured: boolean
  onSave: (config: AppConfig) => AppConfig
  onComplete: () => void
}

function OnboardingFormFields({
  initialConfig,
  isConfigured,
  onSave,
  onComplete,
}: OnboardingFormFieldsProps) {
  const [values, setValues] = useState<AppConfig>(initialConfig)
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState(
    isConfigured
      ? "Saved locally in this browser."
      : "Add both keys to unlock the rest of the app."
  )

  const isReadyToSave = useMemo(() => {
    return (
      values.tmdbApiKey.trim().length > 0 &&
      values.realDebridApiKey.trim().length > 0
    )
  }, [values.realDebridApiKey, values.tmdbApiKey])

  function handleFieldChange(name: FieldName, value: string) {
    setValues((current) => ({
      ...current,
      [name]: value,
    }))

    setErrors((current) => {
      if (!current[name]) {
        return current
      }

      const next = { ...current }
      delete next[name]
      return next
    })
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors = validateConfig(values)

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setStatus("Both keys are required before continuing.")
      return
    }

    onSave(values)
    setErrors({})
    setStatus("Saved locally. Sending you to search.")
    onComplete()
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <article className="overflow-hidden rounded-[30px] border border-border/70 bg-[linear-gradient(155deg,rgba(13,54,51,0.96),rgba(33,95,86,0.84))] p-6 text-primary-foreground shadow-[0_20px_100px_-42px_rgba(18,38,33,0.72)] sm:p-8">
        <p className="text-sm font-semibold tracking-[0.24em] text-primary-foreground/72 uppercase">
          Local setup
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
          One browser, one private workspace.
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-7 text-primary-foreground/78">
          This first pass keeps credentials on the client only. That makes the
          onboarding quick while leaving room to swap in encrypted server
          storage later if you want to evolve the project.
        </p>

        <div className="mt-8 grid gap-4">
          <div className="rounded-[22px] border border-white/12 bg-white/8 p-4 backdrop-blur">
            <p className="text-sm font-medium">
              TMDB drives search and metadata
            </p>
            <p className="mt-2 text-sm leading-6 text-primary-foreground/75">
              Title lookup, artwork, release data, and media typing will start
              from TMDB results.
            </p>
          </div>

          <div className="rounded-[22px] border border-white/12 bg-white/8 p-4 backdrop-blur">
            <p className="text-sm font-medium">
              Real-Debrid drives the final download step
            </p>
            <p className="mt-2 text-sm leading-6 text-primary-foreground/75">
              There is no direct torrent mode in this build. Torrentio results
              will later be resolved through Real-Debrid only.
            </p>
          </div>

          <div className="rounded-[22px] border border-white/12 bg-white/8 p-4 backdrop-blur">
            <p className="text-sm font-medium">Current scope</p>
            <p className="mt-2 text-sm leading-6 text-primary-foreground/75">
              Onboarding is functional now, while search and detail routes are
              intentionally skeletons for the next implementation pass.
            </p>
          </div>
        </div>
      </article>

      <article className="rounded-[30px] border border-border/70 bg-card/84 p-6 shadow-[0_18px_80px_-38px_rgba(18,38,33,0.45)] backdrop-blur sm:p-8">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <p className="text-sm font-semibold tracking-[0.24em] text-muted-foreground uppercase">
              Credentials
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">
              Store both keys in local browser storage
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {status}
            </p>
          </div>

          {fieldMeta.map((field) => {
            const hasError = Boolean(errors[field.name])

            return (
              <div key={field.name} className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label
                    className="text-sm font-medium text-foreground"
                    htmlFor={field.name}
                  >
                    {field.label}
                  </label>
                  <Link
                    href={field.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {field.hrefLabel}
                  </Link>
                </div>

                <Input
                  id={field.name}
                  name={field.name}
                  type="password"
                  value={values[field.name]}
                  onChange={(event) =>
                    handleFieldChange(field.name, event.target.value)
                  }
                  placeholder={field.label}
                  autoComplete="off"
                  aria-invalid={hasError}
                  className="h-13 rounded-2xl bg-background/75 px-4"
                />

                <p className="text-sm leading-6 text-muted-foreground">
                  {field.hint}
                </p>
                {hasError ? (
                  <p className="text-sm text-destructive">
                    {errors[field.name]}
                  </p>
                ) : null}
              </div>
            )
          })}

          <div className="rounded-[24px] border border-border/70 bg-background/72 p-4">
            <p className="text-sm font-medium text-foreground">
              What happens next
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              After saving, the app routes you to the search skeleton. That
              route is already gated, so returning visitors with stored keys
              skip straight into the app flow.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="submit" size="lg" className="rounded-2xl px-6">
              Save and continue
            </Button>
            <p className="text-sm text-muted-foreground">
              {isReadyToSave
                ? "Ready to continue."
                : "Both fields are mandatory."}
            </p>
          </div>
        </form>
      </article>
    </section>
  )
}
