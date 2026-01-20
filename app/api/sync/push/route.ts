import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@workos-inc/authkit-nextjs"
import { cloudDb, projects, timeEntries, invoices } from "@/lib/db/cloud"
import { eq, and } from "drizzle-orm"

interface SyncItem {
  operation: "create" | "update" | "delete"
  localId: number
  cloudId?: string
  data: Record<string, unknown>
  syncVersion: number
}

interface SyncPayload {
  projects?: SyncItem[]
  timeEntries?: SyncItem[]
  invoices?: SyncItem[]
}

interface SyncResultItem {
  localId: number
  cloudId: string
  syncVersion: number
  status: "success" | "conflict" | "error"
  error?: string
  serverData?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await withAuth()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload: SyncPayload = await request.json()
    const result: {
      projects?: SyncResultItem[]
      timeEntries?: SyncResultItem[]
      invoices?: SyncResultItem[]
    } = {}

    if (payload.projects?.length) {
      result.projects = await Promise.all(
        payload.projects.map((item) => processProject(user.id, item))
      )
    }

    if (payload.timeEntries?.length) {
      result.timeEntries = await Promise.all(
        payload.timeEntries.map((item) => processTimeEntry(user.id, item))
      )
    }

    if (payload.invoices?.length) {
      result.invoices = await Promise.all(
        payload.invoices.map((item) => processInvoice(user.id, item))
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Sync push error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function processProject(
  userId: string,
  item: SyncItem
): Promise<SyncResultItem> {
  try {
    if (item.operation === "create") {
      const [created] = await cloudDb
        .insert(projects)
        .values({
          userId,
          localId: item.localId,
          name: item.data.name as string,
          clientName: item.data.clientName as string | undefined,
          hourlyRate: item.data.hourlyRate as number,
          color: item.data.color as string,
          status: (item.data.status as "active" | "archived") ?? "active",
          syncVersion: 1,
          createdAt:
            (item.data.createdAt as string) ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning()

      return {
        localId: item.localId,
        cloudId: created.cloudId,
        syncVersion: created.syncVersion,
        status: "success",
      }
    }

    if (item.operation === "update" && item.cloudId) {
      const existing = await cloudDb.query.projects.findFirst({
        where: and(
          eq(projects.cloudId, item.cloudId),
          eq(projects.userId, userId)
        ),
      })

      if (!existing) {
        return {
          localId: item.localId,
          cloudId: item.cloudId,
          syncVersion: item.syncVersion,
          status: "error",
          error: "Not found",
        }
      }

      if (existing.syncVersion > item.syncVersion) {
        return {
          localId: item.localId,
          cloudId: item.cloudId,
          syncVersion: existing.syncVersion,
          status: "conflict",
          serverData: existing as unknown as Record<string, unknown>,
        }
      }

      const [updated] = await cloudDb
        .update(projects)
        .set({
          name: item.data.name as string,
          clientName: item.data.clientName as string | undefined,
          hourlyRate: item.data.hourlyRate as number,
          color: item.data.color as string,
          status: item.data.status as "active" | "archived",
          syncVersion: existing.syncVersion + 1,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(projects.cloudId, item.cloudId))
        .returning()

      return {
        localId: item.localId,
        cloudId: updated.cloudId,
        syncVersion: updated.syncVersion,
        status: "success",
      }
    }

    if (item.operation === "delete" && item.cloudId) {
      await cloudDb
        .update(projects)
        .set({
          deletedAt: new Date().toISOString(),
          syncVersion: item.syncVersion + 1,
        })
        .where(
          and(eq(projects.cloudId, item.cloudId), eq(projects.userId, userId))
        )

      return {
        localId: item.localId,
        cloudId: item.cloudId,
        syncVersion: item.syncVersion + 1,
        status: "success",
      }
    }

    throw new Error("Invalid operation")
  } catch (error) {
    return {
      localId: item.localId,
      cloudId: item.cloudId || "",
      syncVersion: item.syncVersion,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

async function processTimeEntry(
  userId: string,
  item: SyncItem
): Promise<SyncResultItem> {
  try {
    if (item.operation === "create") {
      const projectCloudId = item.data.projectCloudId as string

      const [created] = await cloudDb
        .insert(timeEntries)
        .values({
          userId,
          localId: item.localId,
          projectCloudId,
          date:
            item.data.date instanceof Date
              ? item.data.date.toISOString().split("T")[0]
              : (item.data.date as string),
          duration: item.data.duration as number,
          notes: item.data.notes as string | undefined,
          syncVersion: 1,
          createdAt:
            (item.data.createdAt as string) ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning()

      return {
        localId: item.localId,
        cloudId: created.cloudId,
        syncVersion: created.syncVersion,
        status: "success",
      }
    }

    if (item.operation === "update" && item.cloudId) {
      const existing = await cloudDb.query.timeEntries.findFirst({
        where: and(
          eq(timeEntries.cloudId, item.cloudId),
          eq(timeEntries.userId, userId)
        ),
      })

      if (!existing) {
        return {
          localId: item.localId,
          cloudId: item.cloudId,
          syncVersion: item.syncVersion,
          status: "error",
          error: "Not found",
        }
      }

      if (existing.syncVersion > item.syncVersion) {
        return {
          localId: item.localId,
          cloudId: item.cloudId,
          syncVersion: existing.syncVersion,
          status: "conflict",
          serverData: existing as unknown as Record<string, unknown>,
        }
      }

      const [updated] = await cloudDb
        .update(timeEntries)
        .set({
          date:
            item.data.date instanceof Date
              ? item.data.date.toISOString().split("T")[0]
              : (item.data.date as string),
          duration: item.data.duration as number,
          notes: item.data.notes as string | undefined,
          syncVersion: existing.syncVersion + 1,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(timeEntries.cloudId, item.cloudId))
        .returning()

      return {
        localId: item.localId,
        cloudId: updated.cloudId,
        syncVersion: updated.syncVersion,
        status: "success",
      }
    }

    if (item.operation === "delete" && item.cloudId) {
      await cloudDb
        .update(timeEntries)
        .set({
          deletedAt: new Date().toISOString(),
          syncVersion: item.syncVersion + 1,
        })
        .where(
          and(
            eq(timeEntries.cloudId, item.cloudId),
            eq(timeEntries.userId, userId)
          )
        )

      return {
        localId: item.localId,
        cloudId: item.cloudId,
        syncVersion: item.syncVersion + 1,
        status: "success",
      }
    }

    throw new Error("Invalid operation")
  } catch (error) {
    return {
      localId: item.localId,
      cloudId: item.cloudId || "",
      syncVersion: item.syncVersion,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

async function processInvoice(
  userId: string,
  item: SyncItem
): Promise<SyncResultItem> {
  try {
    if (item.operation === "create") {
      const lineItems =
        typeof item.data.lineItems === "string"
          ? item.data.lineItems
          : JSON.stringify(item.data.lineItems)

      const [created] = await cloudDb
        .insert(invoices)
        .values({
          userId,
          localId: item.localId,
          invoiceNumber: item.data.invoiceNumber as string,
          status:
            (item.data.status as "draft" | "sent" | "paid" | "cancelled") ??
            "draft",
          invoiceDate: item.data.invoiceDate as string,
          dueDate: item.data.dueDate as string,
          paidAt: item.data.paidAt as string | undefined,
          companyName: item.data.companyName as string,
          companyEmail: item.data.companyEmail as string,
          companyPhone: item.data.companyPhone as string,
          companyAddress: item.data.companyAddress as string,
          clientName: item.data.clientName as string,
          clientEmail: item.data.clientEmail as string | undefined,
          projectName: item.data.projectName as string,
          projectColor: item.data.projectColor as string,
          projectCloudId: item.data.projectCloudId as string | undefined,
          lineItems,
          subtotal: item.data.subtotal as number,
          taxRate: item.data.taxRate as number,
          taxAmount: item.data.taxAmount as number,
          total: item.data.total as number,
          periodStart: item.data.periodStart as string,
          periodEnd: item.data.periodEnd as string,
          notes: item.data.notes as string | undefined,
          paymentTerms: item.data.paymentTerms as string | undefined,
          syncVersion: 1,
          createdAt:
            (item.data.createdAt as string) ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning()

      return {
        localId: item.localId,
        cloudId: created.cloudId,
        syncVersion: created.syncVersion,
        status: "success",
      }
    }

    if (item.operation === "update" && item.cloudId) {
      const existing = await cloudDb.query.invoices.findFirst({
        where: and(
          eq(invoices.cloudId, item.cloudId),
          eq(invoices.userId, userId)
        ),
      })

      if (!existing) {
        return {
          localId: item.localId,
          cloudId: item.cloudId,
          syncVersion: item.syncVersion,
          status: "error",
          error: "Not found",
        }
      }

      if (existing.syncVersion > item.syncVersion) {
        return {
          localId: item.localId,
          cloudId: item.cloudId,
          syncVersion: existing.syncVersion,
          status: "conflict",
          serverData: existing as unknown as Record<string, unknown>,
        }
      }

      const [updated] = await cloudDb
        .update(invoices)
        .set({
          status: item.data.status as "draft" | "sent" | "paid" | "cancelled",
          paidAt: item.data.paidAt as string | undefined,
          notes: item.data.notes as string | undefined,
          syncVersion: existing.syncVersion + 1,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(invoices.cloudId, item.cloudId))
        .returning()

      return {
        localId: item.localId,
        cloudId: updated.cloudId,
        syncVersion: updated.syncVersion,
        status: "success",
      }
    }

    if (item.operation === "delete" && item.cloudId) {
      await cloudDb
        .update(invoices)
        .set({
          deletedAt: new Date().toISOString(),
          syncVersion: item.syncVersion + 1,
        })
        .where(
          and(eq(invoices.cloudId, item.cloudId), eq(invoices.userId, userId))
        )

      return {
        localId: item.localId,
        cloudId: item.cloudId,
        syncVersion: item.syncVersion + 1,
        status: "success",
      }
    }

    throw new Error("Invalid operation")
  } catch (error) {
    return {
      localId: item.localId,
      cloudId: item.cloudId || "",
      syncVersion: item.syncVersion,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
