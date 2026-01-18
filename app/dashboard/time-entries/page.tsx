"use client"

import { useState, useMemo } from "react"
import { useTimeEntries, useProjects } from "@/lib/db/hooks"
import { formatDate, formatDuration, formatCurrency, calculateRevenue } from "@/lib/db/utils"
import { downloadJsonExport, downloadCsvExport } from "@/lib/db/operations/export"
import type { TimeEntry, DateRange } from "@/lib/db/schema"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ProjectSelector } from "@/components/project-selector"
import { TimeEntryForm } from "@/components/time-entry-form"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { StatsCard } from "@/components/stats-card"
import { Plus, Download, MoreHorizontal, Pencil, Trash2, Clock } from "lucide-react"

export default function TimeEntriesPage() {
  const [showEntryForm, setShowEntryForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [deletingEntry, setDeletingEntry] = useState<TimeEntry | null>(null)
  const [filterProjectId, setFilterProjectId] = useState<number | null>(null)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const dateRange: DateRange | undefined = useMemo(() => {
    if (startDate && endDate) {
      return {
        start: new Date(startDate),
        end: new Date(endDate),
      }
    }
    return undefined
  }, [startDate, endDate])

  const { entries, totalMinutes, deleteEntry, isLoading } = useTimeEntries({
    projectId: filterProjectId ?? undefined,
    dateRange,
  })

  const { projects } = useProjects()
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])

  const totalAmount = useMemo(() => {
    return entries.reduce((sum, entry) => {
      const project = projectMap.get(entry.projectId)
      return sum + (project ? calculateRevenue(entry.duration, project.hourlyRate) : 0)
    }, 0)
  }, [entries, projectMap])

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry)
    setShowEntryForm(true)
  }

  const handleDelete = async () => {
    if (deletingEntry?.id) {
      await deleteEntry(deletingEntry.id)
      setDeletingEntry(null)
    }
  }

  const handleExportJson = async () => {
    await downloadJsonExport()
  }

  const handleExportCsv = async () => {
    await downloadCsvExport()
  }

  const clearFilters = () => {
    setFilterProjectId(null)
    setStartDate("")
    setEndDate("")
  }

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [entries])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Time Entries</h1>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" className="gap-2" />}>
              <Download className="size-4" />
              Export
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleExportCsv}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJson}>
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setShowEntryForm(true)} className="gap-2">
            <Plus className="size-4" />
            Add Entry
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <ProjectSelector
                value={filterProjectId}
                onValueChange={setFilterProjectId}
                placeholder="All projects"
                showArchived
                className="w-48"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">From</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">To</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            {(filterProjectId || startDate || endDate) && (
              <Button variant="ghost" onClick={clearFilters} size="sm">
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard title="Total Entries" value={entries.length} />
        <StatsCard title="Total Hours" value={formatDuration(totalMinutes)} />
        <StatsCard title="Total Amount" value={formatCurrency(totalAmount)} />
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>
      ) : sortedEntries.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted mb-4">
              <Clock className="size-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No time entries</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {filterProjectId || dateRange
                ? "No entries match your filters."
                : "Start tracking time to see entries here."}
            </p>
            <Button onClick={() => setShowEntryForm(true)} className="gap-2">
              <Plus className="size-4" />
              Add Entry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Project</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Notes</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Duration</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Rate</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.map((entry) => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      projectMap={projectMap}
                      onEdit={handleEdit}
                      onDelete={setDeletingEntry}
                    />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/50">
                    <td colSpan={3} className="p-3 font-medium">Total</td>
                    <td className="text-right p-3 font-medium">{formatDuration(totalMinutes)}</td>
                    <td className="p-3"></td>
                    <td className="text-right p-3 font-medium">{formatCurrency(totalAmount)}</td>
                    <td className="p-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <TimeEntryForm
        open={showEntryForm}
        onOpenChange={(open) => {
          setShowEntryForm(open)
          if (!open) setEditingEntry(null)
        }}
        entry={editingEntry}
      />

      <ConfirmDialog
        open={!!deletingEntry}
        onOpenChange={(open) => !open && setDeletingEntry(null)}
        title="Delete time entry?"
        description="This will permanently delete this time entry. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}

interface EntryRowProps {
  entry: TimeEntry
  projectMap: Map<number | undefined, { id?: number; name: string; color: string; hourlyRate: number }>
  onEdit: (entry: TimeEntry) => void
  onDelete: (entry: TimeEntry) => void
}

function EntryRow({ entry, projectMap, onEdit, onDelete }: EntryRowProps) {
  const project = projectMap.get(entry.projectId)
  const amount = project ? calculateRevenue(entry.duration, project.hourlyRate) : 0

  return (
    <tr className="border-b hover:bg-muted/50 transition-colors">
      <td className="p-3 text-sm">{formatDate(entry.date)}</td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          {project && (
            <div
              className="size-3 rounded-full shrink-0"
              style={{ backgroundColor: project.color }}
            />
          )}
          <span className="text-sm">{project?.name ?? "Unknown"}</span>
        </div>
      </td>
      <td className="p-3 text-sm text-muted-foreground max-w-xs truncate">
        {entry.notes || "—"}
      </td>
      <td className="p-3 text-sm text-right">{formatDuration(entry.duration)}</td>
      <td className="p-3 text-sm text-right text-muted-foreground">
        ${project?.hourlyRate ?? 0}
      </td>
      <td className="p-3 text-sm text-right">{formatCurrency(amount)}</td>
      <td className="p-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(entry)}>
              <Pencil className="size-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(entry)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  )
}
