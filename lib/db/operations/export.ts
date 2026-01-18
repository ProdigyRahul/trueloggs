import { db } from "../index"
import type { ExportData, TimeEntry, Project } from "../schema"
import { formatDate, formatDuration, calculateRevenue } from "../utils"

const EXPORT_VERSION = "1.0.0"

export async function exportAllData(): Promise<ExportData> {
  const [projects, timeEntries, settings, recentTasks] = await Promise.all([
    db.projects.toArray(),
    db.timeEntries.toArray(),
    db.settings.get("settings"),
    db.recentTasks.toArray(),
  ])

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date(),
    projects,
    timeEntries,
    settings: settings ?? null,
    recentTasks,
  }
}

export async function downloadJsonExport(filename?: string): Promise<void> {
  const data = await exportAllData()
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)

  const defaultFilename = `trueloggs-export-${new Date().toISOString().split("T")[0]}.json`

  const a = document.createElement("a")
  a.href = url
  a.download = filename ?? defaultFilename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function downloadCsvExport(filename?: string): Promise<void> {
  const [timeEntries, projects] = await Promise.all([
    db.timeEntries.toArray(),
    db.projects.toArray(),
  ])

  const projectMap = new Map(projects.map((p) => [p.id, p]))

  const headers = ["Date", "Project", "Client", "Duration (minutes)", "Duration", "Hourly Rate", "Amount", "Notes"]
  const rows = timeEntries.map((entry) => {
    const project = projectMap.get(entry.projectId)
    const amount = project ? calculateRevenue(entry.duration, project.hourlyRate) : 0
    return [
      formatDate(entry.date),
      project?.name ?? "Unknown",
      project?.clientName ?? "",
      entry.duration.toString(),
      formatDuration(entry.duration),
      project?.hourlyRate?.toString() ?? "",
      amount.toFixed(2),
      entry.notes ?? "",
    ]
  })

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")),
  ].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)

  const defaultFilename = `trueloggs-entries-${new Date().toISOString().split("T")[0]}.csv`

  const a = document.createElement("a")
  a.href = url
  a.download = filename ?? defaultFilename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

interface EnrichedTimeEntry extends TimeEntry {
  project?: Project
}

export async function exportTimeEntriesRange(
  startDate: Date,
  endDate: Date
): Promise<EnrichedTimeEntry[]> {
  const entries = await db.timeEntries
    .where("date")
    .between(startDate, endDate, true, true)
    .toArray()

  const projectIds = [...new Set(entries.map((e) => e.projectId))]
  const projects = await db.projects.bulkGet(projectIds)
  const projectMap = new Map(projects.filter(Boolean).map((p) => [p!.id, p!]))

  return entries.map((entry) => ({
    ...entry,
    project: projectMap.get(entry.projectId),
  }))
}
