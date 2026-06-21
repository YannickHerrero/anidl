"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

/**
 * Compact theme toggle used in the sidebar footer. Mirrors the comp's
 * "{Light|Dark} mode" pill with a half-filled dot glyph.
 */
function ThemeToggleButton({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    const markMounted = () => setMounted(true)
    markMounted()
  }, [])

  const isDark = resolvedTheme === "dark"
  const nextLabel = isDark ? "Light" : "Dark"

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={
        "flex items-center gap-2.5 rounded-[11px] border border-border bg-transparent px-3 py-2.5 font-mono text-[11px] text-foreground transition-colors hover:bg-secondary " +
        (className ?? "")
      }
    >
      <span
        aria-hidden="true"
        className="size-3.5 rounded-full border-[1.5px] border-current"
        style={{
          background:
            "linear-gradient(90deg, currentColor 0 50%, transparent 50% 100%)",
        }}
      />
      {mounted ? `${nextLabel} mode` : "Theme"}
    </button>
  )
}

export { ThemeProvider, ThemeToggleButton }
