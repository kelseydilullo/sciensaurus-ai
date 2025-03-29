"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { LucideSearch, LucideArrowRight, LucideCalendar, LucideTag, LucidePlus, LucideX } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function ResearchInterestsPage() {
  const router = useRouter()
  // This would normally be fetched from an API or database
  // For demo purposes, we'll use a state to toggle between having topics and not
  const [hasResearchedTopics, setHasResearchedTopics] = useState(true)
  const [researchTopics, setResearchTopics] = useState([
    {
      id: 1,
      topic: "mRNA vaccines",
      count: 12,
      lastResearched: "2 days ago",
      relatedKeywords: ["COVID-19", "Immunology", "Lipid nanoparticles", "Vaccine efficacy"],
      articles: 8,
    },
    {
      id: 2,
      topic: "Gut microbiome",
      count: 8,
      lastResearched: "1 week ago",
      relatedKeywords: ["Probiotics", "Mental health", "Immune system", "Metabolism"],
      articles: 5,
    },
    {
      id: 3,
      topic: "Neuroplasticity",
      count: 6,
      lastResearched: "2 weeks ago",
      relatedKeywords: ["Brain health", "Cognitive function", "Memory", "Learning"],
      articles: 4,
    },
    {
      id: 4,
      topic: "Intermittent fasting",
      count: 5,
      lastResearched: "3 weeks ago",
      relatedKeywords: ["Metabolism", "Weight loss", "Longevity", "Autophagy"],
      articles: 3,
    },
    {
      id: 5,
      topic: "Cancer immunotherapy",
      count: 4,
      lastResearched: "1 month ago",
      relatedKeywords: ["Oncology", "T-cells", "Checkpoint inhibitors", "Personalized medicine"],
      articles: 2,
    },
  ])

  // State for new interest form
  const [newInterest, setNewInterest] = useState("")
  const [newKeywords, setNewKeywords] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  // State for delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [topicToDelete, setTopicToDelete] = useState(null)

  const handleTopicClick = (topic) => {
    // Navigate to the research topic page with the topic ID
    router.push(`/dashboard/research-topic/${topic.id}`)
  }

  const handleRemoveTopic = (id) => {
    setResearchTopics(researchTopics.filter((topic) => topic.id !== id))
    setDeleteConfirmOpen(false)
    setTopicToDelete(null)

    // If we removed the last topic, show empty state
    if (researchTopics.length === 1) {
      setHasResearchedTopics(false)
    }
  }

  const handleAddInterest = () => {
    if (newInterest.trim() === "") return

    const keywords = newKeywords
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k !== "")

    const newTopic = {
      id: researchTopics.length > 0 ? Math.max(...researchTopics.map((t) => t.id)) + 1 : 1,
      topic: newInterest,
      count: 0,
      lastResearched: "Just now",
      relatedKeywords: keywords.length > 0 ? keywords : ["New topic"],
      articles: 0,
    }

    setResearchTopics([newTopic, ...researchTopics])
    setNewInterest("")
    setNewKeywords("")
    setIsAddDialogOpen(false)
    setHasResearchedTopics(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Research Interests</h1>
              <p className="text-gray-600">Topics extracted from your research history</p>
            </div>

            {/* Add New Interest Button */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#1e3a6d] hover:bg-[#0f2a4d]">
                  <LucidePlus className="h-4 w-4 mr-2" />
                  Add Interest
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Research Interest</DialogTitle>
                  <DialogDescription>
                    Create a new research interest to organize your articles and discoveries.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label htmlFor="interest-name" className="text-sm font-medium">
                      Interest Name
                    </label>
                    <Input
                      id="interest-name"
                      placeholder="e.g., Quantum Computing"
                      value={newInterest}
                      onChange={(e) => setNewInterest(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="keywords" className="text-sm font-medium">
                      Related Keywords (comma separated)
                    </label>
                    <Input
                      id="keywords"
                      placeholder="e.g., Qubits, Superposition, Quantum Entanglement"
                      value={newKeywords}
                      onChange={(e) => setNewKeywords(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="bg-[#1e3a6d] hover:bg-[#0f2a4d]"
                    onClick={handleAddInterest}
                    disabled={!newInterest.trim()}
                  >
                    Add Interest
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Remove Research Interest</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to remove this research interest? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={() => topicToDelete && handleRemoveTopic(topicToDelete)}>
                    Remove
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {!hasResearchedTopics ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-12 px-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="bg-blue-50 p-4 rounded-full mb-4">
                <LucideSearch className="h-8 w-8 text-blue-500" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No research interests yet</h2>
              <p className="text-gray-600 text-center max-w-md mb-6">
                Topics related to your research queries will appear here. Analyze articles to start building your
                research profile.
              </p>
              <div className="flex gap-4">
                <Button className="bg-[#1e3a6d] hover:bg-[#0f2a4d]">Analyze Your First Article</Button>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
                  Add Interest Manually
                </Button>
              </div>
            </div>
          ) : (
            // Research topics list
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {researchTopics.map((topic) => (
                <Card key={topic.id} className="hover:shadow-md transition-shadow relative group">
                  <CardHeader className="pb-3">
                    <div className="relative">
                      <CardTitle className="text-lg font-semibold text-[#1e3a6d] pr-8">{topic.topic}</CardTitle>
                      <div className="mt-1">
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">{topic.count} articles</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-0 right-0 h-7 w-7 rounded-full opacity-70 ring-offset-background transition-opacity hover:bg-red-100 hover:text-red-600 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          setTopicToDelete(topic.id)
                          setDeleteConfirmOpen(true)
                        }}
                      >
                        <LucideX className="h-4 w-4" />
                        <span className="sr-only">Remove {topic.topic}</span>
                      </Button>
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
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant="outline"
                      className="text-[#1e3a6d] border-[#1e3a6d] hover:bg-blue-50 w-full"
                      onClick={() => handleTopicClick(topic)}
                    >
                      Explore Topic
                      <LucideArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}

              {/* Add new research topic card */}
              <Card
                className="flex flex-col items-center justify-center p-6 border-dashed hover:bg-gray-50 transition-colors cursor-pointer h-full"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                  <LucidePlus className="h-6 w-6 text-[#1e3a6d]" />
                </div>
                <p className="text-sm font-medium text-[#1e3a6d]">Add New Interest</p>
                <p className="text-xs text-gray-500 text-center mt-1">Create a custom research interest</p>
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

