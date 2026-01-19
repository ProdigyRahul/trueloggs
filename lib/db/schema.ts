export type ProjectStatus = "active" | "archived"

export interface Project {
  id?: number
  name: string
  clientName?: string
  hourlyRate: number
  color: string
  status: ProjectStatus
  createdAt: Date
  updatedAt: Date
}

export interface TimeEntry {
  id?: number
  projectId: number
  date: Date
  duration: number
  notes?: string
  createdAt: Date
  updatedAt: Date
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

// Invoice status enum
export type InvoiceStatus = "draft" | "sent" | "paid" | "cancelled"

// Stored version of InvoiceLineItem (dates as ISO strings for IndexedDB)
export interface StoredInvoiceLineItem {
  date: string // ISO string
  description: string
  duration: number // minutes
  rate: number
  amount: number
}

// Main Invoice entity - stores COMPLETE SNAPSHOT of invoice data
export interface Invoice {
  id?: number

  // Identification
  invoiceNumber: string
  status: InvoiceStatus

  // Dates (ISO strings for IndexedDB compatibility)
  invoiceDate: string
  dueDate: string
  createdAt: string
  updatedAt: string
  paidAt?: string

  // Snapshot of company info at invoice time
  companyName: string
  companyEmail: string
  companyPhone: string
  companyAddress: string

  // Snapshot of client/project info
  clientName: string
  clientEmail?: string
  projectName: string
  projectColor: string

  // Reference to original project (may be null if deleted)
  projectId?: number

  // Financial data
  lineItems: StoredInvoiceLineItem[] // Embedded array
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number

  // Period covered
  periodStart: string
  periodEnd: string

  // Additional
  notes?: string
  paymentTerms?: string
}

// CRUD input types
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
