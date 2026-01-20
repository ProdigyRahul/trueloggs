"use client"

import { useState } from "react"
import { Cloud, HardDrive, Merge, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { db } from "@/lib/db"
import { exportAllData } from "@/lib/db/operations/export"
import type { MigrationOption } from "@/lib/db/schema"

interface MigrationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: (option: MigrationOption) => void
  localCounts: {
    projects: number
    timeEntries: number
    invoices: number
  }
  cloudCounts: {
    projects: number
    timeEntries: number
    invoices: number
  }
}

export function MigrationDialog({
  open,
  onOpenChange,
  onComplete,
  localCounts,
  cloudCounts,
}: MigrationDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedOption, setSelectedOption] = useState<MigrationOption | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)

  const hasLocalData =
    localCounts.projects > 0 ||
    localCounts.timeEntries > 0 ||
    localCounts.invoices > 0

  const hasCloudData =
    cloudCounts.projects > 0 ||
    cloudCounts.timeEntries > 0 ||
    cloudCounts.invoices > 0

  const handleMerge = async () => {
    setIsLoading(true)
    setSelectedOption("merge")
    setError(null)
    try {
      const localData = await exportAllData()

      const response = await fetch("/api/sync/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Migration failed: ${response.status}`)
      }

      const result = await response.json()

      if (result.mappings) {
        await updateLocalWithMappings(result.mappings)
      }

      onComplete("merge")
    } catch (err) {
      console.error("Merge error:", err)
      setError(err instanceof Error ? err.message : "Migration failed")
      setSelectedOption(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeepLocal = async () => {
    setIsLoading(true)
    setSelectedOption("keep-local")
    setError(null)
    try {
      const localData = await exportAllData()

      const response = await fetch("/api/sync/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Migration failed: ${response.status}`)
      }

      const result = await response.json()

      if (result.mappings) {
        await updateLocalWithMappings(result.mappings)
      }

      onComplete("keep-local")
    } catch (err) {
      console.error("Keep local error:", err)
      setError(err instanceof Error ? err.message : "Migration failed")
      setSelectedOption(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeepCloud = async () => {
    setIsLoading(true)
    setSelectedOption("keep-cloud")
    setError(null)
    try {
      await db.transaction(
        "rw",
        [db.projects, db.timeEntries, db.invoices, db.recentTasks, db.idMappings, db.syncQueue],
        async () => {
          await db.projects.clear()
          await db.timeEntries.clear()
          await db.invoices.clear()
          await db.recentTasks.clear()
          await db.idMappings.clear()
          await db.syncQueue.clear()
        }
      )

      onComplete("keep-cloud")
    } catch (err) {
      console.error("Keep cloud error:", err)
      setError(err instanceof Error ? err.message : "Failed to clear local data")
      setSelectedOption(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    onComplete("cancel")
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Existing Data Detected</AlertDialogTitle>
          <AlertDialogDescription>
            You have data on this device and in the cloud. How would you like to
            proceed?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <HardDrive className="size-4" />
              Local Data
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>{localCounts.projects} projects</p>
              <p>{localCounts.timeEntries} time entries</p>
              <p>{localCounts.invoices} invoices</p>
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Cloud className="size-4" />
              Cloud Data
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>{cloudCounts.projects} projects</p>
              <p>{cloudCounts.timeEntries} time entries</p>
              <p>{cloudCounts.invoices} invoices</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {hasLocalData && hasCloudData && (
            <Button
              variant="outline"
              className="w-full h-auto justify-start gap-3 px-4 py-3"
              onClick={handleMerge}
              disabled={isLoading}
            >
              <Merge className="size-5 shrink-0" />
              <div className="text-left">
                <div className="font-medium">Merge Both</div>
                <div className="text-xs text-muted-foreground">
                  Keep all data from both local and cloud
                </div>
              </div>
              {selectedOption === "merge" && isLoading && (
                <div className="ml-auto size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
            </Button>
          )}

          {hasLocalData && (
            <Button
              variant="outline"
              className="w-full h-auto justify-start gap-3 px-4 py-3"
              onClick={handleKeepLocal}
              disabled={isLoading}
            >
              <HardDrive className="size-5 shrink-0" />
              <div className="text-left">
                <div className="font-medium">Keep Local</div>
                <div className="text-xs text-muted-foreground">
                  Upload local data to cloud
                  {hasCloudData && ", replace cloud data"}
                </div>
              </div>
              {selectedOption === "keep-local" && isLoading && (
                <div className="ml-auto size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
            </Button>
          )}

          {hasCloudData && (
            <Button
              variant="outline"
              className="w-full h-auto justify-start gap-3 px-4 py-3"
              onClick={handleKeepCloud}
              disabled={isLoading}
            >
              <Cloud className="size-5 shrink-0" />
              <div className="text-left">
                <div className="font-medium">Keep Cloud</div>
                <div className="text-xs text-muted-foreground">
                  Download cloud data
                  {hasLocalData && ", discard local data"}
                </div>
              </div>
              {selectedOption === "keep-cloud" && isLoading && (
                <div className="ml-auto size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
            </Button>
          )}
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <AlertDialogFooter>
          <Button variant="ghost" onClick={handleCancel} disabled={isLoading}>
            <X className="mr-2 size-4" />
            Cancel (Stay as Guest)
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

async function updateLocalWithMappings(mappings: {
  projects: Record<string, string>
  timeEntries: Record<string, string>
  invoices: Record<string, string>
}) {
  await db.transaction(
    "rw",
    [db.projects, db.timeEntries, db.invoices, db.idMappings],
    async () => {
      for (const [localIdStr, cloudId] of Object.entries(mappings.projects)) {
        const localId = Number(localIdStr)
        await db.projects.where("id").equals(localId).modify({
          cloudId,
          syncStatus: "synced",
          syncVersion: 1,
        })
      }

      for (const [localIdStr, cloudId] of Object.entries(mappings.timeEntries)) {
        const localId = Number(localIdStr)
        await db.timeEntries.where("id").equals(localId).modify({
          cloudId,
          syncStatus: "synced",
          syncVersion: 1,
        })
      }

      for (const [localIdStr, cloudId] of Object.entries(mappings.invoices)) {
        const localId = Number(localIdStr)
        await db.invoices.where("id").equals(localId).modify({
          cloudId,
          syncStatus: "synced",
          syncVersion: 1,
        })
      }
    }
  )
}
