"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { useCallback, useEffect, useState, useRef } from "react"
import { db } from "../index"
import type { TimerState, TimeEntry } from "../schema"
import { normalizeDate, formatTimerDisplay } from "../utils"

function calculateElapsedSeconds(state: TimerState | null | undefined): number {
  if (!state) return 0

  let elapsed = state.accumulatedSeconds

  if (state.isRunning && state.startedAt) {
    const startTime = new Date(state.startedAt).getTime()
    const now = Date.now()
    elapsed += Math.floor((now - startTime) / 1000)
  }

  return elapsed
}

export function useTimer() {
  const timerState = useLiveQuery(() => db.timerState.get("current"), [], null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (timerState?.isRunning) {
      const tick = () => setElapsedSeconds(calculateElapsedSeconds(timerState))
      tick()
      intervalRef.current = setInterval(tick, 1000)
    } else {
      const elapsed = calculateElapsedSeconds(timerState)
      if (elapsed !== elapsedSeconds) {
        queueMicrotask(() => setElapsedSeconds(elapsed))
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [timerState?.isRunning, timerState?.startedAt, timerState?.accumulatedSeconds, timerState, elapsedSeconds])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        queueMicrotask(() => setElapsedSeconds(calculateElapsedSeconds(timerState)))
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [timerState])

  const isRunning = timerState?.isRunning ?? false
  const isPaused = !isRunning && (timerState?.accumulatedSeconds ?? 0) > 0
  const projectId = timerState?.projectId ?? null
  const taskDescription = timerState?.taskDescription ?? ""

  const start = useCallback(async (newProjectId: number, newTaskDescription = ""): Promise<void> => {
    await db.timerState.put({
      id: "current",
      isRunning: true,
      projectId: newProjectId,
      taskDescription: newTaskDescription,
      startedAt: new Date(),
      accumulatedSeconds: 0,
    })
  }, [])

  const stop = useCallback(async (): Promise<TimeEntry | null> => {
    const state = await db.timerState.get("current")

    if (!state || !state.projectId) {
      return null
    }

    let totalSeconds = state.accumulatedSeconds
    if (state.isRunning && state.startedAt) {
      const startTime = new Date(state.startedAt).getTime()
      totalSeconds += Math.floor((Date.now() - startTime) / 1000)
    }

    const durationMinutes = Math.ceil(totalSeconds / 60)

    if (durationMinutes > 0) {
      const now = new Date()
      const entryId = await db.timeEntries.add({
        projectId: state.projectId,
        date: normalizeDate(now),
        duration: durationMinutes,
        notes: state.taskDescription || undefined,
        createdAt: now,
        updatedAt: now,
      })

      if (state.taskDescription) {
        await updateRecentTask(state.projectId, state.taskDescription)
      }

      await resetTimerState()

      return (await db.timeEntries.get(entryId)) ?? null
    }

    await resetTimerState()
    return null
  }, [])

  const pause = useCallback(async (): Promise<void> => {
    const state = await db.timerState.get("current")

    if (!state || !state.isRunning) return

    let accumulated = state.accumulatedSeconds
    if (state.startedAt) {
      const startTime = new Date(state.startedAt).getTime()
      accumulated += Math.floor((Date.now() - startTime) / 1000)
    }

    await db.timerState.update("current", {
      isRunning: false,
      startedAt: null,
      accumulatedSeconds: accumulated,
    })
  }, [])

  const resume = useCallback(async (): Promise<void> => {
    const state = await db.timerState.get("current")

    if (!state || state.isRunning || !state.projectId) return

    await db.timerState.update("current", {
      isRunning: true,
      startedAt: new Date(),
    })
  }, [])

  const discard = useCallback(async (): Promise<void> => {
    await resetTimerState()
  }, [])

  const setTaskDescription = useCallback(async (description: string): Promise<void> => {
    await db.timerState.update("current", {
      taskDescription: description,
    })
  }, [])

  const setProject = useCallback(async (newProjectId: number): Promise<void> => {
    await db.timerState.update("current", {
      projectId: newProjectId,
    })
  }, [])

  return {
    timerState,
    isLoading: timerState === null,
    isRunning,
    isPaused,
    elapsedSeconds,
    projectId,
    taskDescription,
    formattedTime: formatTimerDisplay(elapsedSeconds),
    canStart: !isRunning && !isPaused,
    start,
    stop,
    pause,
    resume,
    discard,
    setTaskDescription,
    setProject,
  }
}

async function resetTimerState(): Promise<void> {
  await db.timerState.put({
    id: "current",
    isRunning: false,
    projectId: null,
    taskDescription: "",
    startedAt: null,
    accumulatedSeconds: 0,
  })
}

async function updateRecentTask(projectId: number, taskDescription: string): Promise<void> {
  const existing = await db.recentTasks
    .where("[projectId+taskDescription]")
    .equals([projectId, taskDescription])
    .first()

  if (existing) {
    await db.recentTasks.update(existing.id!, {
      lastUsedAt: new Date(),
      usageCount: existing.usageCount + 1,
    })
  } else {
    await db.recentTasks.add({
      projectId,
      taskDescription,
      lastUsedAt: new Date(),
      usageCount: 1,
    })
  }

  const allTasks = await db.recentTasks
    .where("projectId")
    .equals(projectId)
    .reverse()
    .sortBy("lastUsedAt")

  if (allTasks.length > 10) {
    const toDelete = allTasks.slice(10).map((t) => t.id!)
    await db.recentTasks.bulkDelete(toDelete)
  }
}
