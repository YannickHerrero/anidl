"use client"

import { useEffect, useState } from "react"

export function useCountdown(airingAt: number) {
  const [secondsUntil, setSecondsUntil] = useState(() =>
    Math.max(0, airingAt - Math.floor(Date.now() / 1000))
  )

  useEffect(() => {
    const update = () => {
      setSecondsUntil(Math.max(0, airingAt - Math.floor(Date.now() / 1000)))
    }

    update()
    const intervalId = window.setInterval(update, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [airingAt])

  return secondsUntil
}
