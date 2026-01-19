export interface InvoiceLineItem {
  date: Date
  description: string
  duration: number
  rate: number
  amount: number
}

export interface InvoiceData {
  invoiceNumber: string
  invoiceDate: Date
  dueDate: Date

  companyName: string
  companyEmail: string
  companyPhone: string
  companyAddress: string

  clientName: string
  projectName: string
  projectColor: string

  lineItems: InvoiceLineItem[]

  subtotal: number
  taxRate: number
  taxAmount: number
  total: number

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
