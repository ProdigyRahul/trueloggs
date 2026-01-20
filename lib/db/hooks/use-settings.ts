"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { useCallback } from "react"
import { db } from "../index"
import type { UserProfile, WorkSettings, ThemePreference, InvoiceSettings } from "../schema"
import { syncEngine } from "@/lib/sync/sync-engine"

export function useSettings() {
  const settings = useLiveQuery(() => db.settings.get("settings"), [], null)

  const updateProfile = useCallback(async (profileUpdates: Partial<UserProfile>): Promise<void> => {
    const current = await db.settings.get("settings")
    if (!current) return

    const isAuthenticated = syncEngine.isEnabled()

    const updates = {
      profile: {
        ...current.profile,
        ...profileUpdates,
      },
      ...(isAuthenticated && {
        syncStatus: "pending" as const,
        syncVersion: (current.syncVersion || 0) + 1,
      }),
    }

    await db.settings.update("settings", updates)

    if (isAuthenticated) {
      await syncEngine.queueChange("settings", 1, "update", updates, current.cloudId)
    }
  }, [])

  const updateWorkSettings = useCallback(async (workSettingsUpdates: Partial<WorkSettings>): Promise<void> => {
    const current = await db.settings.get("settings")
    if (!current) return

    const isAuthenticated = syncEngine.isEnabled()

    const updates = {
      workSettings: {
        ...current.workSettings,
        ...workSettingsUpdates,
      },
      ...(isAuthenticated && {
        syncStatus: "pending" as const,
        syncVersion: (current.syncVersion || 0) + 1,
      }),
    }

    await db.settings.update("settings", updates)

    if (isAuthenticated) {
      await syncEngine.queueChange("settings", 1, "update", updates, current.cloudId)
    }
  }, [])

  const updateTheme = useCallback(async (theme: ThemePreference): Promise<void> => {
    const current = await db.settings.get("settings")
    const isAuthenticated = syncEngine.isEnabled()

    const updates = {
      theme,
      ...(isAuthenticated && current && {
        syncStatus: "pending" as const,
        syncVersion: (current.syncVersion || 0) + 1,
      }),
    }

    await db.settings.update("settings", updates)

    if (isAuthenticated && current) {
      await syncEngine.queueChange("settings", 1, "update", updates, current.cloudId)
    }
  }, [])

  const updateInvoiceSettings = useCallback(
    async (invoiceSettingsUpdates: Partial<InvoiceSettings>): Promise<void> => {
      const current = await db.settings.get("settings")
      if (!current) return

      const isAuthenticated = syncEngine.isEnabled()

      const currentInvoiceSettings = current.invoiceSettings || {
        invoiceCounter: 0,
        invoicePrefix: "INV",
        lastInvoiceYear: new Date().getFullYear(),
      }

      const updates = {
        invoiceSettings: {
          ...currentInvoiceSettings,
          ...invoiceSettingsUpdates,
        },
        ...(isAuthenticated && {
          syncStatus: "pending" as const,
          syncVersion: (current.syncVersion || 0) + 1,
        }),
      }

      await db.settings.update("settings", updates)

      if (isAuthenticated) {
        await syncEngine.queueChange("settings", 1, "update", updates, current.cloudId)
      }
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
