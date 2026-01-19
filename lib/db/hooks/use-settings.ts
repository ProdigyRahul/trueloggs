"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { useCallback } from "react"
import { db } from "../index"
import type { UserProfile, WorkSettings, ThemePreference, InvoiceSettings } from "../schema"

export function useSettings() {
  const settings = useLiveQuery(() => db.settings.get("settings"), [], null)

  const updateProfile = useCallback(async (profileUpdates: Partial<UserProfile>): Promise<void> => {
    const current = await db.settings.get("settings")
    if (!current) return

    await db.settings.update("settings", {
      profile: {
        ...current.profile,
        ...profileUpdates,
      },
    })
  }, [])

  const updateWorkSettings = useCallback(async (workSettingsUpdates: Partial<WorkSettings>): Promise<void> => {
    const current = await db.settings.get("settings")
    if (!current) return

    await db.settings.update("settings", {
      workSettings: {
        ...current.workSettings,
        ...workSettingsUpdates,
      },
    })
  }, [])

  const updateTheme = useCallback(async (theme: ThemePreference): Promise<void> => {
    await db.settings.update("settings", { theme })
  }, [])

  const updateInvoiceSettings = useCallback(
    async (invoiceSettingsUpdates: Partial<InvoiceSettings>): Promise<void> => {
      const current = await db.settings.get("settings")
      if (!current) return

      await db.settings.update("settings", {
        invoiceSettings: {
          ...current.invoiceSettings,
          ...invoiceSettingsUpdates,
        },
      })
    },
    []
  )

  const resetSettings = useCallback(async (): Promise<void> => {
    await db.settings.put({
      id: "settings",
      profile: {
        fullName: "",
        email: "",
        company: "",
        phone: "",
        address: "",
        bio: "",
      },
      workSettings: {
        targetHoursPerWeek: 40,
        defaultHourlyRate: 50,
        workDays: [false, true, true, true, true, true, false],
      },
      invoiceSettings: {
        invoiceCounter: 0,
        invoicePrefix: "INV",
        lastInvoiceYear: new Date().getFullYear(),
      },
      theme: "system",
    })
  }, [])

  return {
    settings,
    isLoading: settings === null,
    updateProfile,
    updateWorkSettings,
    updateInvoiceSettings,
    updateTheme,
    resetSettings,
  }
}

export function useThemePreference() {
  const { settings, updateTheme, isLoading } = useSettings()

  return {
    theme: settings?.theme ?? "system",
    setTheme: updateTheme,
    isLoading,
  }
}
