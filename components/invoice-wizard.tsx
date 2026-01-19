"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useProjects, useTimeEntries, useInvoices } from "@/lib/db/hooks"
import { prepareInvoiceData, invoiceDataToStorable } from "@/lib/pdf/invoice-generator"
import { formatDuration, formatCurrency } from "@/lib/db/utils"
import type { InvoiceFormData, InvoiceData } from "@/lib/pdf/invoice-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ProjectSelector } from "@/components/project-selector"
import { InvoiceDownloadButton } from "@/components/invoice-download-button"
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react"

interface Props {
  open: boolean
  onInvoiceSaved?: (invoiceId: number) => void
}

type WizardStep = 1 | 2 | 3

export function InvoiceWizard({ open, onInvoiceSaved }: Props) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  const { projects } = useProjects("active")
  const { createInvoice } = useInvoices()

  const [projectId, setProjectId] = useState<number | null>(null)
  const [periodStart, setPeriodStart] = useState("")
  const [periodEnd, setPeriodEnd] = useState("")
  const [clientName, setClientName] = useState("")
  const [clientEmail, setClientEmail] = useState("")
  const [taxRate, setTaxRate] = useState(0)
  const [dueInDays, setDueInDays] = useState(30)
  const [notes, setNotes] = useState("")

  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null)
  const [isPreparingInvoice, setIsPreparingInvoice] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [savedInvoiceId, setSavedInvoiceId] = useState<number | null>(null)

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId]
  )

  const { entries: timeEntries = [], totalMinutes = 0 } = useTimeEntries(
    projectId && periodStart && periodEnd
      ? {
          projectId,
          dateRange: {
            start: new Date(periodStart),
            end: new Date(periodEnd),
          },
        }
      : undefined
  ) || {}

  useEffect(() => {
    if (selectedProject && !clientName) {
      setClientName(selectedProject.clientName || "")
    }
  }, [selectedProject, clientName])

  useEffect(() => {
    if (open && !periodStart) {
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      setPeriodStart(firstDay.toISOString().split("T")[0])
      setPeriodEnd(lastDay.toISOString().split("T")[0])
    }
  }, [open, periodStart])

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setCurrentStep(1)
        setProjectId(null)
        setClientName("")
        setClientEmail("")
        setTaxRate(0)
        setDueInDays(30)
        setNotes("")
        setInvoiceData(null)
        setError(null)
        setSavedInvoiceId(null)
      }, 300)
    }
  }, [open])

  const handleNext = async () => {
    setError(null)

    if (currentStep === 1) {
      if (!projectId) {
        setError("Please select a project")
        return
      }
      if ((timeEntries || []).length === 0) {
        setError("No time entries found for the selected period")
        return
      }
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (!clientName.trim()) {
        setError("Please enter a client name")
        return
      }
      setIsPreparingInvoice(true)
      try {
        const formData: InvoiceFormData = {
          projectId: projectId!,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim() || undefined,
          taxRate,
          notes: notes.trim() || undefined,
          dueInDays,
        }
        const data = await prepareInvoiceData(formData)
        setInvoiceData(data)
        setCurrentStep(3)

        const storableInvoice = invoiceDataToStorable(data, formData)
        const id = await createInvoice(storableInvoice)
        setSavedInvoiceId(id)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to prepare invoice")
      } finally {
        setIsPreparingInvoice(false)
      }
    }
  }

  const handleBack = () => {
    setError(null)
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as WizardStep)
    }
  }

  const subtotal = useMemo(() => {
    if (!selectedProject || !totalMinutes) return 0
    return (totalMinutes / 60) * selectedProject.hourlyRate
  }, [selectedProject, totalMinutes])

  const taxAmount = (subtotal * taxRate) / 100
  const total = subtotal + taxAmount

  const stepDescription =
    currentStep === 1
      ? "Select project and time period"
      : currentStep === 2
        ? "Configure invoice details"
        : "Review and download invoice"

  if (!open) {
    return null
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Create Invoice</CardTitle>
        <CardDescription>
          Step {currentStep} of 3 - {stepDescription}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {currentStep === 3 ? (
          <div className="space-y-4">
            {invoiceData && (
              <Card className="border-2">
                <CardContent className="p-6 space-y-6">
                  <div className="flex justify-between items-start border-b pb-4">
                    <div>
                      <h2 className="text-2xl font-bold">INVOICE</h2>
                      <p className="text-sm text-muted-foreground">
                        {invoiceData.invoiceNumber}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium">{invoiceData.companyName}</p>
                      <p className="text-muted-foreground">{invoiceData.companyEmail}</p>
                      {invoiceData.companyPhone && (
                        <p className="text-muted-foreground">{invoiceData.companyPhone}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-6 text-sm md:grid-cols-2">
                    <div>
                      <p className="font-semibold mb-1">Bill To:</p>
                      <p>{invoiceData.clientName}</p>
                      <p className="text-muted-foreground">Project: {invoiceData.projectName}</p>
                    </div>
                    <div className="md:text-right">
                      <p>
                        <span className="font-medium">Invoice Date:</span>{" "}
                        {invoiceData.invoiceDate.toLocaleDateString()}
                      </p>
                      <p>
                        <span className="font-medium">Due Date:</span>{" "}
                        {invoiceData.dueDate.toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[520px] text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-2">Date</th>
                            <th className="text-left p-2">Description</th>
                            <th className="text-right p-2">Duration</th>
                            <th className="text-right p-2">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceData.lineItems.map((item, idx) => (
                            <tr
                              key={idx}
                              className={idx % 2 === 0 ? "bg-muted/50" : ""}
                            >
                              <td className="p-2">
                                {item.date.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </td>
                              <td className="p-2">{item.description}</td>
                              <td className="text-right p-2">{formatDuration(item.duration)}</td>
                              <td className="text-right p-2">{formatCurrency(item.amount)}</td>
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
                        <span>{formatCurrency(invoiceData.subtotal)}</span>
                      </div>
                      {invoiceData.taxRate > 0 && (
                        <div className="flex justify-between">
                          <span>Tax ({invoiceData.taxRate}%):</span>
                          <span>{formatCurrency(invoiceData.taxAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Total:</span>
                        <span>{formatCurrency(invoiceData.total)}</span>
                      </div>
                    </div>
                  </div>

                  {invoiceData.notes && (
                    <div className="text-sm border-t pt-4">
                      <p className="font-medium mb-1">Notes:</p>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {invoiceData.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {currentStep === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="project">Project</Label>
                    <ProjectSelector
                      value={projectId}
                      onValueChange={setProjectId}
                      placeholder="Select project to invoice"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="periodStart">From Date</Label>
                      <Input
                        id="periodStart"
                        type="date"
                        value={periodStart}
                        onChange={(e) => setPeriodStart(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="periodEnd">To Date</Label>
                      <Input
                        id="periodEnd"
                        type="date"
                        value={periodEnd}
                        onChange={(e) => setPeriodEnd(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Client Name *</Label>
                    <Input
                      id="clientName"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Client or company name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientEmail">Client Email (optional)</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="client@example.com"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="taxRate">Tax Rate (%)</Label>
                      <Input
                        id="taxRate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={taxRate}
                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dueInDays">Payment Due (days)</Label>
                      <Input
                        id="dueInDays"
                        type="number"
                        min="0"
                        max="365"
                        value={dueInDays}
                        onChange={(e) => setDueInDays(parseInt(e.target.value) || 30)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes or payment instructions"
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="space-y-4">
              {currentStep === 1 && (
                <>
                  {selectedProject ? (
                    <Card className="border-primary/50">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="size-4 rounded-full"
                            style={{ backgroundColor: selectedProject.color }}
                          />
                          <span className="font-semibold">{selectedProject.name}</span>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Client: {selectedProject.clientName || "Not specified"}</p>
                          <p>Rate: ${selectedProject.hourlyRate}/hr</p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="pt-4 text-sm text-muted-foreground">
                        Select a project to preview client details and rates.
                      </CardContent>
                    </Card>
                  )}

                  {projectId && periodStart && periodEnd && (
                    <Card>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div>
                            <p className="text-2xl font-bold">{timeEntries.length}</p>
                            <p className="text-sm text-muted-foreground">Time Entries</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{formatDuration(totalMinutes)}</p>
                            <p className="text-sm text-muted-foreground">Total Time</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {currentStep === 2 && (
                <>
                  {selectedProject && (
                    <Card>
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="size-3 rounded-full"
                            style={{ backgroundColor: selectedProject.color }}
                          />
                          <div>
                            <p className="font-medium">{selectedProject.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {selectedProject.clientName || "Client not specified"}
                            </p>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>Period: {periodStart || "—"} to {periodEnd || "—"}</p>
                          <p>Rate: ${selectedProject.hourlyRate}/hr</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-center border-t pt-3">
                          <div>
                            <p className="text-lg font-semibold">{timeEntries.length}</p>
                            <p className="text-xs text-muted-foreground">Entries</p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold">{formatDuration(totalMinutes)}</p>
                            <p className="text-xs text-muted-foreground">Total Time</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="border-primary/50">
                    <CardContent className="pt-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span className="font-semibold">{formatCurrency(subtotal)}</span>
                        </div>
                        {taxRate > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tax ({taxRate}%):</span>
                            <span className="font-semibold">
                              {formatCurrency(taxAmount)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t text-base">
                          <span className="font-semibold">Total:</span>
                          <span className="font-bold">
                            {formatCurrency(total)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {currentStep > 1 && !savedInvoiceId && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="gap-2"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {currentStep < 3 ? (
            <Button
              onClick={handleNext}
              disabled={
                (currentStep === 1 && (!projectId || !periodStart || !periodEnd)) ||
                (currentStep === 2 && !clientName.trim()) ||
                isPreparingInvoice
              }
              className="gap-2"
            >
              {isPreparingInvoice ? "Preparing..." : "Next"}
              <ArrowRight className="size-4" />
            </Button>
          ) : savedInvoiceId ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="size-4" />
                <span className="text-sm font-medium">Saved!</span>
              </div>
              {invoiceData && <InvoiceDownloadButton invoiceData={invoiceData} />}
              <Link href={`/dashboard/invoices/${savedInvoiceId}`}>
                <Button variant="outline" size="sm">View</Button>
              </Link>
              <Button size="sm" onClick={() => onInvoiceSaved?.(savedInvoiceId)}>
                Done
              </Button>
            </div>
          ) : (
            invoiceData && (
              <div className="flex items-center gap-2">
                <InvoiceDownloadButton invoiceData={invoiceData} />
              </div>
            )
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
