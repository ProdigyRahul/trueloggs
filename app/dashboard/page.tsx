"use client"

import { useMemo } from "react"
import Link from "next/link"
import {
  useTodayEntries,
  useThisWeekEntries,
  useEntriesByDate,
  useProjects,
  useSettings,
} from "@/lib/db/hooks"
import {
  formatDuration,
  formatCurrency,
  calculateRevenue,
  getStartOfWeek,
  getEndOfWeek,
  getDaysInWeek,
  formatWeekday,
} from "@/lib/db/utils"
import type { DateRange } from "@/lib/db/schema"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatsCard } from "@/components/stats-card"
import { WeeklyChart } from "@/components/weekly-chart"
import { TimeEntryForm } from "@/components/time-entry-form"
import { Plus, Timer, Clock, Target, DollarSign } from "lucide-react"
import { useState } from "react"

export default function DashboardPage() {
  const [showEntryForm, setShowEntryForm] = useState(false)

  const { entries: todayEntries, totalMinutes: todayMinutes } = useTodayEntries()
  const { entries: weekEntries, totalMinutes: weekMinutes } = useThisWeekEntries()
  const { projects, projectsWithStats } = useProjects()
  const { settings } = useSettings()

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  )

  const now = useMemo(() => new Date(), [])
  const dateRange: DateRange = useMemo(
    () => ({
      start: getStartOfWeek(now, true),
      end: getEndOfWeek(now, true),
    }),
    [now]
  )
  const { entriesByDate } = useEntriesByDate(dateRange)

  const weekDays = useMemo(() => getDaysInWeek(now, true), [now])

  const weeklyChartData = useMemo(() => {
    return weekDays.map((day) => {
      const dateKey = day.toISOString().split("T")[0]
      const dayEntries = entriesByDate.get(dateKey) ?? []
      const totalMinutes = dayEntries.reduce((sum, e) => sum + e.duration, 0)
      return {
        day: formatWeekday(day),
        hours: totalMinutes / 60,
        date: day,
      }
    })
  }, [weekDays, entriesByDate])

  const weekRevenue = useMemo(() => {
    return weekEntries.reduce((sum, entry) => {
      const project = projectMap.get(entry.projectId)
      return sum + (project ? calculateRevenue(entry.duration, project.hourlyRate) : 0)
    }, 0)
  }, [weekEntries, projectMap])

  const targetHoursPerWeek = settings?.workSettings.targetHoursPerWeek ?? 40
  const weekProgress = Math.min((weekMinutes / 60 / targetHoursPerWeek) * 100, 100)

  const topProjects = useMemo(() => {
    return [...projectsWithStats]
      .filter((p) => p.status === "active" && p.totalMinutes > 0)
      .sort((a, b) => b.totalMinutes - a.totalMinutes)
      .slice(0, 5)
  }, [projectsWithStats])

  const greeting = useMemo(() => {
    const hour = now.getHours()
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }, [now])

  const dateString = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  const targetHoursPerDay = targetHoursPerWeek / 5

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{greeting}</h1>
          <p className="text-muted-foreground">{dateString}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowEntryForm(true)} className="gap-2">
            <Plus className="size-4" />
            Add Entry
          </Button>
          <Button render={<Link href="/dashboard/timer" />} className="gap-2">
            <Timer className="size-4" />
            Start Timer
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Today"
          value={formatDuration(todayMinutes)}
          subtitle={`${todayEntries.length} ${todayEntries.length === 1 ? "entry" : "entries"}`}
          icon={<Clock className="size-4" />}
        />
        <StatsCard
          title="This Week"
          value={formatDuration(weekMinutes)}
          subtitle={`${Math.round(weekProgress)}% of ${targetHoursPerWeek}h target`}
          icon={<Target className="size-4" />}
          progress={{ current: Math.round(weekMinutes / 60 * 10) / 10, target: targetHoursPerWeek }}
        />
        <StatsCard
          title="Week Revenue"
          value={formatCurrency(weekRevenue)}
          subtitle={`${weekEntries.length} billable ${weekEntries.length === 1 ? "entry" : "entries"}`}
          icon={<DollarSign className="size-4" />}
        />
      </div>

      <WeeklyChart data={weeklyChartData} targetHoursPerDay={targetHoursPerDay} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {topProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No project activity yet
              </p>
            ) : (
              <div className="space-y-3">
                {topProjects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="size-3 rounded-full shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="text-sm font-medium">{project.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(project.totalMinutes)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {todayEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No entries today
              </p>
            ) : (
              <div className="space-y-2">
                {todayEntries.slice(0, 5).map((entry) => (
                  <TodayEntryItem key={entry.id} entry={entry} projectMap={projectMap} />
                ))}
                {todayEntries.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    +{todayEntries.length - 5} more entries
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TimeEntryForm open={showEntryForm} onOpenChange={setShowEntryForm} />
    </div>
  )
}

interface TodayEntryItemProps {
  entry: { id?: number; projectId: number; duration: number; notes?: string }
  projectMap: Map<number | undefined, { id?: number; name: string; color: string; hourlyRate: number }>
}

function TodayEntryItem({ entry, projectMap }: TodayEntryItemProps) {
  const project = projectMap.get(entry.projectId)

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-2">
        {project && (
          <div
            className="size-3 rounded-full shrink-0"
            style={{ backgroundColor: project.color }}
          />
        )}
        <span className="text-sm truncate max-w-48">
          {entry.notes || project?.name || "Untitled"}
        </span>
      </div>
      <span className="text-sm text-muted-foreground">{formatDuration(entry.duration)}</span>
    </div>
  )
}
