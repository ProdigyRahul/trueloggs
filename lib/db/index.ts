import Dexie, { type EntityTable } from "dexie"
import type {
  Project,
  TimeEntry,
  TimerState,
  Settings,
  RecentTask,
} from "./schema"

class TrueLoggsDB extends Dexie {
  projects!: EntityTable<Project, "id">
  timeEntries!: EntityTable<TimeEntry, "id">
  timerState!: EntityTable<TimerState, "id">
  settings!: EntityTable<Settings, "id">
  recentTasks!: EntityTable<RecentTask, "id">

  constructor() {
    super("TrueLoggsDB")

    this.version(1).stores({
      projects: "++id, name, status, clientName, createdAt",
      timeEntries: "++id, projectId, date, [projectId+date], createdAt",
      timerState: "id",
      settings: "id",
      recentTasks: "++id, projectId, taskDescription, lastUsedAt, [projectId+taskDescription]",
    })
  }
}

export const db = new TrueLoggsDB()

export async function initializeDatabase(): Promise<void> {
  const timerExists = await db.timerState.get("current")
  if (!timerExists) {
    await db.timerState.put({
      id: "current",
      isRunning: false,
      projectId: null,
      taskDescription: "",
      startedAt: null,
      accumulatedSeconds: 0,
    })
  }

  const settingsExists = await db.settings.get("settings")
  if (!settingsExists) {
    await db.settings.put({
      id: "settings",
      profile: {
        fullName: "",
        email: "",
        company: "",
        phone: "",
        address: "",
        bio: "",
      },
      workSettings: {
        targetHoursPerWeek: 40,
        defaultHourlyRate: 50,
        workDays: [false, true, true, true, true, true, false],
      },
      theme: "system",
    })
  }
}

export type { Project, TimeEntry, TimerState, Settings, RecentTask } from "./schema"
