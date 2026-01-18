"use client"

import { useEffect, type ReactNode } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"

function applyTheme(theme: "light" | "dark" | "system") {
  const root = document.documentElement
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches

  if (theme === "dark" || (theme === "system" && systemDark)) {
    root.classList.add("dark")
  } else {
    root.classList.remove("dark")
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const settings = useLiveQuery(() => db.settings.get("settings"), [], null)

  useEffect(() => {
    if (!settings) return

    applyTheme(settings.theme)

    if (settings.theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      const handler = () => applyTheme("system")
      mediaQuery.addEventListener("change", handler)
      return () => mediaQuery.removeEventListener("change", handler)
    }
  }, [settings])

  return <>{children}</>
}
