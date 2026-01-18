"use client"

import { useProjects } from "@/lib/db/hooks"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface ProjectSelectorProps {
  value: number | null
  onValueChange: (projectId: number | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  showArchived?: boolean
}

export function ProjectSelector({
  value,
  onValueChange,
  placeholder = "Select a project",
  disabled = false,
  className,
  showArchived = false,
}: ProjectSelectorProps) {
  const { projects } = useProjects(showArchived ? undefined : "active")

  const handleValueChange = (val: string | null) => {
    if (!val || val === "none") {
      onValueChange(null)
    } else {
      onValueChange(parseInt(val, 10))
    }
  }

  return (
    <Select
      value={value?.toString() ?? ""}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder}>
          {value && projects.find((p) => p.id === value) ? (
            <div className="flex items-center gap-2">
              <div
                className="size-3 rounded-full shrink-0"
                style={{ backgroundColor: projects.find((p) => p.id === value)?.color }}
              />
              <span className="truncate">
                {projects.find((p) => p.id === value)?.name}
              </span>
            </div>
          ) : (
            placeholder
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {projects.length === 0 ? (
          <div className="py-2 px-2 text-sm text-muted-foreground">
            No projects found
          </div>
        ) : (
          projects.map((project) => (
            <SelectItem key={project.id} value={project.id!.toString()}>
              <div className="flex items-center gap-2">
                <div
                  className="size-3 rounded-full shrink-0"
                  style={{ backgroundColor: project.color }}
                />
                <span>{project.name}</span>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}
