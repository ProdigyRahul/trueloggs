"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { useCallback, useMemo } from "react"
import { db } from "../index"
import type {
  Invoice,
  InvoiceStatus,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  DateRange,
} from "../schema"

interface UseInvoicesOptions {
  status?: InvoiceStatus
  projectId?: number
  dateRange?: DateRange
}

export function useInvoices(options: UseInvoicesOptions = {}) {
  const { status, projectId, dateRange } = options

  const invoices = useLiveQuery(
    async () => {
      let results: Invoice[]

      if (status) {
        results = await db.invoices.where("status").equals(status).toArray()
      } else {
        results = await db.invoices.toArray()
      }

      if (projectId !== undefined) {
        results = results.filter((inv) => inv.projectId === projectId)
      }

      if (dateRange) {
        const start = dateRange.start.toISOString()
        const end = dateRange.end.toISOString()
        results = results.filter(
          (inv) => inv.invoiceDate >= start && inv.invoiceDate <= end
        )
      }

      return results.sort(
        (a, b) =>
          new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
      )
    },
    [status, projectId, dateRange?.start?.getTime(), dateRange?.end?.getTime()],
    []
  )

  const stats = useMemo(() => {
    const list = invoices ?? []
    return {
      total: list.length,
      totalAmount: list.reduce((sum, inv) => sum + inv.total, 0),
      byStatus: {
        draft: list.filter((i) => i.status === "draft").length,
        sent: list.filter((i) => i.status === "sent").length,
        paid: list.filter((i) => i.status === "paid").length,
        cancelled: list.filter((i) => i.status === "cancelled").length,
      },
      paidAmount: list
        .filter((i) => i.status === "paid")
        .reduce((sum, inv) => sum + inv.total, 0),
    }
  }, [invoices])

  const createInvoice = useCallback(
    async (input: CreateInvoiceInput): Promise<number> => {
      const now = new Date().toISOString()

      const existing = await db.invoices
        .where("invoiceNumber")
        .equals(input.invoiceNumber)
        .first()

      if (existing) {
        throw new Error(`Invoice number ${input.invoiceNumber} already exists`)
      }

      const invoice: Omit<Invoice, "id"> = {
        ...input,
        createdAt: now,
        updatedAt: now,
      }

      const id = await db.invoices.add(invoice as Invoice)
      return id as number
    },
    []
  )

  const updateInvoice = useCallback(
    async (id: number, input: UpdateInvoiceInput): Promise<void> => {
      await db.invoices.update(id, {
        ...input,
        updatedAt: new Date().toISOString(),
      })
    },
    []
  )

  const updateStatus = useCallback(
    async (id: number, status: InvoiceStatus): Promise<void> => {
      const updates: Partial<Invoice> = {
        status,
        updatedAt: new Date().toISOString(),
      }

      if (status === "paid") {
        updates.paidAt = new Date().toISOString()
      }

      await db.invoices.update(id, updates)
    },
    []
  )

  const deleteInvoice = useCallback(async (id: number): Promise<void> => {
    await db.invoices.delete(id)
  }, [])

  return {
    invoices: invoices ?? [],
    isLoading: invoices === undefined,
    stats,
    createInvoice,
    updateInvoice,
    updateStatus,
    deleteInvoice,
  }
}

export function useInvoice(id: number | undefined) {
  const invoice = useLiveQuery(
    async () => {
      if (id === undefined) return undefined
      return db.invoices.get(id)
    },
    [id],
    undefined
  )

  return {
    invoice,
    isLoading: invoice === undefined && id !== undefined,
  }
}
