"use client"

import { db } from "@/lib/db"
import { calculateRevenue, normalizeDate } from "@/lib/db/utils"
import type { InvoiceData, InvoiceFormData, InvoiceLineItem } from "./invoice-types"
import type { TimeEntry } from "@/lib/db/schema"

/**
 * Generate invoice number and increment counter
 */
export async function generateInvoiceNumber(): Promise<string> {
  const settings = await db.settings.get("settings")
  if (!settings) throw new Error("Settings not initialized")

  const currentYear = new Date().getFullYear()
  const { invoiceCounter, invoicePrefix, lastInvoiceYear } = settings.invoiceSettings

  // Reset counter if new year
  const newCounter = currentYear !== lastInvoiceYear ? 1 : invoiceCounter + 1
  const invoiceNumber = `${invoicePrefix}-${currentYear}-${String(newCounter).padStart(3, "0")}`

  // Update counter in database
  await db.settings.update("settings", {
    invoiceSettings: {
      ...settings.invoiceSettings,
      invoiceCounter: newCounter,
      lastInvoiceYear: currentYear,
    },
  })

  return invoiceNumber
}

/**
 * Prepare line items grouped by date
 */
function prepareLineItemsByDate(
  timeEntries: TimeEntry[],
  hourlyRate: number
): InvoiceLineItem[] {
  return timeEntries
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((entry) => ({
      date: entry.date,
      description: entry.notes || "Time tracked",
      duration: entry.duration,
      rate: hourlyRate,
      amount: calculateRevenue(entry.duration, hourlyRate),
    }))
}

/**
 * Calculate invoice financial totals
 */
function calculateTotals(lineItems: InvoiceLineItem[], taxRate: number) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)
  const taxAmount = (subtotal * taxRate) / 100
  const total = subtotal + taxAmount

  return { subtotal, taxAmount, total }
}

/**
 * Prepare complete invoice data from form input
 */
export async function prepareInvoiceData(
  formData: InvoiceFormData
): Promise<InvoiceData> {
  // Fetch necessary data
  const [project, settings, timeEntries] = await Promise.all([
    db.projects.get(formData.projectId),
    db.settings.get("settings"),
    db.timeEntries
      .where("[projectId+date]")
      .between(
        [formData.projectId, normalizeDate(formData.periodStart)],
        [formData.projectId, normalizeDate(formData.periodEnd)],
        true,
        true
      )
      .toArray(),
  ])

  if (!project) throw new Error("Project not found")
  if (!settings) throw new Error("Settings not initialized")
  if (timeEntries.length === 0) {
    throw new Error("No time entries found for the selected period")
  }

  // Prepare line items grouped by date
  const lineItems = prepareLineItemsByDate(timeEntries, project.hourlyRate)

  // Calculate financial totals
  const { subtotal, taxAmount, total } = calculateTotals(lineItems, formData.taxRate)

  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber()

  // Calculate dates
  const invoiceDate = new Date()
  const dueDate = new Date(invoiceDate)
  dueDate.setDate(dueDate.getDate() + formData.dueInDays)

  return {
    invoiceNumber,
    invoiceDate,
    dueDate,

    companyName: settings.profile.company || settings.profile.fullName || "Your Company",
    companyEmail: settings.profile.email,
    companyPhone: settings.profile.phone,
    companyAddress: settings.profile.address,

    clientName: formData.clientName,
    projectName: project.name,
    projectColor: project.color,

    lineItems,
    subtotal,
    taxRate: formData.taxRate,
    taxAmount,
    total,

    notes: formData.notes,
    paymentTerms: `Payment due within ${formData.dueInDays} days`,
  }
}

/**
 * Download filename generator
 */
export function generateInvoiceFilename(
  invoiceNumber: string,
  clientName: string
): string {
  const sanitizedClient = clientName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return `${invoiceNumber.toLowerCase()}-${sanitizedClient}.pdf`
}
