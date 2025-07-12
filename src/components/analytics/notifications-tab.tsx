"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, Mail, MessageSquare } from "lucide-react"

const notificationsData = [
  {
    type: "New Follower",
    message: "John Doe started following you.",
    time: "2 hours ago",
    icon: <Bell className="w-5 h-5 text-blue-500" />,
  },
  {
    type: "New Message",
    message: "You have a new message from Jane Smith.",
    time: "4 hours ago",
    icon: <Mail className="w-5 h-5 text-green-500" />,
  },
  {
    type: "New Comment",
    message: "Someone commented on your post.",
    time: "1 day ago",
    icon: <MessageSquare className="w-5 h-5 text-purple-500" />,
  },
  {
    type: "New Follower",
    message: "Alex Johnson started following you.",
    time: "2 days ago",
    icon: <Bell className="w-5 h-5 text-blue-500" />,
  },
]

export function NotificationsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {notificationsData.map((notification, index) => (
            <div key={index} className="flex items-start space-x-4">
              <div className="flex-shrink-0">{notification.icon}</div>
              <div className="flex-grow">
                <p className="font-medium">{notification.type}</p>
                <p className="text-sm text-gray-500">{notification.message}</p>
                <p className="text-xs text-gray-400">{notification.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
