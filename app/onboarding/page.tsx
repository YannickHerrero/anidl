import { OnboardingForm } from "@/components/app/onboarding-form"

export default function OnboardingPage() {
  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top,rgba(208,237,225,0.72),transparent_32%),linear-gradient(180deg,#f8f4ed_0%,#f3ecdf_100%)] px-5 py-14 text-foreground sm:px-8 sm:py-20 dark:bg-[radial-gradient(circle_at_top,rgba(48,102,94,0.28),transparent_32%),linear-gradient(180deg,#101718_0%,#182122_100%)]">
      <div className="mx-auto flex max-w-2xl flex-col gap-7">
        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold tracking-[0.28em] text-primary/80 uppercase">
            anidl setup
          </p>
          <h1 className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
            Connect your account
          </h1>
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
