"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useAppConfig } from "@/hooks/use-app-config"

export function RootEntry() {
  const router = useRouter()
  const { isConfigured, isHydrated } = useAppConfig()

  useEffect(() => {
    if (!isHydrated) {
      return
    }

    router.replace(isConfigured ? "/search" : "/onboarding")
  }, [isConfigured, isHydrated, router])

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-6">
      <div className="max-w-md rounded-[28px] border border-border/70 bg-card/85 p-6 text-center shadow-[0_18px_80px_-38px_rgba(18,38,33,0.45)]">
        <p className="text-sm font-semibold tracking-[0.24em] text-primary/80 uppercase">
          Booting anidl
        </p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Routing you to onboarding or the search flow based on the keys already
          saved in this browser.
        </p>
      </div>
    </div>
  )
}
