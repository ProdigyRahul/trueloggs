"use client"

import { useEffect, useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface WeeklyChartData {
  day: string
  hours: number
  date: Date
}

interface WeeklyChartProps {
  data: WeeklyChartData[]
  targetHoursPerDay?: number
  className?: string
}

export function WeeklyChart({
  data,
  targetHoursPerDay = 8,
  className,
}: WeeklyChartProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [primaryColor, setPrimaryColor] = useState("#ec4899")

  useEffect(() => {
    setIsMounted(true)

    const computeColor = () => {
      const style = getComputedStyle(document.documentElement)
      const primary = style.getPropertyValue("--primary").trim()
      if (primary) {
        setPrimaryColor(primary)
      }
    }
    computeColor()

    const observer = new MutationObserver(computeColor)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  const chartData = data.map((d) => ({
    ...d,
    hours: Math.round(d.hours * 10) / 10,
  }))

  const maxHours = Math.max(...chartData.map((d) => d.hours), targetHoursPerDay)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Weekly Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 w-full min-w-0">
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "currentColor" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "currentColor" }}
                  domain={[0, Math.ceil(maxHours)]}
                  tickFormatter={(value) => `${value}h`}
                />
                <Tooltip
                  cursor={{ fill: "currentColor", opacity: 0.1 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="rounded-md bg-popover px-3 py-2 text-sm shadow-md border">
                          <p className="font-medium">{data.day}</p>
                          <p className="text-muted-foreground">
                            {data.hours}h tracked
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={primaryColor}
                      fillOpacity={entry.hours >= targetHoursPerDay ? 1 : 0.6}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full rounded-md bg-muted/40 animate-pulse" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
