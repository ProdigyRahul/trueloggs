"use client"

import { useState, useEffect } from "react"
import { useTimeEntries, useProject } from "@/lib/db/hooks"
import { normalizeDate } from "@/lib/db/utils"
import type { TimeEntry, CreateTimeEntryInput, UpdateTimeEntryInput } from "@/lib/db/schema"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ProjectSelector } from "@/components/project-selector"
import { DurationInput } from "@/components/duration-input"

interface TimeEntryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry?: TimeEntry | null
  defaultProjectId?: number | null
  onSuccess?: () => void
}

export function TimeEntryForm({
  open,
  onOpenChange,
  entry,
  defaultProjectId,
  onSuccess,
}: TimeEntryFormProps) {
  const { createEntry, updateEntry } = useTimeEntries()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [projectId, setProjectId] = useState<number | null>(null)
  const [date, setDate] = useState("")
  const [duration, setDuration] = useState(60)
  const [notes, setNotes] = useState("")

  const { project } = useProject(projectId ?? undefined)

  useEffect(() => {
    if (open) {
      if (entry) {
        setProjectId(entry.projectId)
        setDate(entry.date.toISOString().split("T")[0])
        setDuration(entry.duration)
        setNotes(entry.notes ?? "")
      } else {
        setProjectId(defaultProjectId ?? null)
        setDate(new Date().toISOString().split("T")[0])
        setDuration(60)
        setNotes("")
      }
    }
  }, [open, entry, defaultProjectId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId || !date) return

    setIsSubmitting(true)
    try {
      if (entry?.id) {
        const updates: UpdateTimeEntryInput = {
          projectId,
          date: normalizeDate(new Date(date)),
          duration,
          notes: notes.trim() || undefined,
        }
        await updateEntry(entry.id, updates)
      } else {
        const input: CreateTimeEntryInput = {
          projectId,
          date: normalizeDate(new Date(date)),
          duration,
          notes: notes.trim() || undefined,
        }
        await createEntry(input)
      }
      onOpenChange(false)
      onSuccess?.()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <SheetHeader>
            <SheetTitle>
              {entry ? "Edit Time Entry" : "Add Manual Entry"}
            </SheetTitle>
            <SheetDescription>
              {entry
                ? "Update the time entry details."
                : "Manually log time for a project."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 py-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <ProjectSelector
                value={projectId}
                onValueChange={setProjectId}
                placeholder="Select a project"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <DurationInput value={duration} onValueChange={setDuration} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What did you work on?"
                rows={3}
              />
            </div>

            {project && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="size-3 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="font-medium">{project.name}</span>
                </div>
                <div className="text-muted-foreground">
                  Rate: ${project.hourlyRate}/hr
                  {duration > 0 && (
                    <> &bull; Amount: ${((duration / 60) * project.hourlyRate).toFixed(2)}</>
                  )}
                </div>
              </div>
            )}
          </div>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !projectId}>
              {isSubmitting ? "Saving..." : entry ? "Save Changes" : "Add Entry"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
