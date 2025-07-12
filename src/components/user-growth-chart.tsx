"use client"

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const data = [
  { month: "Jan", users: 120 },
  { month: "Feb", users: 145 },
  { month: "Mar", users: 180 },
  { month: "Apr", users: 210 },
  { month: "May", users: 240 },
  { month: "Jun", users: 247 },
]

export function UserGrowthChart() {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip />
          <Line type="monotone" dataKey="users" stroke="#64748b" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
