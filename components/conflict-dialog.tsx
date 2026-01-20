"use client"

import { useState } from "react"
import { AlertTriangle, HardDrive, Cloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { ConflictInfo } from "@/lib/db/schema"

interface ConflictDialogProps<T> {
  open: boolean
  onOpenChange: (open: boolean) => void
  conflict: ConflictInfo<T> | null
  onResolve: (choice: "local" | "server" | "both") => Promise<void>
  renderItem?: (item: T) => React.ReactNode
}

export function ConflictDialog<T>({
  open,
  onOpenChange,
  conflict,
  onResolve,
  renderItem,
}: ConflictDialogProps<T>) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedChoice, setSelectedChoice] = useState<
    "local" | "server" | "both" | null
  >(null)

  if (!conflict) return null

  const handleResolve = async (choice: "local" | "server" | "both") => {
    setIsLoading(true)
    setSelectedChoice(choice)
    try {
      await onResolve(choice)
      onOpenChange(false)
    } catch (error) {
      console.error("Conflict resolution error:", error)
    } finally {
      setIsLoading(false)
      setSelectedChoice(null)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-500">
            <AlertTriangle />
          </AlertDialogMedia>
          <AlertDialogTitle>Sync Conflict</AlertDialogTitle>
          <AlertDialogDescription>
            This item was modified on another device. Choose which version to
            keep.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <HardDrive className="size-4" />
                Local
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDate(conflict.localUpdatedAt)}
              </span>
            </div>
            <div className="text-sm">
              {renderItem ? (
                renderItem(conflict.localVersion)
              ) : (
                <pre className="max-h-32 overflow-auto text-xs">
                  {JSON.stringify(conflict.localVersion, null, 2)}
                </pre>
              )}
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Cloud className="size-4" />
                Cloud
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDate(conflict.serverUpdatedAt)}
              </span>
            </div>
            <div className="text-sm">
              {renderItem ? (
                renderItem(conflict.serverVersion)
              ) : (
                <pre className="max-h-32 overflow-auto text-xs">
                  {JSON.stringify(conflict.serverVersion, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => handleResolve("local")}
            disabled={isLoading}
          >
            <HardDrive className="mr-2 size-4" />
            Keep Local
            {selectedChoice === "local" && isLoading && (
              <span className="ml-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleResolve("server")}
            disabled={isLoading}
          >
            <Cloud className="mr-2 size-4" />
            Keep Cloud
            {selectedChoice === "server" && isLoading && (
              <span className="ml-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
          </Button>
          <Button onClick={() => handleResolve("both")} disabled={isLoading}>
            Keep Both
            {selectedChoice === "both" && isLoading && (
              <span className="ml-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
