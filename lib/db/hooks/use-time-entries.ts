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
    const entry: Omit<TimeEntry, "id"> = {
      ...input,
      date: normalizeDate(input.date),
      createdAt: now,
      updatedAt: now,
    }
    const id = await db.timeEntries.add(entry as TimeEntry)
    return id as number
  }, [])

  const updateEntry = useCallback(async (id: number, input: UpdateTimeEntryInput): Promise<void> => {
    const updates: Partial<TimeEntry> = {
      ...input,
      updatedAt: new Date(),
    }
    if (input.date) {
      updates.date = normalizeDate(input.date)
    }
    await db.timeEntries.update(id, updates)
  }, [])

  const deleteEntry = useCallback(async (id: number): Promise<void> => {
    await db.timeEntries.delete(id)
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
