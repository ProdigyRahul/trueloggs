"use client"

import { useState, useRef } from "react"
import { useTheme } from "next-themes"
import { useSettings } from "@/lib/db/hooks"
import { downloadJsonExport } from "@/lib/db/operations/export"
import { importFromFile } from "@/lib/db/operations/import"
import { clearAllData } from "@/lib/db/operations/clear"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Download, Upload, Trash2 } from "lucide-react"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export default function SettingsPage() {
  const { settings, updateProfile, updateWorkSettings, isLoading } = useSettings()
  const { theme, setTheme } = useTheme()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)

  if (isLoading || !settings) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <div className="grid gap-6 lg:grid-cols-2 animate-pulse">
          <div className="h-48 bg-muted rounded-xl" />
          <div className="h-48 bg-muted rounded-xl" />
          <div className="h-48 bg-muted rounded-xl" />
          <div className="h-48 bg-muted rounded-xl" />
        </div>
      </div>
    )
  }

  const handleProfileChange = (field: string, value: string) => {
    updateProfile({ [field]: value })
  }

  const handleWorkSettingsChange = (field: string, value: number | boolean[]) => {
    updateWorkSettings({ [field]: value })
  }

  const toggleWorkDay = (index: number) => {
    const newWorkDays = [...settings.workSettings.workDays] as [boolean, boolean, boolean, boolean, boolean, boolean, boolean]
    newWorkDays[index] = !newWorkDays[index]
    updateWorkSettings({ workDays: newWorkDays })
  }

  const handleExport = async () => {
    await downloadJsonExport()
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportStatus("Importing...")
    const result = await importFromFile(file, { replace: false })

    if (result.success) {
      setImportStatus(`Imported ${result.projectsImported} projects, ${result.timeEntriesImported} entries`)
    } else {
      setImportStatus(`Import failed: ${result.errors.join(", ")}`)
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }

    setTimeout(() => setImportStatus(null), 5000)
  }

  const handleClearData = async () => {
    await clearAllData()
    setShowClearDialog(false)
  }

  const selectedDaysCount = settings.workSettings.workDays.filter(Boolean).length

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={settings.profile.fullName}
                  onChange={(e) => handleProfileChange("fullName", e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.profile.email}
                  onChange={(e) => handleProfileChange("email", e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={settings.profile.company}
                  onChange={(e) => handleProfileChange("company", e.target.value)}
                  placeholder="Company name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={settings.profile.phone}
                  onChange={(e) => handleProfileChange("phone", e.target.value)}
                  placeholder="Phone number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={settings.profile.address}
                onChange={(e) => handleProfileChange("address", e.target.value)}
                placeholder="Your address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={settings.profile.bio}
                onChange={(e) => handleProfileChange("bio", e.target.value)}
                placeholder="Short bio"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Work Settings</CardTitle>
            <CardDescription>Configure your work preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="targetHours">Target Hours Per Week</Label>
                <Input
                  id="targetHours"
                  type="number"
                  min="0"
                  max="168"
                  value={settings.workSettings.targetHoursPerWeek}
                  onChange={(e) =>
                    handleWorkSettingsChange("targetHoursPerWeek", parseInt(e.target.value) || 0)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultRate">Default Hourly Rate ($)</Label>
                <Input
                  id="defaultRate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.workSettings.defaultHourlyRate}
                  onChange={(e) =>
                    handleWorkSettingsChange("defaultHourlyRate", parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Work Days</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Select which days of the week you typically work
              </p>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day, index) => (
                  <Button
                    key={day}
                    type="button"
                    variant={settings.workSettings.workDays[index] ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleWorkDay(index)}
                  >
                    {day}
                  </Button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {selectedDaysCount} day{selectedDaysCount !== 1 ? "s" : ""} selected
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize the look of the application</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select value={theme} onValueChange={(value) => value && setTheme(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Export, import, or clear your local data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Backup & Restore</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Export your data as JSON for backup or import to restore from a previous backup.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleExport} className="gap-2">
                  <Download className="size-4" />
                  Export Data
                </Button>
                <Button variant="outline" onClick={handleImportClick} className="gap-2">
                  <Upload className="size-4" />
                  Import Data
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              {importStatus && (
                <p className="text-sm text-muted-foreground mt-2">{importStatus}</p>
              )}
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2 text-destructive">Danger Zone</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Permanently delete all your local data. This action cannot be undone.
              </p>
              <Button
                variant="destructive"
                onClick={() => setShowClearDialog(true)}
                className="gap-2"
              >
                <Trash2 className="size-4" />
                Clear All Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={showClearDialog}
        onOpenChange={setShowClearDialog}
        title="Clear all data?"
        description="This will permanently delete all your projects, time entries, and settings. This action cannot be undone."
        confirmLabel="Clear All Data"
        variant="destructive"
        onConfirm={handleClearData}
      />
    </div>
  )
}
