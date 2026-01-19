"use client"

import { useState } from "react"
import { pdf } from "@react-pdf/renderer"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { InvoiceDocument } from "@/lib/pdf/invoice-template"
import { generateInvoiceFilename } from "@/lib/pdf/invoice-generator"
import type { InvoiceData } from "@/lib/pdf/invoice-types"

interface Props {
  invoiceData: InvoiceData
  disabled?: boolean
}

export function InvoiceDownloadButton({ invoiceData, disabled }: Props) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const blob = await pdf(<InvoiceDocument data={invoiceData} />).toBlob()

      if (!blob || blob.size === 0) {
        throw new Error("Failed to generate PDF")
      }

      const url = URL.createObjectURL(blob)
      const filename = generateInvoiceFilename(
        invoiceData.invoiceNumber,
        invoiceData.clientName
      )

      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("PDF generation error:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div>
      <Button
        onClick={handleDownload}
        disabled={isGenerating || disabled}
        className="gap-2"
      >
        <Download className="size-4" />
        {isGenerating ? "Generating PDF..." : "Download Invoice PDF"}
      </Button>
      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}
    </div>
  )
}
