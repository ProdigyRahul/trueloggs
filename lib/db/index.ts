import Dexie, { type EntityTable } from "dexie"
import type {
  Project,
  TimeEntry,
  TimerState,
  Settings,
  RecentTask,
  Invoice,
  SyncQueueItem,
  IdMapping,
  LocalSyncMetadata,
} from "./schema"

class TrueLoggsDB extends Dexie {
  projects!: EntityTable<Project, "id">
  timeEntries!: EntityTable<TimeEntry, "id">
  timerState!: EntityTable<TimerState, "id">
  settings!: EntityTable<Settings, "id">
  recentTasks!: EntityTable<RecentTask, "id">
  invoices!: EntityTable<Invoice, "id">
  syncQueue!: EntityTable<SyncQueueItem, "id">
  idMappings!: EntityTable<IdMapping, "id">
  syncMetadata!: EntityTable<LocalSyncMetadata, "id">

  constructor() {
    super("TrueLoggsDB")

    this.version(3).stores({
      projects: "++id, name, status, clientName, createdAt",
      timeEntries: "++id, projectId, date, [projectId+date], createdAt",
      timerState: "id",
      settings: "id",
      recentTasks: "++id, projectId, taskDescription, lastUsedAt, [projectId+taskDescription]",
      invoices: "++id, &invoiceNumber, status, clientName, projectId, invoiceDate, createdAt",
    })

    this.version(4)
      .stores({
        projects: "++id, name, status, clientName, createdAt, cloudId, syncStatus",
        timeEntries: "++id, projectId, date, [projectId+date], createdAt, cloudId, syncStatus",
        timerState: "id",
        settings: "id",
        recentTasks: "++id, projectId, taskDescription, lastUsedAt, [projectId+taskDescription], cloudId",
        invoices: "++id, &invoiceNumber, status, clientName, projectId, invoiceDate, createdAt, cloudId",
        syncQueue: "++id, entityType, entityId, operation, createdAt",
        idMappings: "++id, [entityType+localId], [entityType+cloudId], userId",
        syncMetadata: "++id, entityType",
      })
      .upgrade((tx) => {
        return Promise.all([
          tx
            .table("projects")
            .toCollection()
            .modify((project) => {
              project.syncStatus = "pending"
              project.syncVersion = 1
            }),
          tx
            .table("timeEntries")
            .toCollection()
            .modify((entry) => {
              entry.syncStatus = "pending"
              entry.syncVersion = 1
            }),
          tx
            .table("recentTasks")
            .toCollection()
            .modify((task) => {
              task.syncVersion = 1
            }),
          tx
            .table("invoices")
            .toCollection()
            .modify((invoice) => {
              invoice.syncStatus = "pending"
              invoice.syncVersion = 1
            }),
        ])
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
      invoiceSettings: {
        invoiceCounter: 0,
        invoicePrefix: "INV",
        lastInvoiceYear: new Date().getFullYear(),
      },
      theme: "system",
    })
  } else if (!settingsExists.invoiceSettings) {
    await db.settings.update("settings", {
      invoiceSettings: {
        invoiceCounter: 0,
        invoicePrefix: "INV",
        lastInvoiceYear: new Date().getFullYear(),
      },
    })
  }
}

export type {
  Project,
  TimeEntry,
  TimerState,
  Settings,
  RecentTask,
  InvoiceSettings,
  Invoice,
  InvoiceStatus,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  StoredInvoiceLineItem,
  SyncStatus,
  SyncEntityType,
  SyncOperation,
  SyncQueueItem,
  IdMapping,
  LocalSyncMetadata,
  SyncableProject,
  SyncableTimeEntry,
  SyncableRecentTask,
  SyncableInvoice,
  ConflictInfo,
  MigrationOption,
  MigrationResult,
} from "./schema"
