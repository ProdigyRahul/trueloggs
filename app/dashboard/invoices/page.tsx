"use client"

import { useState } from "react"
import Link from "next/link"
import { useInvoices } from "@/lib/db/hooks"
import { storedInvoiceToInvoiceData, generateInvoiceFilename } from "@/lib/pdf/invoice-generator"
import { formatCurrency } from "@/lib/db/utils"
import type { Invoice, InvoiceStatus } from "@/lib/db/schema"
import { pdf } from "@react-pdf/renderer"
import { InvoiceDocument } from "@/lib/pdf/invoice-template"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { InvoiceWizard } from "@/components/invoice-wizard"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ProjectSelector } from "@/components/project-selector"
import { StatsCard } from "@/components/stats-card"

import {
  Plus,
  X,
  FileText,
  MoreHorizontal,
  Download,
  Eye,
  Trash2,
  CheckCircle,
  Send,
  XCircle,
  Clock,
  DollarSign,
  Receipt,
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

export default function InvoicesPage() {
  const [showWizard, setShowWizard] = useState(false)
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | "all">("all")
  const [filterProjectId, setFilterProjectId] = useState<number | null>(null)
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null)

  const { invoices, isLoading, stats, updateStatus, deleteInvoice } = useInvoices({
    status: filterStatus === "all" ? undefined : filterStatus,
    projectId: filterProjectId ?? undefined,
  })

  const handleDownload = async (invoice: Invoice) => {
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
    }
  }

  const handleDelete = async () => {
    if (deletingInvoice?.id) {
      await deleteInvoice(deletingInvoice.id)
      setDeletingInvoice(null)
    }
  }

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const clearFilters = () => {
    setFilterStatus("all")
    setFilterProjectId(null)
  }

  const hasFilters = filterStatus !== "all" || filterProjectId !== null

  return (
    <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <Button
          onClick={() => setShowWizard((prev) => !prev)}
          variant={showWizard ? "outline" : "default"}
          className="gap-2"
        >
          {showWizard ? <X className="size-4" /> : <Plus className="size-4" />}
          {showWizard ? "Close" : "Create Invoice"}
        </Button>
      </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Invoices"
          value={stats.total}
          icon={<Receipt className="size-4" />}
        />
        <StatsCard
          title="Pending"
          value={stats.byStatus.sent}
          icon={<Clock className="size-4" />}
        />
        <StatsCard
          title="Paid"
          value={stats.byStatus.paid}
          icon={<CheckCircle className="size-4" />}
        />
        <StatsCard
          title="Total Revenue"
          value={formatCurrency(stats.paidAmount)}
          icon={<DollarSign className="size-4" />}
        />
      </div>

            {showWizard && (
        <InvoiceWizard
          open={showWizard}
          onInvoiceSaved={() => setShowWizard(false)}
        />
      )}

            {!showWizard && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filterStatus}
                  onValueChange={(value) =>
                    setFilterStatus(value as InvoiceStatus | "all")
                  }
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <ProjectSelector
                  value={filterProjectId}
                  onValueChange={setFilterProjectId}
                  placeholder="All projects"
                  showArchived
                />
              </div>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

            {!showWizard && (
        <>
          {isLoading ? (
            <Card>
              <CardContent className="p-0">
                <div className="animate-pulse space-y-0">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 border-b last:border-0 bg-muted/30" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : invoices.length === 0 ? (
            <Card className="py-12">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-muted mb-4">
                  <FileText className="size-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  {hasFilters ? "No matching invoices" : "No invoices yet"}
                </h3>
                <p className="text-muted-foreground text-sm mb-4 max-w-md">
                  {hasFilters
                    ? "Try adjusting your filters to find invoices."
                    : "Create your first invoice from tracked time entries."}
                </p>
                {!hasFilters && (
                  <Button onClick={() => setShowWizard(true)} className="gap-2">
                    <Plus className="size-4" />
                    Create Invoice
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Invoice #</th>
                        <th className="text-left p-3 font-medium">Client</th>
                        <th className="text-left p-3 font-medium">Project</th>
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-right p-3 font-medium">Amount</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-right p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice) => (
                        <tr
                          key={invoice.id}
                          className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                        >
                          <td className="p-3">
                            <Link
                              href={`/dashboard/invoices/${invoice.id}`}
                              className="font-medium hover:underline"
                            >
                              {invoice.invoiceNumber}
                            </Link>
                          </td>
                          <td className="p-3">{invoice.clientName}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="size-3 rounded-full shrink-0"
                                style={{ backgroundColor: invoice.projectColor }}
                              />
                              <span className="truncate max-w-[150px]">
                                {invoice.projectName}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {formatDate(invoice.invoiceDate)}
                          </td>
                          <td className="p-3 text-right font-medium">
                            {formatCurrency(invoice.total)}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="secondary"
                              className={STATUS_STYLES[invoice.status]}
                            >
                              {STATUS_LABELS[invoice.status]}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-8" />}>
                                <MoreHorizontal className="size-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-44">
                                <DropdownMenuItem render={<Link href={`/dashboard/invoices/${invoice.id}`} />}>
                                  <Eye className="size-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownload(invoice)}>
                                  <Download className="size-4 mr-2" />
                                  Download PDF
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {invoice.status === "draft" && (
                                  <DropdownMenuItem
                                    onClick={() => updateStatus(invoice.id!, "sent")}
                                  >
                                    <Send className="size-4 mr-2" />
                                    Mark as Sent
                                  </DropdownMenuItem>
                                )}
                                {invoice.status === "sent" && (
                                  <DropdownMenuItem
                                    onClick={() => updateStatus(invoice.id!, "paid")}
                                  >
                                    <CheckCircle className="size-4 mr-2" />
                                    Mark as Paid
                                  </DropdownMenuItem>
                                )}
                                {invoice.status !== "cancelled" &&
                                  invoice.status !== "paid" && (
                                    <DropdownMenuItem
                                      onClick={() => updateStatus(invoice.id!, "cancelled")}
                                    >
                                      <XCircle className="size-4 mr-2" />
                                      Cancel Invoice
                                    </DropdownMenuItem>
                                  )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeletingInvoice(invoice)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="size-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

            <ConfirmDialog
        open={!!deletingInvoice}
        onOpenChange={(open) => !open && setDeletingInvoice(null)}
        title="Delete invoice?"
        description={`This will permanently delete invoice ${deletingInvoice?.invoiceNumber}. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
