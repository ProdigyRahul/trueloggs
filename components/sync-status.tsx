"use client"

import { useSyncStatus } from "@/lib/sync/sync-provider"
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Check,
  AlertTriangle,
  WifiOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function SyncStatusIndicator() {
  const { isOnline, isSyncing, isEnabled, pendingCount, conflictsCount, syncNow } =
    useSyncStatus()

  if (!isEnabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<span className="contents" />}>
            <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
              <CloudOff className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Sign in to sync across devices</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (!isOnline) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<span className="contents" />}>
            <div className="flex items-center gap-1.5 rounded-md bg-yellow-100 px-2 py-1 text-xs text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500">
              <WifiOff className="size-3.5" />
              <span>Offline</span>
              {pendingCount > 0 && (
                <span className="font-medium">({pendingCount})</span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {pendingCount > 0
                ? `${pendingCount} changes saved locally. Will sync when online.`
                : "You're offline. Changes will sync when you reconnect."}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (conflictsCount > 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<span className="contents" />}>
            <div className="flex items-center gap-1.5 rounded-md bg-red-100 px-2 py-1 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-500">
              <AlertTriangle className="size-3.5" />
              <span>{conflictsCount} conflicts</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Some items have conflicts that need to be resolved.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (isSyncing) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<span className="contents" />}>
            <div className="flex items-center gap-1.5 rounded-md bg-blue-100 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-500">
              <RefreshCw className="size-3.5 animate-spin" />
              <span>Syncing{pendingCount > 0 ? ` (${pendingCount})` : "..."}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Syncing your data to the cloud...</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (pendingCount > 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<span className="contents" />}>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-blue-600 dark:text-blue-400"
              onClick={() => syncNow()}
            >
              <Cloud className="size-3.5" />
              <span>{pendingCount} pending</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Click to sync {pendingCount} pending changes</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className="contents" />}>
          <div className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-green-600 dark:text-green-500">
            <Check className="size-3.5" />
            <span>Synced</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>All changes synced to cloud</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
