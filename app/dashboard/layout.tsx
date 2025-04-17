"use client"

import React, { useState, useEffect } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { UserAvatarDropdown } from "@/components/user-avatar-dropdown"
import { AuthRedirect } from "@/components/auth-redirect"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LucideSearch, LucideBell, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader
} from "@/components/ui/sidebar"
import {
  LucideHome,
  LucideSettings,
  LucideHelpCircle,
  LucideLogOut,
  LucideBookOpen,
  LucideUsers,
  LucideCompass,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { usePathname, useRouter } from "next/navigation"
import { SciensaurusLogo } from "@/components/sciensaurus-logo"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  // State for mobile menu sheet
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem("sidebarExpanded");
    if (savedState !== null) {
      setSidebarExpanded(savedState === "true");
    }
    
    const handleStorageChange = () => {
      const state = localStorage.getItem("sidebarExpanded");
      if (state !== null) {
        setSidebarExpanded(state === "true");
      }
    };
    
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <SidebarProvider> 
      <div className="flex h-screen overflow-hidden">
        {/* Desktop Sidebar (Hidden on mobile) */}
        <div className="hidden md:block">
          <DashboardSidebar expanded={sidebarExpanded} onToggle={() => {
            const newState = !sidebarExpanded;
            setSidebarExpanded(newState);
            localStorage.setItem("sidebarExpanded", String(newState));
            window.dispatchEvent(new Event('storage'));
          }} />
        </div>

        {/* Main Content */}
        <div
          className={cn(
            "main-content flex-grow overflow-y-auto bg-gray-50 w-full ml-0",
            sidebarExpanded ? "md:ml-64" : "md:ml-20"
          )}
        >
          {/* Header */}
          <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
              {/* Mobile Menu Button using Sheet */}
              <div className="md:hidden">
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Menu className="h-6 w-6" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-64 flex flex-col bg-white">
                    <SheetHeader className="p-4 border-b border-gray-100 flex-shrink-0">
                      <SheetTitle className="sr-only">Main Menu</SheetTitle>
                    </SheetHeader>
                    
                    <div className="flex-grow overflow-y-auto p-4 space-y-6">
                      {/* Main Menu Section */}
                      <div>
                        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider pl-2 mb-2">Main Menu</h3>
                        <nav className="space-y-1">
                          <MobileMenuItem href="/dashboard" icon={LucideHome} label="Dashboard" onClick={() => setIsMobileMenuOpen(false)} />
                        </nav>
                      </div>
                      {/* Demo Section */}
                      <div>
                        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider pl-2 mb-2">Demo</h3>
                        <nav className="space-y-1">
                          <MobileMenuItem href="/dashboard/research-interests" icon={LucideCompass} label="My Research Interests" onClick={() => setIsMobileMenuOpen(false)} />
                          <MobileMenuItem href="/dashboard/demo-doctor" icon={LucideUsers} label="Doctor View" onClick={() => setIsMobileMenuOpen(false)} />
                          <MobileMenuItem href="/dashboard/demo-patient" icon={LucideBookOpen} label="Patient View" onClick={() => setIsMobileMenuOpen(false)} />
                        </nav>
                      </div>
                    </div>

                    <div className="p-4 border-t border-gray-100 mt-auto flex-shrink-0">
                      <nav className="space-y-1">
                         {/* Comment out Settings until page exists */}
                         {/* <MobileMenuItem href="/dashboard/settings" icon={LucideSettings} label="Settings" onClick={() => setIsMobileMenuOpen(false)} /> */}
                         {/* Comment out Help until page exists */}
                         {/* <MobileMenuItem href="/dashboard/help" icon={LucideHelpCircle} label="Help" onClick={() => setIsMobileMenuOpen(false)} /> */}
                         <MobileLogoutButton /> 
                      </nav>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Search (Desktop only) */}
              <div className="flex-grow hidden md:block">
                <div className="relative max-w-md">
                  <Input type="search" placeholder="Search..." className="pl-10 pr-4 py-2 w-full" />
                  <LucideSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                </div>
              </div>

              {/* Right-side icons */}
              <div className="flex items-center gap-2">
                {/* <Button variant="ghost" size="icon" className="text-gray-500">
                  <LucideBell className="h-5 w-5" />
                </Button> */}
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

// Helper component for Mobile Menu Items
function MobileMenuItem({ href, icon: Icon, label, onClick }: { href: string; icon: React.ElementType; label: string; onClick?: () => void }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link href={href} className="block transition-colors duration-200" onClick={onClick}>
      <div className={`flex items-center py-2 px-2 rounded-md ${isActive ? 'bg-blue-50' : 'hover:bg-blue-50'}`}>
        <div className={isActive ? "text-[#1e3a6d]" : "text-gray-500"}>
          <Icon className="h-5 w-5 min-w-5" />
        </div>
        <span className={`ml-3 ${isActive ? "font-medium text-[#1e3a6d]" : "text-gray-700"}`}>{label}</span>
      </div>
    </Link>
  );
}

// Helper component for Mobile Logout Button
function MobileLogoutButton() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { error } = await signOut();
      if (error) {
        console.error("Logout error:", error);
        setIsLoggingOut(false);
      } else {
        router.push('/'); // Redirect after logout
      }
    } catch (err) {
      console.error("Logout exception:", err);
      setIsLoggingOut(false);
    }
  };

  return (
    <button
      className="w-full transition-colors duration-200 text-left"
      onClick={handleLogout}
      disabled={isLoggingOut}
    >
      <div className="flex items-center py-2 px-2 rounded-md hover:bg-red-50">
        <div className="text-red-500">
          <LucideLogOut className="h-5 w-5 min-w-5" />
        </div>
        <span className="ml-3 text-red-600">
          {isLoggingOut ? "Logging out..." : "Logout"}
        </span>
      </div>
    </button>
  );
} 