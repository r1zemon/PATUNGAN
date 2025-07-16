"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

const reportsData = [
  {
    title: "Monthly Sales Report",
    date: "2023-01-31",
    description: "A summary of sales for January 2023.",
  },
  {
    title: "Quarterly User Growth Report",
    date: "2023-03-31",
    description: "An analysis of user growth in Q1 2023.",
  },
  {
    title: "Annual Financial Statement",
    date: "2022-12-31",
    description: "A comprehensive financial overview of 2022.",
  },
  {
    title: "Marketing Campaign Performance",
    date: "2023-02-28",
    description: "An evaluation of the February marketing campaign.",
  },
]

export function ReportsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reports</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {reportsData.map((report, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-start space-x-4">
                <FileText className="w-6 h-6 text-gray-500" />
                <div>
                  <p className="font-medium">{report.title}</p>
                  <p className="text-sm text-gray-500">{report.description}</p>
                  <p className="text-xs text-gray-400">
                    Generated on {report.date}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
