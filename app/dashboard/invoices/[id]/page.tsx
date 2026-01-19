"use client"

import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useInvoice, useInvoices } from "@/lib/db/hooks"
import { storedInvoiceToInvoiceData, generateInvoiceFilename } from "@/lib/pdf/invoice-generator"
import { formatDuration, formatCurrency } from "@/lib/db/utils"
import type { InvoiceStatus } from "@/lib/db/schema"
import { pdf } from "@react-pdf/renderer"
import { InvoiceDocument } from "@/lib/pdf/invoice-template"
import { useState } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmDialog } from "@/components/confirm-dialog"

import {
  ArrowLeft,
  Download,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
} from "lucide-react"

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
}

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  cancelled: "Cancelled",
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params.id)

  const { invoice, isLoading } = useInvoice(id)
  const { updateStatus, deleteInvoice } = useInvoices()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    if (!invoice) return
    setIsDownloading(true)
    try {
      const invoiceData = storedInvoiceToInvoiceData(invoice)
      const blob = await pdf(<InvoiceDocument data={invoiceData} />).toBlob()
      const url = URL.createObjectURL(blob)
      const filename = generateInvoiceFilename(invoice.invoiceNumber, invoice.clientName)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Failed to download invoice:", err)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleDelete = async () => {
    if (!invoice?.id) return
    await deleteInvoice(invoice.id)
    router.push("/dashboard/invoices")
  }

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatShortDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/invoices">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="size-4" />
            Back to Invoices
          </Button>
        </Link>
        <Card className="py-12">
          <CardContent className="text-center">
            <h2 className="text-xl font-semibold mb-2">Invoice Not Found</h2>
            <p className="text-muted-foreground">
              The invoice you are looking for does not exist or has been deleted.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const invoiceData = storedInvoiceToInvoiceData(invoice)

  return (
    <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{invoice.invoiceNumber}</h1>
            <p className="text-sm text-muted-foreground">
              Created {formatDate(invoice.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={isDownloading}
            className="gap-2"
          >
            <Download className="size-4" />
            {isDownloading ? "Downloading..." : "Download PDF"}
          </Button>
          {invoice.status === "draft" && (
            <Button onClick={() => updateStatus(invoice.id!, "sent")} className="gap-2">
              <Send className="size-4" />
              Mark as Sent
            </Button>
          )}
          {invoice.status === "sent" && (
            <Button onClick={() => updateStatus(invoice.id!, "paid")} className="gap-2">
              <CheckCircle className="size-4" />
              Mark as Paid
            </Button>
          )}
        </div>
      </div>

            <Card className="border-2">
        <CardContent className="p-6 space-y-6">
                    <div className="flex justify-between items-start border-b pb-4">
            <div>
              <h2 className="text-2xl font-bold">INVOICE</h2>
              <p className="text-sm text-muted-foreground">{invoice.invoiceNumber}</p>
              <Badge className={`mt-2 ${STATUS_STYLES[invoice.status]}`}>
                {STATUS_LABELS[invoice.status]}
              </Badge>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium">{invoice.companyName}</p>
              <p className="text-muted-foreground">{invoice.companyEmail}</p>
              {invoice.companyPhone && (
                <p className="text-muted-foreground">{invoice.companyPhone}</p>
              )}
            </div>
          </div>

                    <div className="grid gap-6 text-sm md:grid-cols-2">
            <div>
              <p className="font-semibold mb-1">Bill To:</p>
              <p>{invoice.clientName}</p>
              {invoice.clientEmail && (
                <p className="text-muted-foreground">{invoice.clientEmail}</p>
              )}
              <p className="text-muted-foreground mt-2">
                Project: {invoice.projectName}
              </p>
            </div>
            <div className="md:text-right space-y-1">
              <p>
                <span className="font-medium">Invoice Date:</span>{" "}
                {formatDate(invoice.invoiceDate)}
              </p>
              <p>
                <span className="font-medium">Due Date:</span>{" "}
                {formatDate(invoice.dueDate)}
              </p>
              <p>
                <span className="font-medium">Period:</span>{" "}
                {formatShortDate(invoice.periodStart)} -{" "}
                {formatShortDate(invoice.periodEnd)}
              </p>
              {invoice.paidAt && (
                <p className="text-green-600">
                  <span className="font-medium">Paid:</span>{" "}
                  {formatDate(invoice.paidAt)}
                </p>
              )}
            </div>
          </div>

                    <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Description</th>
                    <th className="text-right p-3">Duration</th>
                    <th className="text-right p-3">Rate</th>
                    <th className="text-right p-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.lineItems.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-muted/50" : ""}>
                      <td className="p-3">
                        {item.date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="p-3">{item.description}</td>
                      <td className="text-right p-3">{formatDuration(item.duration)}</td>
                      <td className="text-right p-3">{formatCurrency(item.rate)}/hr</td>
                      <td className="text-right p-3">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

                    <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.taxRate > 0 && (
                <div className="flex justify-between">
                  <span>Tax ({invoice.taxRate}%):</span>
                  <span>{formatCurrency(invoice.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>

                    {invoice.notes && (
            <div className="text-sm border-t pt-4">
              <p className="font-medium mb-1">Notes:</p>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {invoice.notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

            <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Manage this invoice</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {invoice.status !== "cancelled" && invoice.status !== "paid" && (
            <Button
              variant="outline"
              onClick={() => updateStatus(invoice.id!, "cancelled")}
              className="gap-2"
            >
              <XCircle className="size-4" />
              Cancel Invoice
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            className="gap-2"
          >
            <Trash2 className="size-4" />
            Delete Invoice
          </Button>
        </CardContent>
      </Card>

            <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete invoice?"
        description={`This will permanently delete invoice ${invoice.invoiceNumber}. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
