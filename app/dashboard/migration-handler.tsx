"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { db } from "@/lib/db"
import { MigrationDialog } from "@/components/migration-dialog"
import { syncEngine } from "@/lib/sync/sync-engine"
import type { MigrationOption } from "@/lib/db/schema"
import type { User } from "@/lib/auth"

interface DashboardMigrationHandlerProps {
  user: User | null
}

export function DashboardMigrationHandler({
  user,
}: DashboardMigrationHandlerProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const checkedRef = useRef(false)

  const [showMigrationDialog, setShowMigrationDialog] = useState(false)
  const [localCounts, setLocalCounts] = useState({
    projects: 0,
    timeEntries: 0,
    invoices: 0,
  })
  const [cloudCounts, setCloudCounts] = useState({
    projects: 0,
    timeEntries: 0,
    invoices: 0,
  })

  const checkMigrationNeeded = useCallback(async () => {
    if (checkedRef.current) return
    checkedRef.current = true

    try {
      const projects = await db.projects.count()
      const timeEntries = await db.timeEntries.count()
      const invoices = await db.invoices.count()

      const hasLocalData = projects > 0 || timeEntries > 0 || invoices > 0

      if (!hasLocalData) {
        if (user) {
          syncEngine.setUser(user.id)
          syncEngine.syncNow()
        }
        return
      }

      const response = await fetch("/api/sync/status")
      if (!response.ok) {
        console.error("Failed to check cloud status")
        return
      }

      const cloudStatus = await response.json()

      if (hasLocalData || cloudStatus.hasExistingData) {
        setLocalCounts({ projects, timeEntries, invoices })
        setCloudCounts(cloudStatus.counts)
        setShowMigrationDialog(true)
      } else {
        if (user) {
          syncEngine.setUser(user.id)
          syncEngine.syncNow()
        }
      }
    } catch (error) {
      console.error("Migration check error:", error)
    }
  }, [user])

  useEffect(() => {
    const isNewLogin = searchParams.get("newLogin") === "true"

    if (!isNewLogin || !user) return

    const newUrl = new URL(window.location.href)
    newUrl.searchParams.delete("newLogin")
    router.replace(newUrl.pathname, { scroll: false })

    const timeoutId = setTimeout(() => {
      checkMigrationNeeded()
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [searchParams, user, router, checkMigrationNeeded])

  const handleMigrationComplete = async (option: MigrationOption) => {
    setShowMigrationDialog(false)

    if (option === "cancel") {
      if (typeof window !== "undefined") {
        localStorage.setItem("trueloggs_guest_mode", "true")
      }
      return
    }

    if (user) {
      syncEngine.setUser(user.id)
      setTimeout(() => {
        syncEngine.syncNow()
      }, 1000)
    }
  }

  return (
    <MigrationDialog
      open={showMigrationDialog}
      onOpenChange={setShowMigrationDialog}
      onComplete={handleMigrationComplete}
      localCounts={localCounts}
      cloudCounts={cloudCounts}
    />
  )
}
