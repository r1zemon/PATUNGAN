"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const data = [
  { day: "Mon", sessions: 20 },
  { day: "Tue", sessions: 35 },
  { day: "Wed", sessions: 42 },
  { day: "Thu", sessions: 30 },
  { day: "Fri", sessions: 55 },
  { day: "Sat", sessions: 60 },
  { day: "Sun", sessions: 48 },
]

export function UserActivityChart() {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip />
          <Bar dataKey="sessions" fill="#64748b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
