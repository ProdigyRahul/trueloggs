export type ProjectStatus = "active" | "archived"

export type SyncStatus = "synced" | "pending" | "conflict"

export interface Project {
  id?: number
  name: string
  clientName?: string
  hourlyRate: number
  color: string
  status: ProjectStatus
  createdAt: Date
  updatedAt: Date
  cloudId?: string
  syncStatus?: SyncStatus
  syncVersion?: number
}

export interface TimeEntry {
  id?: number
  projectId: number
  date: Date
  duration: number
  notes?: string
  createdAt: Date
  updatedAt: Date
  cloudId?: string
  projectCloudId?: string
  syncStatus?: SyncStatus
  syncVersion?: number
}

export interface TimerState {
  id: "current"
  isRunning: boolean
  projectId: number | null
  taskDescription: string
  startedAt: Date | null
  accumulatedSeconds: number
}

export interface UserProfile {
  fullName: string
  email: string
  company: string
  phone: string
  address: string
  bio: string
}

export interface WorkSettings {
  targetHoursPerWeek: number
  defaultHourlyRate: number
  workDays: [boolean, boolean, boolean, boolean, boolean, boolean, boolean]
}

export interface InvoiceSettings {
  invoiceCounter: number
  invoicePrefix: string
  lastInvoiceYear: number
}

export type ThemePreference = "light" | "dark" | "system"

export interface Settings {
  id: "settings"
  profile: UserProfile
  workSettings: WorkSettings
  invoiceSettings: InvoiceSettings
  theme: ThemePreference
  cloudId?: string
  syncStatus?: SyncStatus
  syncVersion?: number
}

export interface RecentTask {
  id?: number
  projectId: number
  taskDescription: string
  lastUsedAt: Date
  usageCount: number
}

export type CreateProjectInput = Omit<Project, "id" | "createdAt" | "updatedAt">

export type UpdateProjectInput = Partial<Omit<Project, "id" | "createdAt" | "updatedAt">>

export type CreateTimeEntryInput = Omit<TimeEntry, "id" | "createdAt" | "updatedAt">

export type UpdateTimeEntryInput = Partial<Omit<TimeEntry, "id" | "createdAt" | "updatedAt">>

export interface ProjectWithStats extends Project {
  totalMinutes: number
  totalRevenue: number
  entryCount: number
}

export interface DateRange {
  start: Date
  end: Date
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "cancelled"

export interface StoredInvoiceLineItem {
  date: string
  description: string
  duration: number
  rate: number
  amount: number
}

export interface Invoice {
  id?: number
  invoiceNumber: string
  status: InvoiceStatus
  invoiceDate: string
  dueDate: string
  createdAt: string
  updatedAt: string
  paidAt?: string
  companyName: string
  companyEmail: string
  companyPhone: string
  companyAddress: string
  clientName: string
  clientEmail?: string
  projectName: string
  projectColor: string
  projectId?: number
  lineItems: StoredInvoiceLineItem[]
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  periodStart: string
  periodEnd: string
  notes?: string
  paymentTerms?: string
  cloudId?: string
  projectCloudId?: string
  syncStatus?: SyncStatus
  syncVersion?: number
}

export type CreateInvoiceInput = Omit<Invoice, "id" | "createdAt" | "updatedAt">
export type UpdateInvoiceInput = Partial<Pick<Invoice, "status" | "notes" | "paidAt">>

export interface ExportData {
  version: string
  exportedAt: Date
  projects: Project[]
  timeEntries: TimeEntry[]
  invoices: Invoice[]
  settings: Settings | null
  recentTasks: RecentTask[]
}

export type SyncEntityType =
  | "project"
  | "timeEntry"
  | "timerState"
  | "settings"
  | "recentTask"
  | "invoice"

export type SyncOperation = "create" | "update" | "delete"

export interface SyncQueueItem {
  id?: number
  entityType: SyncEntityType
  entityId: number
  cloudId?: string
  operation: SyncOperation
  payload: unknown
  createdAt: Date
  retryCount: number
  lastError?: string
}

export interface IdMapping {
  id?: number
  entityType: string
  localId: number
  cloudId: string
  userId: string
}

export interface LocalSyncMetadata {
  id?: number
  entityType: SyncEntityType
  lastSyncedAt: Date
  lastSyncVersion: number
}

export interface SyncableProject extends Project {
  cloudId?: string
  syncStatus: SyncStatus
  syncVersion: number
  lastSyncedAt?: Date
}

export interface SyncableTimeEntry extends TimeEntry {
  cloudId?: string
  projectCloudId?: string
  syncStatus: SyncStatus
  syncVersion: number
  lastSyncedAt?: Date
}

export interface SyncableRecentTask extends RecentTask {
  cloudId?: string
  projectCloudId?: string
  syncStatus: SyncStatus
  syncVersion: number
}

export interface SyncableInvoice extends Invoice {
  cloudId?: string
  projectCloudId?: string
  syncStatus: SyncStatus
  syncVersion: number
  lastSyncedAt?: Date
}

export interface ConflictInfo<T> {
  entityType: SyncEntityType
  entityId: string
  localVersion: T
  serverVersion: T
  localUpdatedAt: Date
  serverUpdatedAt: Date
}

export type MigrationOption = "merge" | "keep-local" | "keep-cloud" | "cancel"

export interface MigrationResult {
  action: "pushed" | "pulled" | "merged" | "conflict"
  merged: boolean
  options?: Array<{ id: MigrationOption; label: string }>
  mappings?: {
    projects: Record<number, string>
    timeEntries: Record<number, string>
    invoices: Record<number, string>
  }
  errors?: string[]
}
