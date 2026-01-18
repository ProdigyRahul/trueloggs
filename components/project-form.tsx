"use client"

import { useState, useEffect } from "react"
import { useSettings, useProjects } from "@/lib/db/hooks"
import { generateProjectColor } from "@/lib/db/utils"
import type { Project, CreateProjectInput, UpdateProjectInput } from "@/lib/db/schema"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ColorPicker } from "@/components/color-picker"

interface ProjectFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project | null
  onSuccess?: () => void
}

export function ProjectForm({
  open,
  onOpenChange,
  project,
  onSuccess,
}: ProjectFormProps) {
  const { settings } = useSettings()
  const { createProject, updateProject } = useProjects()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [name, setName] = useState("")
  const [clientName, setClientName] = useState("")
  const [hourlyRate, setHourlyRate] = useState(50)
  const [color, setColor] = useState(generateProjectColor())

  useEffect(() => {
    if (open) {
      if (project) {
        setName(project.name)
        setClientName(project.clientName ?? "")
        setHourlyRate(project.hourlyRate)
        setColor(project.color)
      } else {
        setName("")
        setClientName("")
        setHourlyRate(settings?.workSettings.defaultHourlyRate ?? 50)
        setColor(generateProjectColor())
      }
    }
  }, [open, project, settings])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    try {
      if (project?.id) {
        const updates: UpdateProjectInput = {
          name: name.trim(),
          clientName: clientName.trim() || undefined,
          hourlyRate,
          color,
        }
        await updateProject(project.id, updates)
      } else {
        const input: CreateProjectInput = {
          name: name.trim(),
          clientName: clientName.trim() || undefined,
          hourlyRate,
          color,
          status: "active",
        }
        await createProject(input)
      }
      onOpenChange(false)
      onSuccess?.()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <form onSubmit={handleSubmit}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {project ? "Edit Project" : "Add New Project"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {project
                ? "Update the project details below."
                : "Create a new project to track time against."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Website Redesign"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client">Client Name</Label>
              <Input
                id="client"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g., Acme Corp"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate">Hourly Rate ($)</Label>
              <Input
                id="rate"
                type="number"
                min="0"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <ColorPicker value={color} onValueChange={setColor} />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? "Saving..." : project ? "Save Changes" : "Add Project"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
