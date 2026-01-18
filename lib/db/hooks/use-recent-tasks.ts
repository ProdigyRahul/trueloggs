"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { useCallback } from "react"
import { db } from "../index"

export function useRecentTasks(projectId?: number) {
  const recentTasks = useLiveQuery(
    async () => {
      if (projectId !== undefined) {
        const tasks = await db.recentTasks
          .where("projectId")
          .equals(projectId)
          .toArray()
        return tasks.sort((a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime()).slice(0, 10)
      }
      const tasks = await db.recentTasks.toArray()
      return tasks.sort((a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime()).slice(0, 20)
    },
    [projectId],
    []
  )

  const deleteTask = useCallback(async (id: number): Promise<void> => {
    await db.recentTasks.delete(id)
  }, [])

  const clearAllTasks = useCallback(async (): Promise<void> => {
    await db.recentTasks.clear()
  }, [])

  return {
    recentTasks: recentTasks ?? [],
    isLoading: recentTasks === undefined,
    deleteTask,
    clearAllTasks,
  }
}
