export interface InvoiceLineItem {
  date: Date
  description: string
  duration: number // minutes
  rate: number
  amount: number
}

export interface InvoiceData {
  // Invoice metadata
  invoiceNumber: string
  invoiceDate: Date
  dueDate: Date

  // Company info (from settings.profile)
  companyName: string
  companyEmail: string
  companyPhone: string
  companyAddress: string

  // Client info (from project)
  clientName: string
  projectName: string
  projectColor: string

  // Line items (grouped by date)
  lineItems: InvoiceLineItem[]

  // Totals
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number

  // Optional fields
  notes?: string
  paymentTerms?: string
}

export interface InvoiceFormData {
  projectId: number
  periodStart: Date
  periodEnd: Date
  clientName: string
  clientEmail?: string
  taxRate: number
  notes?: string
  dueInDays: number
}
