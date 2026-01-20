"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { useCallback } from "react"
import { db } from "../index"
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectWithStats,
  ProjectStatus,
} from "../schema"
import { generateProjectColor, calculateRevenue } from "../utils"
import { syncEngine } from "@/lib/sync/sync-engine"

export function useProjects(status?: ProjectStatus) {
  const projects = useLiveQuery(
    async () => {
      if (status) {
        return db.projects.where("status").equals(status).toArray()
      }
      return db.projects.toArray()
    },
    [status],
    []
  )

  const projectsWithStats = useLiveQuery(
    async () => {
      let projectList: Project[]
      if (status) {
        projectList = await db.projects.where("status").equals(status).toArray()
      } else {
        projectList = await db.projects.toArray()
      }

      const summaries: ProjectWithStats[] = await Promise.all(
        projectList.map(async (project) => {
          const entries = await db.timeEntries
            .where("projectId")
            .equals(project.id!)
            .toArray()
          const totalMinutes = entries.reduce((sum, entry) => sum + entry.duration, 0)
          const totalRevenue = calculateRevenue(totalMinutes, project.hourlyRate)
          return {
            ...project,
            totalMinutes,
            totalRevenue,
            entryCount: entries.length,
          }
        })
      )
      return summaries
    },
    [status],
    []
  )

  const createProject = useCallback(async (input: CreateProjectInput): Promise<number> => {
    const now = new Date()
    const isAuthenticated = syncEngine.isEnabled()

    const project = {
      ...input,
      color: input.color || generateProjectColor(),
      createdAt: now,
      updatedAt: now,
      ...(isAuthenticated && {
        syncStatus: "pending" as const,
        syncVersion: 1,
      }),
    }

    const id = await db.projects.add(project as Project)

    if (isAuthenticated) {
      await syncEngine.queueChange("project", id as number, "create", project)
    }

    return id as number
  }, [])

  const updateProject = useCallback(async (id: number, input: UpdateProjectInput): Promise<void> => {
    const isAuthenticated = syncEngine.isEnabled()
    const existing = await db.projects.get(id)

    const updates = {
      ...input,
      updatedAt: new Date(),
      ...(isAuthenticated && {
        syncStatus: "pending" as const,
        syncVersion: (existing?.syncVersion || 0) + 1,
      }),
    }

    await db.projects.update(id, updates)

    if (isAuthenticated && existing) {
      await syncEngine.queueChange("project", id, "update", updates, existing.cloudId)
    }
  }, [])

  const deleteProject = useCallback(async (id: number): Promise<void> => {
    const isAuthenticated = syncEngine.isEnabled()
    const existing = await db.projects.get(id)

    await db.transaction("rw", [db.projects, db.timeEntries, db.recentTasks], async () => {
      await db.timeEntries.where("projectId").equals(id).delete()
      await db.recentTasks.where("projectId").equals(id).delete()
      await db.projects.delete(id)
    })

    if (isAuthenticated && existing?.cloudId) {
      await syncEngine.queueChange("project", id, "delete", { id }, existing.cloudId)
    }
  }, [])

  const archiveProject = useCallback(async (id: number): Promise<void> => {
    const isAuthenticated = syncEngine.isEnabled()
    const existing = await db.projects.get(id)

    const updates = {
      status: "archived" as const,
      updatedAt: new Date(),
      ...(isAuthenticated && {
        syncStatus: "pending" as const,
        syncVersion: (existing?.syncVersion || 0) + 1,
      }),
    }

    await db.projects.update(id, updates)

    if (isAuthenticated && existing) {
      await syncEngine.queueChange("project", id, "update", updates, existing.cloudId)
    }
  }, [])

  const unarchiveProject = useCallback(async (id: number): Promise<void> => {
    const isAuthenticated = syncEngine.isEnabled()
    const existing = await db.projects.get(id)

    const updates = {
      status: "active" as const,
      updatedAt: new Date(),
      ...(isAuthenticated && {
        syncStatus: "pending" as const,
        syncVersion: (existing?.syncVersion || 0) + 1,
      }),
    }

    await db.projects.update(id, updates)

    if (isAuthenticated && existing) {
      await syncEngine.queueChange("project", id, "update", updates, existing.cloudId)
    }
  }, [])

  const getProject = useCallback(async (id: number): Promise<Project | undefined> => {
    return db.projects.get(id)
  }, [])

  return {
    projects: projects ?? [],
    projectsWithStats: projectsWithStats ?? [],
    isLoading: projects === undefined,
    createProject,
    updateProject,
    deleteProject,
    archiveProject,
    unarchiveProject,
    getProject,
  }
}

export function useProject(id: number | undefined) {
  const project = useLiveQuery(
    async () => {
      if (id === undefined) return undefined
      return db.projects.get(id)
    },
    [id],
    undefined
  )

  return {
    project,
    isLoading: project === undefined && id !== undefined,
  }
}
