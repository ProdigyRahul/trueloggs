"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { InvoiceWizard } from "@/components/invoice-wizard"
import { Plus, X, FileText, Clock, DollarSign, Download } from "lucide-react"

export default function InvoicesPage() {
  const [showWizard, setShowWizard] = useState(false)

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

      {!showWizard && (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted mb-4">
              <FileText className="size-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Generate Professional Invoices</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-md">
              Create PDF invoices from your tracked time entries. Select a project,
              configure details, and download a professional invoice ready to send to your clients.
            </p>
            <div className="grid gap-4 sm:grid-cols-3 text-sm">
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50">
                <Clock className="size-5 text-muted-foreground" />
                <span className="font-medium">Track Time</span>
                <span className="text-xs text-muted-foreground">Log your work hours</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50">
                <DollarSign className="size-5 text-muted-foreground" />
                <span className="font-medium">Set Rates</span>
                <span className="text-xs text-muted-foreground">Configure hourly rates</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50">
                <Download className="size-5 text-muted-foreground" />
                <span className="font-medium">Export PDF</span>
                <span className="text-xs text-muted-foreground">Download & send</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <InvoiceWizard open={showWizard} />
    </div>
  )
}
