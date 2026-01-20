import { NextResponse } from "next/server"
import { withAuth } from "@workos-inc/authkit-nextjs"
import { cloudDb, projects, timeEntries, invoices } from "@/lib/db/cloud"
import { eq } from "drizzle-orm"

export async function GET() {
  try {
    const { user } = await withAuth()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const projectCount = await cloudDb
      .select()
      .from(projects)
      .where(eq(projects.userId, user.id))
      .then((rows) => rows.filter((r) => !r.deletedAt).length)

    const timeEntryCount = await cloudDb
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.userId, user.id))
      .then((rows) => rows.filter((r) => !r.deletedAt).length)

    const invoiceCount = await cloudDb
      .select()
      .from(invoices)
      .where(eq(invoices.userId, user.id))
      .then((rows) => rows.filter((r) => !r.deletedAt).length)

    const hasExistingData =
      projectCount > 0 || timeEntryCount > 0 || invoiceCount > 0

    return NextResponse.json({
      hasExistingData,
      counts: {
        projects: projectCount,
        timeEntries: timeEntryCount,
        invoices: invoiceCount,
      },
    })
  } catch (error) {
    console.error("Sync status error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
