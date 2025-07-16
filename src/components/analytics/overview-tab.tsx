"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Eye, TrendingUp, BarChart } from "lucide-react"

const overviewData = [
  {
    title: "Total Visitors",
    value: "10,293",
    change: "+12.5%",
    icon: <Users />,
  },
  {
    title: "Page Views",
    value: "23,489",
    change: "+8.2%",
    icon: <Eye />,
  },
  {
    title: "Conversion Rate",
    value: "5.7%",
    change: "+2.1%",
    icon: <TrendingUp />,
  },
  {
    title: "Bounce Rate",
    value: "45.2%",
    change: "-1.5%",
    icon: <BarChart />,
  },
]

export function OverviewTab() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {overviewData.map((data, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{data.title}</CardTitle>
            {data.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.value}</div>
            <p
              className={`text-xs ${
                data.change.startsWith("+")
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              {data.change} vs. last month
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
