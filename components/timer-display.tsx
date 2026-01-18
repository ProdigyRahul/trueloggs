import { cn } from "@/lib/utils"

interface TimerDisplayProps {
  time: string
  isRunning: boolean
  isPaused: boolean
  size?: "default" | "large"
  className?: string
}

export function TimerDisplay({
  time,
  isRunning,
  isPaused,
  size = "default",
  className,
}: TimerDisplayProps) {
  return (
    <div
      className={cn(
        "font-mono tabular-nums tracking-tight",
        size === "default" && "text-4xl",
        size === "large" && "text-6xl md:text-8xl",
        isRunning && "text-primary",
        isPaused && "text-muted-foreground animate-pulse",
        !isRunning && !isPaused && "text-muted-foreground/50",
        className
      )}
    >
      {time}
    </div>
  )
}
