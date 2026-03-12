"use client"

import type { ReactNode } from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useAppConfig } from "@/hooks/use-app-config"

type ConfigRequiredProps = {
  children: ReactNode
}

export function ConfigRequired({ children }: ConfigRequiredProps) {
  const router = useRouter()
  const { isConfigured, isHydrated } = useAppConfig()

  useEffect(() => {
    if (isHydrated && !isConfigured) {
      router.replace("/onboarding")
    }
  }, [isConfigured, isHydrated, router])

  if (!isHydrated || !isConfigured) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background px-6">
        <div className="max-w-md rounded-[28px] border border-border/70 bg-card/85 p-6 text-center shadow-[0_18px_80px_-38px_rgba(18,38,33,0.45)]">
          <p className="text-sm font-semibold tracking-[0.24em] text-primary/80 uppercase">
            Preparing workspace
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Checking whether your browser already has the required TMDB and
            Real-Debrid keys.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
