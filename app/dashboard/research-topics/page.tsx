"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { LucideSearch, LucideArrowRight, LucideCalendar, LucideTag } from "lucide-react"

export default function ResearchTopicsPage() {
  const router = useRouter()
  // This would normally be fetched from an API or database
  // For demo purposes, we'll use a state to toggle between having topics and not
  const [hasResearchedTopics, setHasResearchedTopics] = useState(true)

  // Sample research topics data
  const researchTopics = [
    {
      id: 1,
      topic: "mRNA vaccines",
      count: 12,
      lastResearched: "2 days ago",
      relatedKeywords: ["COVID-19", "Immunology", "Lipid nanoparticles", "Vaccine efficacy"],
      articles: 8,
      relevanceScore: 95,
    },
    {
      id: 2,
      topic: "Gut microbiome",
      count: 8,
      lastResearched: "1 week ago",
      relatedKeywords: ["Probiotics", "Mental health", "Immune system", "Metabolism"],
      articles: 5,
      relevanceScore: 82,
    },
    {
      id: 3,
      topic: "Neuroplasticity",
      count: 6,
      lastResearched: "2 weeks ago",
      relatedKeywords: ["Brain health", "Cognitive function", "Memory", "Learning"],
      articles: 4,
      relevanceScore: 78,
    },
    {
      id: 4,
      topic: "Intermittent fasting",
      count: 5,
      lastResearched: "3 weeks ago",
      relatedKeywords: ["Metabolism", "Weight loss", "Longevity", "Autophagy"],
      articles: 3,
      relevanceScore: 65,
    },
    {
      id: 5,
      topic: "Cancer immunotherapy",
      count: 4,
      lastResearched: "1 month ago",
      relatedKeywords: ["Oncology", "T-cells", "Checkpoint inhibitors", "Personalized medicine"],
      articles: 2,
      relevanceScore: 60,
    },
  ]

  const handleTopicClick = (topic) => {
    // In a real app, you would store the selected topic in context or state
    // and then navigate to the research timeline page
    router.push("/dashboard/research-timeline")
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">My Research Topics</h1>
            <p className="text-gray-600">Topics extracted from your research history</p>
          </div>

          {!hasResearchedTopics ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-12 px-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="bg-blue-50 p-4 rounded-full mb-4">
                <LucideSearch className="h-8 w-8 text-blue-500" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No research topics yet</h2>
              <p className="text-gray-600 text-center max-w-md mb-6">
                Topics related to your research queries will appear here. Analyze articles to start building your
                research profile.
              </p>
              <Button className="bg-[#1e3a6d] hover:bg-[#0f2a4d]">Analyze Your First Article</Button>
            </div>
          ) : (
            // Research topics list
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {researchTopics.map((topic) => (
                <Card
                  key={topic.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleTopicClick(topic)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg font-semibold text-[#1e3a6d]">{topic.topic}</CardTitle>
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">{topic.count} articles</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Last researched */}
                      <div className="flex items-center text-sm text-gray-500">
                        <LucideCalendar className="h-4 w-4 mr-2" />
                        <span>Last researched: {topic.lastResearched}</span>
                      </div>

                      {/* Related keywords */}
                      <div>
                        <div className="flex items-center text-sm text-gray-500 mb-2">
                          <LucideTag className="h-4 w-4 mr-2" />
                          <span>Related keywords:</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {topic.relatedKeywords.map((keyword, idx) => (
                            <Badge key={idx} variant="outline" className="bg-gray-50">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* View timeline button */}
                      <Link href="/dashboard/research-timeline" className="block">
                        <Button
                          variant="outline"
                          className="w-full mt-2 text-[#1e3a6d] border-[#1e3a6d] hover:bg-blue-50"
                        >
                          View Research Timeline
                          <LucideArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Add new research topic card */}
              <Card className="flex flex-col items-center justify-center p-6 border-dashed hover:bg-gray-50 transition-colors cursor-pointer h-full">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                  <LucideSearch className="h-6 w-6 text-[#1e3a6d]" />
                </div>
                <p className="text-sm font-medium text-[#1e3a6d]">Analyze New Article</p>
                <p className="text-xs text-gray-500 text-center mt-1">Discover more research topics</p>
              </Card>
            </div>
          )}

          {/* Toggle button for demo purposes */}
          <div className="mt-8 text-center">
            <Button variant="outline" onClick={() => setHasResearchedTopics(!hasResearchedTopics)} className="text-sm">
              Demo: Toggle between empty state and topics
            </Button>
          </div>
        </main>
      </div>
    </div>
  )
}

