"use client"

import React, { useState, useEffect } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { UserAvatarDropdown } from "@/components/user-avatar-dropdown"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LucideSearch, LucideBell } from "lucide-react"

export default function ArticleSummaryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  useEffect(() => {
    // Check saved sidebar preference on mount
    const savedState = localStorage.getItem("sidebarExpanded");
    if (savedState !== null) {
      setSidebarExpanded(savedState === "true");
    }
    
    // Listen for changes to sidebar state
    const handleStorageChange = () => {
      const state = localStorage.getItem("sidebarExpanded");
      if (state !== null) {
        setSidebarExpanded(state === "true");
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <SidebarProvider>
      <div className="flex h-screen">
        {/* Sidebar - fixed position, always visible */}
        <div className="fixed left-0 top-0 h-full z-20">
          <DashboardSidebar />
        </div>

        {/* Main Content - with margin to accommodate sidebar */}
        <div 
          className="main-content flex-grow overflow-y-auto bg-gray-50 transition-all duration-300"
          style={{ marginLeft: sidebarExpanded ? '16rem' : '5rem' }}
        >
          {/* Header */}
          <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative max-w-md w-full hidden md:block">
                  <Input type="search" placeholder="Search..." className="pl-10 pr-4 py-2 w-full" />
                  <LucideSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="text-gray-500">
                  <LucideBell className="h-5 w-5" />
                </Button>
                <UserAvatarDropdown />
              </div>
            </div>
          </header>

          {/* Main content area */}
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
} 