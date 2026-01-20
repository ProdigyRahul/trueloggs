"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { useCallback, useMemo } from "react"
import { db } from "../index"
import type {
  TimeEntry,
  CreateTimeEntryInput,
  UpdateTimeEntryInput,
  DateRange,
} from "../schema"
import { normalizeDate, getStartOfWeek, getEndOfWeek, getStartOfDay, getEndOfDay } from "../utils"
import { syncEngine } from "@/lib/sync/sync-engine"

interface UseTimeEntriesOptions {
  projectId?: number
  dateRange?: DateRange
}

export function useTimeEntries(options: UseTimeEntriesOptions = {}) {
  const { projectId, dateRange } = options

  const entries = useLiveQuery(
    async () => {
      if (projectId !== undefined && dateRange) {
        return db.timeEntries
          .where("[projectId+date]")
          .between(
            [projectId, normalizeDate(dateRange.start)],
            [projectId, normalizeDate(dateRange.end)],
            true,
            true
          )
          .toArray()
      }

      if (projectId !== undefined) {
        return db.timeEntries.where("projectId").equals(projectId).toArray()
      }

      if (dateRange) {
        return db.timeEntries
          .where("date")
          .between(normalizeDate(dateRange.start), normalizeDate(dateRange.end), true, true)
          .toArray()
      }

      return db.timeEntries.toArray()
    },
    [projectId, dateRange?.start?.getTime(), dateRange?.end?.getTime()],
    []
  )

  const totalMinutes = useMemo(() => {
    return entries?.reduce((sum, entry) => sum + entry.duration, 0) ?? 0
  }, [entries])

  const createEntry = useCallback(async (input: CreateTimeEntryInput): Promise<number> => {
    const now = new Date()
    const isAuthenticated = syncEngine.isEnabled()

    let projectCloudId: string | undefined
    if (isAuthenticated) {
      const project = await db.projects.get(input.projectId)
      projectCloudId = project?.cloudId
    }

    const entry: TimeEntry = {
      ...input,
      date: normalizeDate(input.date),
      createdAt: now,
      updatedAt: now,
      ...(isAuthenticated && {
        syncStatus: "pending" as const,
        syncVersion: 1,
        projectCloudId,
      }),
    }

    const id = await db.timeEntries.add(entry)

    if (isAuthenticated) {
      await syncEngine.queueChange("timeEntry", id as number, "create", {
        ...entry,
        projectCloudId,
      })
    }

    return id as number
  }, [])

  const updateEntry = useCallback(async (id: number, input: UpdateTimeEntryInput): Promise<void> => {
    const isAuthenticated = syncEngine.isEnabled()
    const existing = await db.timeEntries.get(id)

    const updates: Partial<TimeEntry> = {
      ...input,
      updatedAt: new Date(),
    }
    if (input.date) {
      updates.date = normalizeDate(input.date)
    }

    if (isAuthenticated) {
      updates.syncStatus = "pending"
      updates.syncVersion = (existing?.syncVersion || 0) + 1
    }

    await db.timeEntries.update(id, updates)

    if (isAuthenticated && existing) {
      await syncEngine.queueChange("timeEntry", id, "update", updates, existing.cloudId)
    }
  }, [])

  const deleteEntry = useCallback(async (id: number): Promise<void> => {
    const isAuthenticated = syncEngine.isEnabled()
    const existing = await db.timeEntries.get(id)

    await db.timeEntries.delete(id)

    if (isAuthenticated && existing?.cloudId) {
      await syncEngine.queueChange("timeEntry", id, "delete", { id }, existing.cloudId)
    }
  }, [])

  const getEntry = useCallback(async (id: number): Promise<TimeEntry | undefined> => {
    return db.timeEntries.get(id)
  }, [])

  return {
    entries: entries ?? [],
    isLoading: entries === undefined,
    totalMinutes,
    createEntry,
    updateEntry,
    deleteEntry,
    getEntry,
  }
}

export function useTodayEntries(projectId?: number) {
  const now = new Date()
  const dateRange: DateRange = {
    start: getStartOfDay(now),
    end: getEndOfDay(now),
  }
  return useTimeEntries({ projectId, dateRange })
}

export function useThisWeekEntries(projectId?: number) {
  const now = new Date()
  const dateRange: DateRange = {
    start: getStartOfWeek(now, true),
    end: getEndOfWeek(now, true),
  }
  return useTimeEntries({ projectId, dateRange })
}

export function useEntriesByDate(dateRange: DateRange) {
  const { entries, isLoading } = useTimeEntries({ dateRange })

  const entriesByDate = useMemo(() => {
    const grouped = new Map<string, TimeEntry[]>()
    entries.forEach((entry) => {
      const dateKey = entry.date.toISOString().split("T")[0]
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, [])
      }
      grouped.get(dateKey)!.push(entry)
    })
    return grouped
  }, [entries])

  return { entriesByDate, entries, isLoading }
}
