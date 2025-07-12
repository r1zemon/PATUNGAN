"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface Settings {
  avatar: string
  fullName: string
  email: string
  phone: string
  timezone: string
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
    accountActivity: boolean
    newFeatures: boolean
    marketing: boolean
    frequency: string
  }
  privacy: {
    analyticsSharing: boolean
    personalizedAds: boolean
    visibility: string
    dataRetention: string
  }
}

interface SettingsContextType {
  settings: Settings
  updateSettings: (newSettings: Partial<Omit<Settings, "notifications" | "privacy">>) => void
  updateNotificationSettings: (newSettings: Partial<Settings["notifications"]>) => void
  updatePrivacySettings: (newSettings: Partial<Settings["privacy"]>) => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>({
    avatar: "/placeholder.svg",
    fullName: "Admin",
    email: "qiyashabul22@gmail.com",
    phone: "123-456-7890",
    timezone: "utc+7",
    notifications: {
      email: true,
      push: false,
      sms: false,
      accountActivity: true,
      newFeatures: true,
      marketing: false,
      frequency: "real-time",
    },
    privacy: {
      analyticsSharing: true,
      personalizedAds: false,
      visibility: "public",
      dataRetention: "1-year",
    },
  })

  const updateSettings = (newSettings: Partial<Omit<Settings, "notifications" | "privacy">>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }))
  }

  const updateNotificationSettings = (newSettings: Partial<Settings["notifications"]>) => {
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, ...newSettings },
    }))
  }

  const updatePrivacySettings = (newSettings: Partial<Settings["privacy"]>) => {
    setSettings((prev) => ({
      ...prev,
      privacy: { ...prev.privacy, ...newSettings },
    }))
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, updateNotificationSettings, updatePrivacySettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}
