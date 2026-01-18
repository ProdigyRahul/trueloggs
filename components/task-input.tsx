"use client"

import { useState, useMemo } from "react"
import { useRecentTasks } from "@/lib/db/hooks"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface TaskInputProps {
  projectId: number | null
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function TaskInput({
  projectId,
  value,
  onValueChange,
  disabled = false,
  placeholder = "What are you working on?",
  className,
}: TaskInputProps) {
  const { recentTasks } = useRecentTasks(projectId ?? undefined)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [inputValue, setInputValue] = useState(value)

  const filteredSuggestions = useMemo(() => {
    if (!inputValue.trim()) return recentTasks
    const lower = inputValue.toLowerCase()
    return recentTasks.filter((task) =>
      task.taskDescription.toLowerCase().includes(lower)
    )
  }, [recentTasks, inputValue])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    onValueChange(newValue)
    setShowSuggestions(true)
  }

  const handleSelectSuggestion = (description: string) => {
    setInputValue(description)
    onValueChange(description)
    setShowSuggestions(false)
  }

  const handleBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200)
  }

  return (
    <div className={cn("relative", className)}>
      <Input
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setShowSuggestions(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled || !projectId}
        className="w-full"
      />
      {showSuggestions && filteredSuggestions.length > 0 && projectId && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-48 overflow-auto">
          {filteredSuggestions.map((task) => (
            <button
              key={task.id}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
              onClick={() => handleSelectSuggestion(task.taskDescription)}
            >
              {task.taskDescription}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
