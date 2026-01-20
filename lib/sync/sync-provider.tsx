"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { syncEngine, type SyncStatus, type SyncResult } from "./sync-engine"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"

interface SyncContextValue {
  isOnline: boolean
  isSyncing: boolean
  isEnabled: boolean
  pendingCount: number
  conflictsCount: number
  syncNow: () => Promise<SyncResult>
  setUserId: (userId: string | null) => void
}

const SyncContext = createContext<SyncContextValue | null>(null)

export function useSyncStatus() {
  const context = useContext(SyncContext)
  if (!context) {
    throw new Error("useSyncStatus must be used within SyncProvider")
  }
  return context
}

interface SyncProviderProps {
  children: ReactNode
  userId?: string | null
}

export function SyncProvider({ children, userId = null }: SyncProviderProps) {
  const [status, setStatus] = useState<SyncStatus>(() => syncEngine.getStatus())

  const pendingCount = useLiveQuery(() => db.syncQueue.count(), [], 0)

  const conflictsCount = useLiveQuery(
    async () => {
      const projects = await db.projects
        .filter((p) => p.syncStatus === "conflict")
        .count()
      const entries = await db.timeEntries
        .filter((e) => e.syncStatus === "conflict")
        .count()
      const invoices = await db.invoices
        .filter((i) => i.syncStatus === "conflict")
        .count()
      return projects + entries + invoices
    },
    [],
    0
  )

  useEffect(() => {
    syncEngine.setUser(userId ?? null)
  }, [userId])

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe(setStatus)
    return unsubscribe
  }, [])

  const syncNow = useCallback(() => syncEngine.syncNow(), [])

  const setUserId = useCallback((id: string | null) => {
    syncEngine.setUser(id)
  }, [])

  const value: SyncContextValue = {
    isOnline: status.isOnline,
    isSyncing: status.isSyncing,
    isEnabled: !!status.userId,
    pendingCount: pendingCount ?? 0,
    conflictsCount: conflictsCount ?? 0,
    syncNow,
    setUserId,
  }

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}
