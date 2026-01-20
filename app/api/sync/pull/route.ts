import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@workos-inc/authkit-nextjs"
import {
  cloudDb,
  projects,
  timeEntries,
  invoices,
  settings,
  timerStates,
  recentTasks,
} from "@/lib/db/cloud"
import { eq, gt, and } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const { user } = await withAuth()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const lastSyncedAt = request.nextUrl.searchParams.get("lastSyncedAt")
    const entityTypes = request.nextUrl.searchParams.get("entityTypes")?.split(",") || [
      "projects",
      "timeEntries",
      "invoices",
      "settings",
      "timerState",
      "recentTasks",
    ]

    const result: Record<string, unknown[]> = {}

    if (entityTypes.includes("projects")) {
      result.projects = await cloudDb.query.projects.findMany({
        where: lastSyncedAt
          ? and(eq(projects.userId, user.id), gt(projects.updatedAt, lastSyncedAt))
          : eq(projects.userId, user.id),
      })
    }

    if (entityTypes.includes("timeEntries")) {
      result.timeEntries = await cloudDb.query.timeEntries.findMany({
        where: lastSyncedAt
          ? and(eq(timeEntries.userId, user.id), gt(timeEntries.updatedAt, lastSyncedAt))
          : eq(timeEntries.userId, user.id),
      })
    }

    if (entityTypes.includes("invoices")) {
      result.invoices = await cloudDb.query.invoices.findMany({
        where: lastSyncedAt
          ? and(eq(invoices.userId, user.id), gt(invoices.updatedAt, lastSyncedAt))
          : eq(invoices.userId, user.id),
      })
    }

    if (entityTypes.includes("settings")) {
      const userSettings = await cloudDb.query.settings.findFirst({
        where: eq(settings.userId, user.id),
      })
      result.settings = userSettings ? [userSettings] : []
    }

    if (entityTypes.includes("timerState")) {
      const timerState = await cloudDb.query.timerStates.findFirst({
        where: eq(timerStates.userId, user.id),
      })
      result.timerState = timerState ? [timerState] : []
    }

    if (entityTypes.includes("recentTasks")) {
      result.recentTasks = await cloudDb.query.recentTasks.findMany({
        where: eq(recentTasks.userId, user.id),
      })
    }

    return NextResponse.json({
      data: result,
      syncedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Sync pull error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
