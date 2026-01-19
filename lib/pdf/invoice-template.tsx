"use client"

import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"
import type { InvoiceData } from "./invoice-types"

// Professional invoice color palette (always light theme for printing)
const COLORS = {
  primary: "#e11d48",
  text: "#1e293b",
  textMuted: "#64748b",
  border: "#e2e8f0",
  background: "#ffffff",
  headerBg: "#f8fafc",
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: COLORS.background,
    color: COLORS.text,
  },
  header: {
    marginBottom: 30,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  companyInfo: {
    fontSize: 9,
    color: COLORS.textMuted,
    lineHeight: 1.4,
  },
  companyName: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 5,
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    textAlign: "right",
    marginBottom: 5,
  },
  invoiceNumber: {
    fontSize: 10,
    textAlign: "right",
    color: COLORS.textMuted,
  },
  billToSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  billToRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  billToBlock: {
    width: "48%",
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: COLORS.textMuted,
    marginBottom: 5,
    textTransform: "uppercase",
  },
  clientName: {
    fontSize: 11,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 3,
  },
  projectName: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  infoRow: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.headerBg,
    padding: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  colDate: { width: "20%", fontSize: 9 },
  colDescription: { width: "40%", fontSize: 9 },
  colDuration: { width: "15%", textAlign: "right", fontSize: 9 },
  colRate: { width: "12%", textAlign: "right", fontSize: 9 },
  colAmount: { width: "13%", textAlign: "right", fontSize: 9 },
  summary: {
    marginTop: 20,
    marginLeft: "auto",
    width: "40%",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    fontSize: 9,
  },
  summaryRowTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: "bold",
    borderTopWidth: 2,
    borderColor: COLORS.primary,
    marginTop: 5,
  },
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    fontSize: 8,
    color: COLORS.textMuted,
  },
  footerText: {
    marginBottom: 5,
    lineHeight: 1.5,
  },
})

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

interface Props {
  data: InvoiceData
}

export function InvoiceDocument({ data }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{data.companyName}</Text>
            <View style={styles.companyInfo}>
              {data.companyEmail && <Text>{data.companyEmail}</Text>}
              {data.companyPhone && <Text>{data.companyPhone}</Text>}
              {data.companyAddress && <Text>{data.companyAddress}</Text>}
            </View>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{data.invoiceNumber}</Text>
          </View>
        </View>

        {/* Bill To & Invoice Details */}
        <View style={styles.billToSection}>
          <View style={styles.billToRow}>
            <View style={styles.billToBlock}>
              <Text style={styles.sectionTitle}>Bill To</Text>
              <Text style={styles.clientName}>{data.clientName}</Text>
              <Text style={styles.projectName}>Project: {data.projectName}</Text>
            </View>
            <View style={styles.billToBlock}>
              <Text style={styles.infoRow}>
                Invoice Date: {formatDate(data.invoiceDate)}
              </Text>
              <Text style={styles.infoRow}>
                Due Date: {formatDate(data.dueDate)}
              </Text>
              <Text style={styles.infoRow}>
                Period: {formatDate(data.lineItems[0].date)} - {formatDate(data.lineItems[data.lineItems.length - 1].date)}
              </Text>
            </View>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDate}>Date</Text>
            <Text style={styles.colDescription}>Description</Text>
            <Text style={styles.colDuration}>Duration</Text>
            <Text style={styles.colRate}>Rate</Text>
            <Text style={styles.colAmount}>Amount</Text>
          </View>
          {data.lineItems.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.colDate}>{formatDate(item.date)}</Text>
              <Text style={styles.colDescription}>{item.description}</Text>
              <Text style={styles.colDuration}>{formatDuration(item.duration)}</Text>
              <Text style={styles.colRate}>{formatCurrency(item.rate)}/hr</Text>
              <Text style={styles.colAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text>Subtotal:</Text>
            <Text>{formatCurrency(data.subtotal)}</Text>
          </View>
          {data.taxRate > 0 && (
            <View style={styles.summaryRow}>
              <Text>Tax ({data.taxRate}%):</Text>
              <Text>{formatCurrency(data.taxAmount)}</Text>
            </View>
          )}
          <View style={styles.summaryRowTotal}>
            <Text>Total:</Text>
            <Text>{formatCurrency(data.total)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {data.paymentTerms && (
            <Text style={styles.footerText}>Payment Terms: {data.paymentTerms}</Text>
          )}
          {data.notes && (
            <Text style={styles.footerText}>Notes: {data.notes}</Text>
          )}
          <Text style={styles.footerText}>
            Thank you for your business!
          </Text>
        </View>
      </Page>
    </Document>
  )
}
