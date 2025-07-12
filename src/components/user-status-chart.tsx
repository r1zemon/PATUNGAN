"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

const data = [
  { name: "Aktif", value: 165, color: "#10b981" },
  { name: "Belum Verifikasi", value: 58, color: "#f59e0b" },
  { name: "Diblokir", value: 24, color: "#ef4444" },
]

export function UserStatusChart() {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 flex justify-center space-x-4">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center text-sm">
            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: entry.color }} />
            <span>{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
