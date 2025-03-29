"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LucideHome,
  LucideBookmark,
  LucideSettings,
  LucideHelpCircle,
  LucideLogOut,
  LucideChevronRight,
  LucideChevronLeft,
  LucideBookOpen,
  LucideUsers,
  LucideCompass,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

export function DashboardSidebar() {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    // Check if there's a saved preference
    const savedState = localStorage.getItem("sidebarExpanded")
    if (savedState !== null) {
      setExpanded(savedState === "true")
    }
  }, [])

  const toggleSidebar = () => {
    const newState = !expanded
    setExpanded(newState)
    localStorage.setItem("sidebarExpanded", String(newState))
  }

  return (
    <Sidebar
      className={`hidden md:flex border-r border-gray-200 transition-all duration-300 ${expanded ? "w-56" : "w-16"}`}
    >
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          {expanded && <span className="text-sm font-medium text-gray-500">MENU</span>}
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          >
            {expanded ? <LucideChevronLeft className="h-4 w-4" /> : <LucideChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/dashboard"}>
              <Link href="/dashboard" title="Dashboard">
                <LucideHome className="h-5 w-5 min-w-5" />
                {expanded && <span className="ml-3">Dashboard</span>}
                {!expanded && <span className="sr-only">Dashboard</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/dashboard/research-interests"}>
              <Link href="/dashboard/research-interests" title="My Research Interests">
                <LucideCompass className="h-5 w-5 min-w-5" />
                {expanded && <span className="ml-3">My Research Interests</span>}
                {!expanded && <span className="sr-only">My Research Interests</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/dashboard/saved-articles"}>
              <Link href="/dashboard/saved-articles" title="My Saved Articles">
                <LucideBookmark className="h-5 w-5 min-w-5" />
                {expanded && <span className="ml-3">My Saved Articles</span>}
                {!expanded && <span className="sr-only">My Saved Articles</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/dashboard/demo-doctor"}>
              <Link href="/dashboard/demo-doctor" title="Demo - Doctor View">
                <LucideUsers className="h-5 w-5 min-w-5" />
                {expanded && <span className="ml-3">Demo - Doctor View</span>}
                {!expanded && <span className="sr-only">Demo - Doctor View</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/dashboard/demo-patient"}>
              <Link href="/dashboard/demo-patient" title="Demo - Patient View">
                <LucideBookOpen className="h-5 w-5 min-w-5" />
                {expanded && <span className="ml-3">Demo - Patient View</span>}
                {!expanded && <span className="sr-only">Demo - Patient View</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/dashboard/settings" title="Settings">
                <LucideSettings className="h-5 w-5 min-w-5" />
                {expanded && <span className="ml-3">Settings</span>}
                {!expanded && <span className="sr-only">Settings</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/dashboard/help" title="Help">
                <LucideHelpCircle className="h-5 w-5 min-w-5" />
                {expanded && <span className="ml-3">Help</span>}
                {!expanded && <span className="sr-only">Help</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/" title="Logout">
                <LucideLogOut className="h-5 w-5 min-w-5" />
                {expanded && <span className="ml-3">Logout</span>}
                {!expanded && <span className="sr-only">Logout</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

