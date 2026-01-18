"use client"

import { useState, useMemo } from "react"
import { useEntriesByDate, useProjects } from "@/lib/db/hooks"
import {
  getDaysInWeek,
  getStartOfWeek,
  getEndOfWeek,
  formatWeekday,
  formatDuration,
  isToday,
} from "@/lib/db/utils"
import type { TimeEntry, DateRange } from "@/lib/db/schema"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TimeEntryForm } from "@/components/time-entry-form"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showEntryForm, setShowEntryForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)

  const dateRange: DateRange = useMemo(
    () => ({
      start: getStartOfWeek(currentDate, true),
      end: getEndOfWeek(currentDate, true),
    }),
    [currentDate]
  )

  const { entriesByDate, entries, isLoading } = useEntriesByDate(dateRange)
  const { projects } = useProjects()
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])

  const days = useMemo(() => getDaysInWeek(currentDate, true), [currentDate])

  const weekTotal = useMemo(() => {
    return entries.reduce((sum, entry) => sum + entry.duration, 0)
  }, [entries])

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentDate(newDate)
  }

  const goToNextWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const handleEntryClick = (entry: TimeEntry) => {
    setEditingEntry(entry)
    setShowEntryForm(true)
  }

  const weekLabel = useMemo(() => {
    const start = days[0]
    const end = days[6]
    const startMonth = start.toLocaleDateString("en-US", { month: "short" })
    const endMonth = end.toLocaleDateString("en-US", { month: "short" })
    const year = end.getFullYear()

    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${year}`
    }
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${year}`
  }, [days])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon-sm" onClick={goToPreviousWeek}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-medium min-w-48 text-center">{weekLabel}</span>
          <Button variant="outline" size="icon-sm" onClick={goToNextWeek}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-96 animate-pulse bg-muted" />
          ) : (
            <div className="grid grid-cols-7 divide-x">
              {days.map((day) => {
                const dateKey = day.toISOString().split("T")[0]
                const dayEntries = entriesByDate.get(dateKey) ?? []
                const dayTotal = dayEntries.reduce((sum, e) => sum + e.duration, 0)
                const isTodayDate = isToday(day)

                return (
                  <div
                    key={dateKey}
                    className={cn(
                      "min-h-48 p-2 flex flex-col",
                      isTodayDate && "bg-primary/5"
                    )}
                  >
                    <div className="text-center mb-2">
                      <div className="text-xs text-muted-foreground">
                        {formatWeekday(day)}
                      </div>
                      <div
                        className={cn(
                          "text-sm font-medium",
                          isTodayDate &&
                            "bg-primary text-primary-foreground rounded-full size-7 flex items-center justify-center mx-auto"
                        )}
                      >
                        {day.getDate()}
                      </div>
                    </div>

                    <div className="flex-1 space-y-1 overflow-auto">
                      {dayEntries.map((entry) => (
                        <CalendarEntry
                          key={entry.id}
                          entry={entry}
                          projectMap={projectMap}
                          onClick={() => handleEntryClick(entry)}
                        />
                      ))}
                    </div>

                    {dayTotal > 0 && (
                      <div className="mt-2 pt-2 border-t text-xs text-center text-muted-foreground">
                        {formatDuration(dayTotal)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t justify-center">
          <span className="text-sm font-medium">
            Week Total: {formatDuration(weekTotal)}
          </span>
        </CardFooter>
      </Card>

      <TimeEntryForm
        open={showEntryForm}
        onOpenChange={(open) => {
          setShowEntryForm(open)
          if (!open) setEditingEntry(null)
        }}
        entry={editingEntry}
      />
    </div>
  )
}

interface CalendarEntryProps {
  entry: TimeEntry
  projectMap: Map<number | undefined, { id?: number; name: string; color: string; hourlyRate: number }>
  onClick: () => void
}

function CalendarEntry({ entry, projectMap, onClick }: CalendarEntryProps) {
  const project = projectMap.get(entry.projectId)

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded px-2 py-1 text-xs text-white transition-opacity hover:opacity-80"
      style={{ backgroundColor: project?.color ?? "#6366F1" }}
    >
      <div className="truncate font-medium">
        {entry.notes || project?.name || "Untitled"}
      </div>
      <div className="opacity-80">{formatDuration(entry.duration)}</div>
    </button>
  )
}
