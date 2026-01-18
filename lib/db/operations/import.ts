import { db } from "../index"
import type { ExportData, Project, TimeEntry, RecentTask } from "../schema"

export interface ImportResult {
  success: boolean
  projectsImported: number
  timeEntriesImported: number
  recentTasksImported: number
  errors: string[]
}

function validateExportData(data: unknown): data is ExportData {
  if (!data || typeof data !== "object") return false
  const d = data as Record<string, unknown>
  return (
    typeof d.version === "string" &&
    Array.isArray(d.projects) &&
    Array.isArray(d.timeEntries) &&
    Array.isArray(d.recentTasks)
  )
}

export async function importData(
  jsonString: string,
  options: { replace?: boolean } = {}
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    projectsImported: 0,
    timeEntriesImported: 0,
    recentTasksImported: 0,
    errors: [],
  }

  try {
    const data = JSON.parse(jsonString)

    if (!validateExportData(data)) {
      result.errors.push("Invalid export data format")
      return result
    }

    await db.transaction("rw", [db.projects, db.timeEntries, db.recentTasks, db.settings], async () => {
      if (options.replace) {
        await db.projects.clear()
        await db.timeEntries.clear()
        await db.recentTasks.clear()
      }

      const projectIdMap = new Map<number, number>()

      for (const project of data.projects) {
        const { id: oldId, ...projectData } = project
        const newProject: Omit<Project, "id"> = {
          ...projectData,
          createdAt: new Date(projectData.createdAt),
          updatedAt: new Date(projectData.updatedAt),
        }
        const newId = await db.projects.add(newProject as Project) as number
        if (oldId !== undefined) {
          projectIdMap.set(oldId, newId)
        }
        result.projectsImported++
      }

      for (const entry of data.timeEntries) {
        const newProjectId = projectIdMap.get(entry.projectId)
        if (newProjectId === undefined) {
          result.errors.push(`Skipping time entry: project ID ${entry.projectId} not found`)
          continue
        }
        const newEntry: Omit<TimeEntry, "id"> = {
          projectId: newProjectId,
          duration: entry.duration,
          notes: entry.notes,
          date: new Date(entry.date),
          createdAt: new Date(entry.createdAt),
          updatedAt: new Date(entry.updatedAt),
        }
        await db.timeEntries.add(newEntry as TimeEntry)
        result.timeEntriesImported++
      }

      for (const task of data.recentTasks) {
        const newProjectId = projectIdMap.get(task.projectId)
        if (newProjectId === undefined) {
          continue
        }
        const newTask: Omit<RecentTask, "id"> = {
          projectId: newProjectId,
          taskDescription: task.taskDescription,
          usageCount: task.usageCount,
          lastUsedAt: new Date(task.lastUsedAt),
        }
        await db.recentTasks.add(newTask as RecentTask)
        result.recentTasksImported++
      }

      if (options.replace && data.settings) {
        await db.settings.put({
          ...data.settings,
          id: "settings",
        })
      }
    })

    result.success = true
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : "Unknown error during import")
  }

  return result
}

export async function importFromFile(
  file: File,
  options: { replace?: boolean } = {}
): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const content = e.target?.result as string
      const result = await importData(content, options)
      resolve(result)
    }
    reader.onerror = () => {
      resolve({
        success: false,
        projectsImported: 0,
        timeEntriesImported: 0,
        recentTasksImported: 0,
        errors: ["Failed to read file"],
      })
    }
    reader.readAsText(file)
  })
}
