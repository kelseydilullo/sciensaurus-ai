"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
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
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { SciensaurusLogo } from "./sciensaurus-logo"

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuth()
  const [expanded, setExpanded] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

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
    
    // Store in localStorage and dispatch a storage event for other components to detect
    localStorage.setItem("sidebarExpanded", String(newState))
    
    // Dispatch a storage event to notify other components
    window.dispatchEvent(new Event('storage'))
  }

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      console.log("Logging out...")
      const { error } = await signOut()
      
      if (error) {
        console.error("Error during logout:", error)
        setIsLoggingOut(false)
      } else {
        console.log("Successfully logged out, redirecting to home")
        // Redirect to home page after successful logout
        router.push("/")
      }
    } catch (error) {
      console.error("Unexpected error during logout:", error)
      setIsLoggingOut(false)
    }
  }

  return (
    <Sidebar
      className={`h-screen border-r border-gray-200 transition-all duration-300 bg-white shadow-sm ${expanded ? "w-64" : "w-20"}`}
    >
      <SidebarHeader className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          {expanded ? (
            <Link href="/dashboard" className="flex items-center">
              <SciensaurusLogo className="h-8 w-8 text-[#1e3a6d]" />
              <span className="ml-2 font-bold text-[#1e3a6d] text-lg">Sciensaurus</span>
            </Link>
          ) : (
            <Link href="/dashboard">
              <SciensaurusLogo className="h-8 w-8 text-[#1e3a6d]" />
            </Link>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            {expanded ? <LucideChevronLeft className="h-4 w-4" /> : <LucideChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="py-4 overflow-y-auto">
        <div className={expanded ? "px-4 mb-4" : "px-2 mb-4"}>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider pl-2 mb-2">
            {expanded && "Main Menu"}
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard"}>
                <Link href="/dashboard" className="transition-colors duration-200">
                  <div className="flex items-center py-2 px-2 rounded-md hover:bg-blue-50">
                    <div className={pathname === "/dashboard" ? "text-[#1e3a6d]" : "text-gray-500"}>
                      <LucideHome className="h-5 w-5 min-w-5" />
                    </div>
                    {expanded && <span className={`ml-3 ${pathname === "/dashboard" ? "font-medium text-[#1e3a6d]" : "text-gray-700"}`}>Dashboard</span>}
                    {!expanded && <span className="sr-only">Dashboard</span>}
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard/research-interests"}>
                <Link href="/dashboard/research-interests" className="transition-colors duration-200">
                  <div className="flex items-center py-2 px-2 rounded-md hover:bg-blue-50">
                    <div className={pathname === "/dashboard/research-interests" ? "text-[#1e3a6d]" : "text-gray-500"}>
                      <LucideCompass className="h-5 w-5 min-w-5" />
                    </div>
                    {expanded && <span className={`ml-3 ${pathname === "/dashboard/research-interests" ? "font-medium text-[#1e3a6d]" : "text-gray-700"}`}>My Research Interests</span>}
                    {!expanded && <span className="sr-only">My Research Interests</span>}
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard/saved-articles"}>
                <Link href="/dashboard/saved-articles" className="transition-colors duration-200">
                  <div className="flex items-center py-2 px-2 rounded-md hover:bg-blue-50">
                    <div className={pathname === "/dashboard/saved-articles" ? "text-[#1e3a6d]" : "text-gray-500"}>
                      <LucideBookmark className="h-5 w-5 min-w-5" />
                    </div>
                    {expanded && <span className={`ml-3 ${pathname === "/dashboard/saved-articles" ? "font-medium text-[#1e3a6d]" : "text-gray-700"}`}>My Saved Articles</span>}
                    {!expanded && <span className="sr-only">My Saved Articles</span>}
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
        
        <div className={expanded ? "px-4 mb-4" : "px-2 mb-4"}>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider pl-2 mb-2">
            {expanded && "Demo"}
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard/demo-doctor"}>
                <Link href="/dashboard/demo-doctor" className="transition-colors duration-200">
                  <div className="flex items-center py-2 px-2 rounded-md hover:bg-blue-50">
                    <div className={pathname === "/dashboard/demo-doctor" ? "text-[#1e3a6d]" : "text-gray-500"}>
                      <LucideUsers className="h-5 w-5 min-w-5" />
                    </div>
                    {expanded && <span className={`ml-3 ${pathname === "/dashboard/demo-doctor" ? "font-medium text-[#1e3a6d]" : "text-gray-700"}`}>Doctor View</span>}
                    {!expanded && <span className="sr-only">Doctor View</span>}
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard/demo-patient"}>
                <Link href="/dashboard/demo-patient" className="transition-colors duration-200">
                  <div className="flex items-center py-2 px-2 rounded-md hover:bg-blue-50">
                    <div className={pathname === "/dashboard/demo-patient" ? "text-[#1e3a6d]" : "text-gray-500"}>
                      <LucideBookOpen className="h-5 w-5 min-w-5" />
                    </div>
                    {expanded && <span className={`ml-3 ${pathname === "/dashboard/demo-patient" ? "font-medium text-[#1e3a6d]" : "text-gray-700"}`}>Patient View</span>}
                    {!expanded && <span className="sr-only">Patient View</span>}
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
      
      <SidebarFooter className="p-4 border-t border-gray-100 mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/dashboard/settings" className="transition-colors duration-200">
                <div className="flex items-center py-2 px-2 rounded-md hover:bg-blue-50">
                  <div className="text-gray-500">
                    <LucideSettings className="h-5 w-5 min-w-5" />
                  </div>
                  {expanded && <span className="ml-3 text-gray-700">Settings</span>}
                  {!expanded && <span className="sr-only">Settings</span>}
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/dashboard/help" className="transition-colors duration-200">
                <div className="flex items-center py-2 px-2 rounded-md hover:bg-blue-50">
                  <div className="text-gray-500">
                    <LucideHelpCircle className="h-5 w-5 min-w-5" />
                  </div>
                  {expanded && <span className="ml-3 text-gray-700">Help</span>}
                  {!expanded && <span className="sr-only">Help</span>}
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button 
                className="w-full transition-colors duration-200"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <div className="flex items-center py-2 px-2 rounded-md hover:bg-red-50 text-left">
                  <div className="text-red-500">
                    <LucideLogOut className="h-5 w-5 min-w-5" />
                  </div>
                  {expanded && <span className="ml-3 text-red-600">{isLoggingOut ? "Logging out..." : "Logout"}</span>}
                  {!expanded && <span className="sr-only">Logout</span>}
                </div>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

