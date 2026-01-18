import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText } from "lucide-react"

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <Badge variant="secondary">Coming Soon</Badge>
      </div>

      <Card className="py-16">
        <CardContent className="flex flex-col items-center justify-center text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-muted mb-6">
            <FileText className="size-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Invoice Generation</h3>
          <p className="text-muted-foreground max-w-md">
            Generate professional invoices from your tracked time entries.
            This feature is currently in development and will be available soon.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
