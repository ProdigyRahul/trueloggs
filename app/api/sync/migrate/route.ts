import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@workos-inc/authkit-nextjs"
import {
  cloudDb,
  projects,
  timeEntries,
  invoices,
  settings,
  recentTasks,
} from "@/lib/db/cloud"

interface MigrationPayload {
  projects: Array<{
    id: number
    name: string
    clientName?: string
    hourlyRate: number
    color: string
    status: "active" | "archived"
    createdAt: string
    updatedAt: string
  }>
  timeEntries: Array<{
    id: number
    projectId: number
    date: string
    duration: number
    notes?: string
    createdAt: string
    updatedAt: string
  }>
  invoices: Array<{
    id: number
    invoiceNumber: string
    status: "draft" | "sent" | "paid" | "cancelled"
    invoiceDate: string
    dueDate: string
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
    lineItems: unknown[]
    subtotal: number
    taxRate: number
    taxAmount: number
    total: number
    periodStart: string
    periodEnd: string
    notes?: string
    paymentTerms?: string
    createdAt: string
    updatedAt: string
  }>
  settings?: {
    profile: {
      fullName: string
      email: string
      company: string
      phone: string
      address: string
      bio: string
    }
    workSettings: {
      targetHoursPerWeek: number
      defaultHourlyRate: number
      workDays: boolean[]
    }
    invoiceSettings: {
      invoiceCounter: number
      invoicePrefix: string
      lastInvoiceYear: number
    }
    theme: "light" | "dark" | "system"
  }
  recentTasks: Array<{
    id: number
    projectId: number
    taskDescription: string
    lastUsedAt: string
    usageCount: number
  }>
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await withAuth()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload: MigrationPayload = await request.json()

    const projectIdMap = new Map<number, string>()
    const timeEntryIdMap = new Map<number, string>()
    const invoiceIdMap = new Map<number, string>()
    const errors: string[] = []

    for (const project of payload.projects) {
      try {
        const [created] = await cloudDb
          .insert(projects)
          .values({
            userId: user.id,
            localId: project.id,
            name: project.name,
            clientName: project.clientName,
            hourlyRate: project.hourlyRate,
            color: project.color,
            status: project.status,
            syncVersion: 1,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
          })
          .returning()

        projectIdMap.set(project.id, created.cloudId)
      } catch (error) {
        errors.push(
          `Failed to migrate project ${project.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        )
      }
    }

    for (const entry of payload.timeEntries) {
      try {
        const projectCloudId = projectIdMap.get(entry.projectId)

        if (!projectCloudId) {
          errors.push(
            `Time entry ${entry.id} references unknown project ${entry.projectId}`
          )
          continue
        }

        const [created] = await cloudDb
          .insert(timeEntries)
          .values({
            userId: user.id,
            localId: entry.id,
            projectCloudId,
            date: entry.date.split("T")[0],
            duration: entry.duration,
            notes: entry.notes,
            syncVersion: 1,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
          })
          .returning()

        timeEntryIdMap.set(entry.id, created.cloudId)
      } catch (error) {
        errors.push(
          `Failed to migrate time entry ${entry.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        )
      }
    }

    for (const invoice of payload.invoices) {
      try {
        const projectCloudId = invoice.projectId
          ? projectIdMap.get(invoice.projectId)
          : undefined

        const [created] = await cloudDb
          .insert(invoices)
          .values({
            userId: user.id,
            localId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
            invoiceDate: invoice.invoiceDate,
            dueDate: invoice.dueDate,
            paidAt: invoice.paidAt,
            companyName: invoice.companyName,
            companyEmail: invoice.companyEmail,
            companyPhone: invoice.companyPhone,
            companyAddress: invoice.companyAddress,
            clientName: invoice.clientName,
            clientEmail: invoice.clientEmail,
            projectName: invoice.projectName,
            projectColor: invoice.projectColor,
            projectCloudId,
            lineItems: JSON.stringify(invoice.lineItems),
            subtotal: invoice.subtotal,
            taxRate: invoice.taxRate,
            taxAmount: invoice.taxAmount,
            total: invoice.total,
            periodStart: invoice.periodStart,
            periodEnd: invoice.periodEnd,
            notes: invoice.notes,
            paymentTerms: invoice.paymentTerms,
            syncVersion: 1,
            createdAt: invoice.createdAt,
            updatedAt: invoice.updatedAt,
          })
          .returning()

        invoiceIdMap.set(invoice.id, created.cloudId)
      } catch (error) {
        errors.push(
          `Failed to migrate invoice ${invoice.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        )
      }
    }

    if (payload.settings) {
      try {
        await cloudDb
          .insert(settings)
          .values({
            userId: user.id,
            profileFullName: payload.settings.profile.fullName,
            profileEmail: payload.settings.profile.email,
            profileCompany: payload.settings.profile.company,
            profilePhone: payload.settings.profile.phone,
            profileAddress: payload.settings.profile.address,
            profileBio: payload.settings.profile.bio,
            targetHoursPerWeek: payload.settings.workSettings.targetHoursPerWeek,
            defaultHourlyRate: payload.settings.workSettings.defaultHourlyRate,
            workDays: JSON.stringify(payload.settings.workSettings.workDays),
            invoiceCounter: payload.settings.invoiceSettings.invoiceCounter,
            invoicePrefix: payload.settings.invoiceSettings.invoicePrefix,
            lastInvoiceYear: payload.settings.invoiceSettings.lastInvoiceYear,
            theme: payload.settings.theme,
            syncVersion: 1,
            updatedAt: new Date().toISOString(),
          })
          .onConflictDoUpdate({
            target: settings.userId,
            set: {
              profileFullName: payload.settings.profile.fullName,
              profileCompany: payload.settings.profile.company,
              profilePhone: payload.settings.profile.phone,
              profileAddress: payload.settings.profile.address,
              profileBio: payload.settings.profile.bio,
              targetHoursPerWeek:
                payload.settings.workSettings.targetHoursPerWeek,
              defaultHourlyRate:
                payload.settings.workSettings.defaultHourlyRate,
              workDays: JSON.stringify(payload.settings.workSettings.workDays),
              invoiceCounter: payload.settings.invoiceSettings.invoiceCounter,
              invoicePrefix: payload.settings.invoiceSettings.invoicePrefix,
              lastInvoiceYear: payload.settings.invoiceSettings.lastInvoiceYear,
              theme: payload.settings.theme,
              syncVersion: 2,
              updatedAt: new Date().toISOString(),
            },
          })
      } catch (error) {
        errors.push(
          `Failed to migrate settings: ${error instanceof Error ? error.message : "Unknown error"}`
        )
      }
    }

    for (const task of payload.recentTasks) {
      try {
        const projectCloudId = projectIdMap.get(task.projectId)

        if (!projectCloudId) {
          continue
        }

        await cloudDb.insert(recentTasks).values({
          userId: user.id,
          localId: task.id,
          projectCloudId,
          taskDescription: task.taskDescription,
          lastUsedAt: task.lastUsedAt,
          usageCount: task.usageCount,
          syncVersion: 1,
        })
      } catch {
        // Skip recent task errors as they're not critical
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      mappings: {
        projects: Object.fromEntries(projectIdMap),
        timeEntries: Object.fromEntries(timeEntryIdMap),
        invoices: Object.fromEntries(invoiceIdMap),
      },
      errors,
      migrated: {
        projects: projectIdMap.size,
        timeEntries: timeEntryIdMap.size,
        invoices: invoiceIdMap.size,
      },
    })
  } catch (error) {
    console.error("Migration error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Migration failed",
      },
      { status: 500 }
    )
  }
}
