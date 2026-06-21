import { OnboardingForm } from "@/components/app/onboarding-form"

export default function OnboardingPage() {
  return (
    <main className="min-h-svh bg-canvas px-5 py-14 text-foreground sm:px-8 sm:py-20">
      <div className="mx-auto flex max-w-2xl flex-col gap-7">
        <div className="space-y-3 text-center">
          <div className="display text-[27px] leading-none font-extrabold">
            anidl<span className="text-primary">.</span>
          </div>
          <p className="font-mono text-[11px] tracking-[0.08em] text-faint uppercase">
            anidl setup
          </p>
          <h1 className="display text-4xl sm:text-5xl">Connect your account</h1>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Add your TMDB and Real-Debrid keys to start searching titles and
            preparing downloads.
          </p>
        </div>

        <OnboardingForm />
      </div>
    </main>
  )
}
