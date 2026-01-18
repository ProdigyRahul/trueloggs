import { db, initializeDatabase } from "../index"

export interface ClearResult {
  success: boolean
  error?: string
}

export async function clearAllTimeEntries(): Promise<ClearResult> {
  try {
    await db.timeEntries.clear()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function clearAllProjects(): Promise<ClearResult> {
  try {
    await db.transaction("rw", [db.projects, db.timeEntries, db.recentTasks], async () => {
      await db.timeEntries.clear()
      await db.recentTasks.clear()
      await db.projects.clear()
    })
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function clearRecentTasks(): Promise<ClearResult> {
  try {
    await db.recentTasks.clear()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function resetTimerState(): Promise<ClearResult> {
  try {
    await db.timerState.put({
      id: "current",
      isRunning: false,
      projectId: null,
      taskDescription: "",
      startedAt: null,
      accumulatedSeconds: 0,
    })
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function clearAllData(): Promise<ClearResult> {
  try {
    await db.transaction(
      "rw",
      [db.projects, db.timeEntries, db.timerState, db.settings, db.recentTasks],
      async () => {
        await db.projects.clear()
        await db.timeEntries.clear()
        await db.recentTasks.clear()
        await db.timerState.clear()
        await db.settings.clear()
      }
    )
    await initializeDatabase()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
