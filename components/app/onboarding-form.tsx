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
      <div className="rounded-[28px] border border-border/70 bg-card/92 p-6 shadow-[0_18px_80px_-38px_rgba(18,38,33,0.45)] backdrop-blur sm:p-8">
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
      return
    }

    onSave(values)
    setErrors({})
    onComplete()
  }

  return (
    <section>
      <article className="rounded-[28px] border border-border/70 bg-card/92 p-6 shadow-[0_18px_80px_-38px_rgba(18,38,33,0.45)] backdrop-blur sm:p-8">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <p className="text-sm font-semibold tracking-[0.24em] text-muted-foreground uppercase">
              Credentials
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">
              Add your API keys
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {isConfigured
                ? "Your keys are already saved in this browser."
                : "Both services are required to continue."}
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
