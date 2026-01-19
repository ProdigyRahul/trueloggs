"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { InvoiceWizard } from "@/components/invoice-wizard"
import { Plus, FileText, X } from "lucide-react"

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
            <h3 className="font-semibold mb-1">Generate Professional Invoices</h3>
            <p className="text-muted-foreground text-sm mb-4 max-w-md">
              Create PDF invoices from your tracked time entries. Select a project,
              configure details, and download a professional invoice ready to send to your clients.
            </p>
            <Button onClick={() => setShowWizard(true)} className="gap-2">
              <Plus className="size-4" />
              Create Your First Invoice
            </Button>
          </CardContent>
        </Card>
      )}

      <InvoiceWizard open={showWizard} onOpenChange={setShowWizard} />
    </div>
  )
}
