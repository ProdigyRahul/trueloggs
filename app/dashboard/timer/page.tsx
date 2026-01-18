"use client"

import { useState, useCallback } from "react"
import { useTimer, useTodayEntries, useThisWeekEntries, useProject } from "@/lib/db/hooks"
import { formatDuration } from "@/lib/db/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProjectSelector } from "@/components/project-selector"
import { TaskInput } from "@/components/task-input"
import { TimerDisplay } from "@/components/timer-display"
import { TimerControls } from "@/components/timer-controls"
import { StatsCard } from "@/components/stats-card"
import { Clock, Calendar } from "lucide-react"

export default function TimerPage() {
  const {
    isRunning,
    isPaused,
    projectId,
    taskDescription,
    formattedTime,
    canStart,
    isLoading,
    start,
    stop,
    pause,
    resume,
    discard,
    setTaskDescription,
    setProject,
  } = useTimer()

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [localTaskDescription, setLocalTaskDescription] = useState("")

  const effectiveProjectId = projectId ?? selectedProjectId
  const effectiveTaskDescription = (isRunning || isPaused) ? taskDescription : localTaskDescription
  const { project } = useProject(effectiveProjectId ?? undefined)

  const { entries: todayEntries, totalMinutes: todayMinutes } = useTodayEntries()
  const { entries: weekEntries, totalMinutes: weekMinutes } = useThisWeekEntries()

  const handleProjectChange = useCallback((id: number | null) => {
    setSelectedProjectId(id)
    if (id && (isRunning || isPaused)) {
      setProject(id)
    }
  }, [isRunning, isPaused, setProject])

  const handleTaskChange = useCallback((description: string) => {
    setLocalTaskDescription(description)
    if (isRunning || isPaused) {
      setTaskDescription(description)
    }
  }, [isRunning, isPaused, setTaskDescription])

  const handleStart = useCallback(async () => {
    if (!effectiveProjectId) return
    await start(effectiveProjectId, localTaskDescription)
  }, [effectiveProjectId, localTaskDescription, start])

  const handleStop = useCallback(async () => {
    await stop()
    setLocalTaskDescription("")
    setSelectedProjectId(null)
  }, [stop])

  const status = isRunning ? "working" : isPaused ? "paused" : "idle"

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Timer</h1>
        <div className="animate-pulse">
          <div className="h-64 bg-muted rounded-xl max-w-lg mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Timer</h1>

      <Card className="max-w-lg mx-auto">
        <CardContent className="flex flex-col items-center gap-6 p-6">
          <div className="w-full space-y-2">
            <label className="text-sm font-medium">Project</label>
            <ProjectSelector
              value={effectiveProjectId}
              onValueChange={handleProjectChange}
              disabled={isRunning}
              placeholder="Select a project to start"
            />
          </div>

          <div className="w-full space-y-2">
            <label className="text-sm font-medium">What are you working on?</label>
            <TaskInput
              projectId={effectiveProjectId}
              value={effectiveTaskDescription}
              onValueChange={handleTaskChange}
              disabled={!effectiveProjectId}
              placeholder={effectiveProjectId ? "Describe your task (optional)" : "Select a project first"}
            />
          </div>

          <TimerDisplay
            time={formattedTime}
            isRunning={isRunning}
            isPaused={isPaused}
            size="large"
          />

          <Badge
            variant={status === "working" ? "default" : status === "paused" ? "secondary" : "outline"}
            className="text-sm"
          >
            {status === "working" ? "Working" : status === "paused" ? "Paused" : "Idle"}
          </Badge>

          {project && (isRunning || isPaused) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div
                className="size-3 rounded-full"
                style={{ backgroundColor: project.color }}
              />
              <span>{project.name}</span>
              <span>&bull;</span>
              <span>${project.hourlyRate}/hr</span>
            </div>
          )}

          <TimerControls
            isRunning={isRunning}
            isPaused={isPaused}
            canStart={canStart}
            onStart={handleStart}
            onStop={handleStop}
            onPause={pause}
            onResume={resume}
            onDiscard={discard}
            disabled={!effectiveProjectId && canStart}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 max-w-lg mx-auto">
        <StatsCard
          title="Today"
          value={formatDuration(todayMinutes)}
          subtitle={`${todayEntries.length} ${todayEntries.length === 1 ? "entry" : "entries"}`}
          icon={<Clock className="size-4" />}
        />
        <StatsCard
          title="This Week"
          value={formatDuration(weekMinutes)}
          subtitle={`${weekEntries.length} ${weekEntries.length === 1 ? "entry" : "entries"}`}
          icon={<Calendar className="size-4" />}
        />
      </div>

      {todayEntries.length > 0 && (
        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Entries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayEntries.slice(0, 5).map((entry) => (
              <TodayEntryItem key={entry.id} entry={entry} />
            ))}
            {todayEntries.length > 5 && (
              <p className="text-sm text-muted-foreground text-center pt-2">
                +{todayEntries.length - 5} more entries
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function TodayEntryItem({ entry }: { entry: { id?: number; projectId: number; duration: number; notes?: string } }) {
  const { project } = useProject(entry.projectId)

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-2">
        {project && (
          <div
            className="size-3 rounded-full shrink-0"
            style={{ backgroundColor: project.color }}
          />
        )}
        <span className="text-sm">{entry.notes || project?.name || "Untitled"}</span>
      </div>
      <span className="text-sm text-muted-foreground">{formatDuration(entry.duration)}</span>
    </div>
  )
}
