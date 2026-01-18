"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface DurationInputProps {
  value: number
  onValueChange: (minutes: number) => void
  className?: string
  disabled?: boolean
}

export function DurationInput({
  value,
  onValueChange,
  className,
  disabled = false,
}: DurationInputProps) {
  const [hours, setHours] = useState(Math.floor(value / 60))
  const [minutes, setMinutes] = useState(value % 60)

  useEffect(() => {
    setHours(Math.floor(value / 60))
    setMinutes(value % 60)
  }, [value])

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const h = Math.max(0, parseInt(e.target.value) || 0)
    setHours(h)
    onValueChange(h * 60 + minutes)
  }

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const m = Math.min(59, Math.max(0, parseInt(e.target.value) || 0))
    setMinutes(m)
    onValueChange(hours * 60 + m)
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Input
        type="number"
        min="0"
        value={hours}
        onChange={handleHoursChange}
        className="w-16 text-center"
        disabled={disabled}
      />
      <span className="text-muted-foreground">h</span>
      <Input
        type="number"
        min="0"
        max="59"
        value={minutes}
        onChange={handleMinutesChange}
        className="w-16 text-center"
        disabled={disabled}
      />
      <span className="text-muted-foreground">m</span>
    </div>
  )
}
