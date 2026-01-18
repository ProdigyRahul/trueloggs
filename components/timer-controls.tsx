"use client"

import { Play, Pause, Square, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { useState } from "react"

interface TimerControlsProps {
  isRunning: boolean
  isPaused: boolean
  canStart: boolean
  onStart: () => void
  onStop: () => void
  onPause: () => void
  onResume: () => void
  onDiscard: () => void
  disabled?: boolean
}

export function TimerControls({
  isRunning,
  isPaused,
  canStart,
  onStart,
  onStop,
  onPause,
  onResume,
  onDiscard,
  disabled = false,
}: TimerControlsProps) {
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)

  return (
    <>
      <div className="flex items-center gap-2">
        {canStart && (
          <Button size="lg" onClick={onStart} disabled={disabled} className="gap-2">
            <Play className="size-5" />
            Start
          </Button>
        )}

        {isRunning && (
          <Button size="lg" variant="outline" onClick={onPause} className="gap-2">
            <Pause className="size-5" />
            Pause
          </Button>
        )}

        {isPaused && (
          <Button size="lg" onClick={onResume} className="gap-2">
            <Play className="size-5" />
            Resume
          </Button>
        )}

        {(isRunning || isPaused) && (
          <Button size="lg" variant="secondary" onClick={onStop} className="gap-2">
            <Square className="size-5" />
            Stop
          </Button>
        )}

        {isPaused && (
          <Button
            size="lg"
            variant="ghost"
            onClick={() => setShowDiscardDialog(true)}
            className="gap-2 text-destructive hover:text-destructive"
          >
            <RotateCcw className="size-5" />
            Discard
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={showDiscardDialog}
        onOpenChange={setShowDiscardDialog}
        title="Discard timer?"
        description="This will discard all tracked time without saving. This action cannot be undone."
        confirmLabel="Discard"
        variant="destructive"
        onConfirm={() => {
          onDiscard()
          setShowDiscardDialog(false)
        }}
      />
    </>
  )
}
