"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronUp, XCircle } from "lucide-react"

export function DebugTools() {
  const [expanded, setExpanded] = useState(false)
  const [visible, setVisible] = useState(true)
  const [lastOperation, setLastOperation] = useState<string | null>(null)
  const [diagnosticInfo, setDiagnosticInfo] = useState<Record<string, any>>({})
  const auth = useAuth()
  
  // Only show in development
  if (process.env.NODE_ENV !== "development" || !visible) {
    return null
  }

  useEffect(() => {
    // Run basic auth diagnostic checks
    const runDiagnostics = () => {
      const info: Record<string, any> = {}
      
      // Check for storage items
      try {
        const keys = Object.keys(localStorage)
        const authKeys = keys.filter(k => k.includes('auth') || k.includes('supabase'))
        info.localStorageAuthKeys = authKeys.length ? authKeys : "None found"
        
        // Check for cookies
        info.hasCookies = document.cookie.length > 0
        info.cookieCount = document.cookie ? document.cookie.split(';').length : 0
      } catch (e) {
        info.storageError = String(e)
      }
      
      // Browser info
      info.userAgent = navigator.userAgent
      info.timeChecked = new Date().toISOString()
      
      setDiagnosticInfo(info)
    }
    
    runDiagnostics()
    // Run diagnostics every 30 seconds if expanded
    const interval = expanded ? setInterval(runDiagnostics, 30000) : null
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [expanded])

  const handleOperation = (operation: string, callback: () => any) => {
    setLastOperation(`Running: ${operation}...`)
    
    Promise.resolve(callback())
      .then(() => setLastOperation(`${operation} completed`))
      .catch(err => setLastOperation(`${operation} failed: ${err.message}`))
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-96 shadow-lg border-amber-300 bg-amber-50 max-h-[85vh] overflow-auto">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-sm flex items-center">
                <span>🔍 Auth Debug Tools</span>
                <Badge 
                  variant={auth.session ? "default" : "destructive"} 
                  className={`ml-2 ${auth.session ? "bg-green-500 hover:bg-green-600" : ""}`}
                >
                  {auth.session ? "Authenticated" : "Not Authenticated"}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                {lastOperation || "Development only - helps debug auth issues"}
              </CardDescription>
            </div>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={() => setVisible(false)}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {expanded && (
          <CardContent className="text-xs pb-3 pt-0">
            <div className="space-y-3">
              <div>
                <div className="font-semibold mb-1">Auth Status</div>
                <div className="p-2 bg-amber-100 rounded-md overflow-auto max-h-32">
                  <pre>
                    {JSON.stringify({
                      isLoading: auth.isLoading,
                      error: auth.error,
                      hasSession: !!auth.session,
                      userId: auth.user?.id,
                      email: auth.user?.email,
                      accessTokenExists: !!auth.session?.access_token,
                      accessTokenPrefix: auth.session?.access_token ? 
                        `${auth.session.access_token.substring(0, 6)}...` : null,
                      expires_at: auth.session?.expires_at,
                      refresh_token_exists: !!auth.session?.refresh_token,
                    }, null, 2)}
                  </pre>
                </div>
              </div>
              
              {Object.keys(diagnosticInfo).length > 0 && (
                <div>
                  <div className="font-semibold mb-1">Diagnostics</div>
                  <div className="p-2 bg-amber-100 rounded-md overflow-auto max-h-32">
                    <pre>{JSON.stringify(diagnosticInfo, null, 2)}</pre>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col gap-1 pt-1">
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-7" 
                    onClick={() => handleOperation("Reload", () => window.location.reload())}
                  >
                    Reload Page
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-7" 
                    onClick={() => handleOperation("Log Session", () => {
                      console.log("Full auth session:", auth.session)
                      return Promise.resolve()
                    })}
                  >
                    Log Session
                  </Button>
                </div>
                <div className="flex space-x-2 mt-1">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-7" 
                    onClick={() => handleOperation("Logout", async () => {
                      await auth.signOut()
                      return Promise.resolve()
                    })}
                  >
                    Force Logout
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-7" 
                    onClick={() => handleOperation("Clear Storage", () => {
                      localStorage.clear()
                      return Promise.resolve()
                    })}
                  >
                    Clear Storage
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
} 