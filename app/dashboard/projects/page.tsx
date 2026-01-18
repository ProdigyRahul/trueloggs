"use client"

import { useState } from "react"
import { useProjects } from "@/lib/db/hooks"
import { formatDuration, formatCurrency } from "@/lib/db/utils"
import type { ProjectStatus } from "@/lib/db/schema"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ProjectForm } from "@/components/project-form"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Plus, MoreHorizontal, Pencil, Archive, ArchiveRestore, Trash2, FolderKanban } from "lucide-react"
import type { Project } from "@/lib/db/schema"

type FilterStatus = "all" | ProjectStatus

export default function ProjectsPage() {
  const [filter, setFilter] = useState<FilterStatus>("all")
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)

  const { projectsWithStats, archiveProject, unarchiveProject, deleteProject, isLoading } =
    useProjects(filter === "all" ? undefined : filter)

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setShowProjectForm(true)
  }

  const handleDelete = async () => {
    if (deletingProject?.id) {
      await deleteProject(deletingProject.id)
      setDeletingProject(null)
    }
  }

  const handleArchiveToggle = async (project: Project) => {
    if (!project.id) return
    if (project.status === "archived") {
      await unarchiveProject(project.id)
    } else {
      await archiveProject(project.id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Button onClick={() => setShowProjectForm(true)} className="gap-2">
          <Plus className="size-4" />
          Add Project
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button
          variant={filter === "active" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("active")}
        >
          Active
        </Button>
        <Button
          variant={filter === "archived" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("archived")}
        >
          Archived
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : projectsWithStats.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted mb-4">
              <FolderKanban className="size-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No projects yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Create your first project to start tracking time.
            </p>
            <Button onClick={() => setShowProjectForm(true)} className="gap-2">
              <Plus className="size-4" />
              Add Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projectsWithStats.map((project) => (
            <Card key={project.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="size-4 rounded-full shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <CardTitle className="text-base">{project.name}</CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(project)}>
                        <Pencil className="size-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleArchiveToggle(project)}>
                        {project.status === "archived" ? (
                          <>
                            <ArchiveRestore className="size-4 mr-2" />
                            Unarchive
                          </>
                        ) : (
                          <>
                            <Archive className="size-4 mr-2" />
                            Archive
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeletingProject(project)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="size-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {project.status === "archived" && (
                  <Badge variant="secondary" className="w-fit mt-1">
                    Archived
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="pb-2">
                {project.clientName && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {project.clientName}
                  </p>
                )}
                <p className="text-sm">
                  <span className="font-medium">${project.hourlyRate}</span>
                  <span className="text-muted-foreground">/hr</span>
                </p>
              </CardContent>
              <CardFooter className="pt-2 border-t text-sm text-muted-foreground">
                <div className="flex justify-between w-full">
                  <span>{formatDuration(project.totalMinutes)}</span>
                  <span>{formatCurrency(project.totalRevenue)}</span>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <ProjectForm
        open={showProjectForm}
        onOpenChange={(open) => {
          setShowProjectForm(open)
          if (!open) setEditingProject(null)
        }}
        project={editingProject}
      />

      <ConfirmDialog
        open={!!deletingProject}
        onOpenChange={(open) => !open && setDeletingProject(null)}
        title="Delete project?"
        description={`This will permanently delete "${deletingProject?.name}" and all its time entries. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
