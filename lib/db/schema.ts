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

export type ThemePreference = "light" | "dark" | "system"

export interface Settings {
  id: "settings"
  profile: UserProfile
  workSettings: WorkSettings
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

export interface ExportData {
  version: string
  exportedAt: Date
  projects: Project[]
  timeEntries: TimeEntry[]
  settings: Settings | null
  recentTasks: RecentTask[]
}
