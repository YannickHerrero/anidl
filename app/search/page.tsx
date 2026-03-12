import { AppShell } from "@/components/app/app-shell"
import { ConfigRequired } from "@/components/app/config-required"

export default function SearchPage() {
  return (
    <ConfigRequired>
      <AppShell
        eyebrow="Search"
        title="Search"
        description="Search is not available yet."
      >
        <section className="rounded-[28px] border border-border/70 bg-card/80 p-6 shadow-[0_18px_80px_-38px_rgba(18,38,33,0.45)] backdrop-blur">
          <p className="text-sm leading-6 text-muted-foreground">
            This section will stay empty until search is ready.
          </p>
        </section>
      </AppShell>
    </ConfigRequired>
  )
}
