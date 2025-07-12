"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, LineChart } from "lucide-react"
import {
  ResponsiveContainer,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
} from "recharts"

const analyticsData = {
  sessionsBySource: [
    { source: "Direct", sessions: 4500, fill: "#3b82f6" },
    { source: "Organic Search", sessions: 2800, fill: "#10b981" },
    { source: "Referral", sessions: 1200, fill: "#f97316" },
    { source: "Social", sessions: 900, fill: "#8b5cf6" },
    { source: "Email", sessions: 500, fill: "#ec4899" },
  ],
  pageViews: [
    { path: "/home", views: 12500 },
    { path: "/pricing", views: 9800 },
    { path: "/features", views: 7200 },
    { path: "/blog", views: 5400 },
    { path: "/contact", views: 3100 },
  ],
  bounceRate: [
    { date: "2023-01-01", rate: 45 },
    { date: "2023-01-02", rate: 42 },
    { date: "2023-01-03", rate: 48 },
    { date: "2023-01-04", rate: 40 },
    { date: "2023-01-05", rate: 38 },
    { date: "2023-01-06", rate: 41 },
    { date: "2023-01-07", rate: 39 },
  ],
  avgSessionDuration: [
    { date: "2023-01-01", duration: 180 },
    { date: "2023-01-02", duration: 195 },
    { date: "2023-01-03", duration: 170 },
    { date: "2023-01-04", duration: 210 },
    { date: "2023-01-05", duration: 220 },
    { date: "2023-01-06", duration: 205 },
    { date: "2023-01-07", duration: 215 },
  ],
}

export function AnalyticsTab() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Sessions by Source</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={analyticsData.sessionsBySource}>
              <XAxis
                dataKey="source"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip />
              <Legend />
              <Bar dataKey="sessions" fill="#adfa1d" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Top Pages by Views</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={analyticsData.pageViews} layout="vertical">
              <XAxis type="number" hide />
              <YAxis
                dataKey="path"
                type="category"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip />
              <Legend />
              <Bar dataKey="views" fill="#8884d8" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Bounce Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={analyticsData.bounceRate}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#ff7300"
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Average Session Duration</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={analyticsData.avgSessionDuration}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="duration" stroke="#387908" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
