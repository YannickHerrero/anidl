import { AppShell } from "@/components/app/app-shell"
import { OnboardingForm } from "@/components/app/onboarding-form"

export default function OnboardingPage() {
  return (
    <AppShell
      eyebrow="Onboarding"
      title="Connect the services that power the flow"
      description="This learning build stores your TMDB and Real-Debrid keys locally in the browser so you can move into search and media exploration without wiring the backend yet."
    >
      <OnboardingForm />
    </AppShell>
  )
}
