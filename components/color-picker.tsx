"use client"

import { cn } from "@/lib/utils"
import { getProjectColors } from "@/lib/db/utils"
import { Check } from "lucide-react"

interface ColorPickerProps {
  value: string
  onValueChange: (color: string) => void
  className?: string
}

export function ColorPicker({ value, onValueChange, className }: ColorPickerProps) {
  const colors = getProjectColors()

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onValueChange(color)}
          className={cn(
            "size-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            value === color && "ring-2 ring-ring ring-offset-2"
          )}
          style={{ backgroundColor: color }}
        >
          {value === color && <Check className="size-4 text-white" />}
        </button>
      ))}
    </div>
  )
}
