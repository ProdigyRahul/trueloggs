"use client"

import { db } from "@/lib/db"
import { calculateRevenue, normalizeDate } from "@/lib/db/utils"
import type { InvoiceData, InvoiceFormData, InvoiceLineItem } from "./invoice-types"
import type { TimeEntry, Invoice, CreateInvoiceInput, StoredInvoiceLineItem } from "@/lib/db/schema"

export async function generateInvoiceNumber(): Promise<string> {
  const settings = await db.settings.get("settings")
  if (!settings) throw new Error("Settings not initialized")

  const currentYear = new Date().getFullYear()
  const { invoiceCounter, invoicePrefix, lastInvoiceYear } = settings.invoiceSettings

  const newCounter = currentYear !== lastInvoiceYear ? 1 : invoiceCounter + 1
  const invoiceNumber = `${invoicePrefix}-${currentYear}-${String(newCounter).padStart(3, "0")}`

  await db.settings.update("settings", {
    invoiceSettings: {
      ...settings.invoiceSettings,
      invoiceCounter: newCounter,
      lastInvoiceYear: currentYear,
    },
  })

  return invoiceNumber
}

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

function calculateTotals(lineItems: InvoiceLineItem[], taxRate: number) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)
  const taxAmount = (subtotal * taxRate) / 100
  const total = subtotal + taxAmount

  return { subtotal, taxAmount, total }
}

export async function prepareInvoiceData(
  formData: InvoiceFormData
): Promise<InvoiceData> {
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

  const lineItems = prepareLineItemsByDate(timeEntries, project.hourlyRate)

  const { subtotal, taxAmount, total } = calculateTotals(lineItems, formData.taxRate)

  const invoiceNumber = await generateInvoiceNumber()

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

export function invoiceDataToStorable(
  data: InvoiceData,
  formData: InvoiceFormData
): CreateInvoiceInput {
  return {
    invoiceNumber: data.invoiceNumber,
    status: "draft",

    invoiceDate: data.invoiceDate.toISOString(),
    dueDate: data.dueDate.toISOString(),

    companyName: data.companyName,
    companyEmail: data.companyEmail,
    companyPhone: data.companyPhone,
    companyAddress: data.companyAddress,

    clientName: data.clientName,
    clientEmail: formData.clientEmail,
    projectName: data.projectName,
    projectColor: data.projectColor,
    projectId: formData.projectId,

    lineItems: data.lineItems.map((item): StoredInvoiceLineItem => ({
      date: item.date.toISOString(),
      description: item.description,
      duration: item.duration,
      rate: item.rate,
      amount: item.amount,
    })),

    subtotal: data.subtotal,
    taxRate: data.taxRate,
    taxAmount: data.taxAmount,
    total: data.total,

    periodStart: formData.periodStart.toISOString(),
    periodEnd: formData.periodEnd.toISOString(),

    notes: data.notes,
    paymentTerms: data.paymentTerms,
  }
}

export function storedInvoiceToInvoiceData(invoice: Invoice): InvoiceData {
  return {
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: new Date(invoice.invoiceDate),
    dueDate: new Date(invoice.dueDate),

    companyName: invoice.companyName,
    companyEmail: invoice.companyEmail,
    companyPhone: invoice.companyPhone,
    companyAddress: invoice.companyAddress,

    clientName: invoice.clientName,
    projectName: invoice.projectName,
    projectColor: invoice.projectColor,

    lineItems: invoice.lineItems.map((item) => ({
      date: new Date(item.date),
      description: item.description,
      duration: item.duration,
      rate: item.rate,
      amount: item.amount,
    })),

    subtotal: invoice.subtotal,
    taxRate: invoice.taxRate,
    taxAmount: invoice.taxAmount,
    total: invoice.total,

    notes: invoice.notes,
    paymentTerms: invoice.paymentTerms,
  }
}
