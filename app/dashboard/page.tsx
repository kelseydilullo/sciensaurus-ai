"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SciensaurusLogo } from "@/components/sciensaurus-logo"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { UserAvatarDropdown } from "@/components/user-avatar-dropdown"
import {
  LucideSearch,
  LucideArrowRight,
  LucideBookmark,
  LucideCalendar,
  LucideChevronRight,
  LucideFileText,
  LucideMoreHorizontal,
  LucideBell,
  LucideClock,
  LucideCompass,
  LucideTrendingUp,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 mr-6">
                <SciensaurusLogo className="h-8 w-8 text-[#1e3a6d]" />
                <span className="text-xl font-bold text-[#1e3a6d] hidden md:inline">Sciensaurus</span>
              </Link>
              <div className="relative max-w-md w-full hidden md:block">
                <Input type="search" placeholder="Search..." className="pl-10 pr-4 py-2 w-full" />
                <LucideSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="text-gray-500">
                <LucideBell className="h-5 w-5" />
              </Button>
              <UserAvatarDropdown />
            </div>
          </div>
        </header>

        {/* Main Dashboard Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome back, John. Here's your research overview.</p>
          </div>

          {/* Research Activity Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Articles Analyzed</p>
                    <h3 className="text-2xl font-bold mt-1">24</h3>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <LucideFileText className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 flex items-center">
                  <LucideTrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  <span className="text-green-500 font-medium">+12%</span>
                  <span className="ml-1">from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Research Interests</p>
                    <h3 className="text-2xl font-bold mt-1">8</h3>
                  </div>
                  <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <LucideCompass className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 flex items-center">
                  <LucideTrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  <span className="text-green-500 font-medium">+3</span>
                  <span className="ml-1">new interests this month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Saved Articles</p>
                    <h3 className="text-2xl font-bold mt-1">12</h3>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                    <LucideBookmark className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 flex items-center">
                  <LucideClock className="h-3 w-3 mr-1" />
                  <span>Last saved 2 days ago</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* URL Input for New Research */}
          <Card className="mb-8">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium">Analyze New Research</CardTitle>
              <CardDescription>Enter a URL to a scientific article to get AI-powered insights</CardDescription>
            </CardHeader>
            <CardContent>
              <form action="/dashboard/analysis" className="relative">
                <Input type="url" placeholder="Paste article URL here..." className="pr-24" />
                <Button type="submit" className="absolute right-0 top-0 bg-[#1e3a6d] hover:bg-[#0f2a4d]">
                  Analyze <LucideArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Recent Research */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Your Recent Articles</h2>
              <Link href="/dashboard/research-interests">
                <Button variant="outline" size="sm" className="text-[#1e3a6d]">
                  View All <LucideChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentArticles.slice(0, 3).map((article, index) => (
                <div key={index}>
                  <Card className="overflow-hidden hover:shadow-md transition-shadow h-full">
                    <CardHeader className="p-4 pb-2 bg-gray-50 border-b">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base line-clamp-2">{article.title}</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {article.journal} • {article.date}
                          </CardDescription>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <LucideMoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">More</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem>
                              <LucideBookmark className="mr-2 h-4 w-4" />
                              <span>Save to collection</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <LucideFileText className="mr-2 h-4 w-4" />
                              <span>View full analysis</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <span>Remove from history</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-3">
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{article.summary}</p>
                      <div className="flex flex-wrap gap-1">
                        {article.keywords.slice(0, 3).map((keyword, idx) => (
                          <Link href={`/dashboard/research-topic/1`} key={idx}>
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-[#1e3a6d] text-xs hover:bg-blue-100 cursor-pointer"
                            >
                              {keyword}
                            </Badge>
                          </Link>
                        ))}
                        {article.keywords.length > 3 && (
                          <Badge variant="outline" className="bg-gray-100 text-gray-600 text-xs">
                            +{article.keywords.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        <LucideCalendar className="inline h-3 w-3 mr-1" />
                        Analyzed {article.analyzedDate}
                      </div>
                      <Link href="/dashboard/analysis">
                        <Button variant="ghost" size="sm" className="h-8 text-[#1e3a6d]">
                          View
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          {/* Trending Research Topics */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Trending Research Topics</h2>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex flex-wrap gap-2">
                {trendingTopics.map((topic, index) => (
                  <Link href={`/dashboard/research-topic/1`} key={index}>
                    <Badge
                      className={`text-sm py-1.5 px-3 cursor-pointer ${topic.isHot ? "bg-red-100 text-red-800 hover:bg-red-200" : "bg-blue-50 text-[#1e3a6d] hover:bg-blue-100"}`}
                    >
                      {topic.name}
                      {topic.isHot && <span className="ml-1">🔥</span>}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Suggested Articles */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Suggested For You</h2>
              <Button variant="outline" size="sm" className="text-[#1e3a6d]">
                More Suggestions
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {suggestedArticles.map((article, index) => (
                <div key={index}>
                  <Card className="overflow-hidden hover:shadow-md transition-shadow h-full">
                    <CardHeader className="p-4 pb-2 bg-gray-50 border-b">
                      <div>
                        <CardTitle className="text-base line-clamp-2">{article.title}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {article.journal} • {article.date}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-3">
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{article.summary}</p>
                      <div className="flex flex-wrap gap-1">
                        {article.keywords.slice(0, 3).map((keyword, idx) => (
                          <Link href={`/dashboard/research-topic/1`} key={idx}>
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-[#1e3a6d] text-xs hover:bg-blue-100 cursor-pointer"
                            >
                              {keyword}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        <span className="text-blue-600 font-medium">Recommended</span> based on your interests
                      </div>
                      <Link href="/dashboard/analysis">
                        <Button variant="outline" size="sm" className="h-8 text-[#1e3a6d]">
                          Analyze
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

// Sample data for recent articles
const recentArticles = [
  {
    title: "Impact of Mediterranean Diet on Cardiovascular Health: A 10-Year Longitudinal Study",
    journal: "New England Journal of Medicine",
    date: "Mar 15, 2023",
    summary:
      "Long-term adherence to a Mediterranean diet shows significant reduction in cardiovascular events and mortality across diverse populations.",
    keywords: ["Mediterranean Diet", "Cardiovascular Health", "Nutrition", "Longevity", "Preventive Medicine"],
    analyzedDate: "2 days ago",
  },
  {
    title: "Neuroplasticity and Cognitive Function: Impact of Intermittent Fasting on Brain Health",
    journal: "Neuroscience",
    date: "Feb 28, 2023",
    summary:
      "Intermittent fasting protocols demonstrate significant improvements in cognitive function and neuroplasticity markers in adult subjects.",
    keywords: ["Neuroplasticity", "Intermittent fasting", "Cognitive function", "Brain health", "Metabolism"],
    analyzedDate: "1 week ago",
  },
  {
    title: "Gut Microbiome Composition and Its Relationship to Mental Health Outcomes",
    journal: "Cell",
    date: "Jan 10, 2023",
    summary:
      "Analysis of gut microbiome diversity shows strong correlations with anxiety, depression, and overall mental health status in a large cohort study.",
    keywords: ["Gut microbiome", "Mental health", "Anxiety", "Depression", "Microbiota-gut-brain axis"],
    analyzedDate: "2 weeks ago",
  },
  {
    title: "Artificial Intelligence Applications in Early Cancer Detection: A Systematic Review",
    journal: "Journal of Clinical Oncology",
    date: "Dec 5, 2022",
    summary:
      "AI algorithms demonstrate superior sensitivity and specificity compared to traditional screening methods for early-stage cancer detection.",
    keywords: ["Artificial intelligence", "Cancer detection", "Machine learning", "Oncology", "Screening"],
    analyzedDate: "3 weeks ago",
  },
  {
    title: "Environmental Factors in Autoimmune Disease Development: New Insights",
    journal: "Immunity",
    date: "Nov 18, 2022",
    summary:
      "Recent evidence suggests significant roles for air pollution, dietary factors, and chemical exposures in triggering autoimmune conditions.",
    keywords: ["Autoimmune disease", "Environmental factors", "Immunology", "Inflammation", "Epigenetics"],
    analyzedDate: "1 month ago",
  },
]

// Sample data for trending topics
const trendingTopics = [
  { name: "CRISPR Gene Therapy", isHot: true },
  { name: "Long COVID", isHot: false },
  { name: "Psychedelic Medicine", isHot: true },
  { name: "Quantum Biology", isHot: false },
  { name: "Microplastics in Human Blood", isHot: true },
  { name: "Alzheimer's Biomarkers", isHot: false },
  { name: "Artificial Photosynthesis", isHot: false },
  { name: "Gut-Brain Axis", isHot: false },
  { name: "Microbiome Research", isHot: true },
  { name: "Exoplanet Atmospheres", isHot: false },
]

// Sample data for suggested articles
const suggestedArticles = [
  {
    title: "Advances in Precision Nutrition: Personalized Dietary Approaches Based on Genetic Profiles",
    journal: "Nature Biotechnology",
    date: "Apr 5, 2023",
    summary:
      "Novel approaches to nutrition that incorporate individual genetic profiles show improved metabolic outcomes and personalized dietary response patterns.",
    keywords: ["Precision Nutrition", "Nutrigenomics", "Personalized Medicine", "Metabolic Health"],
  },
  {
    title: "The Role of Gut Microbiota in Regulating Circadian Rhythms",
    journal: "Science",
    date: "Mar 22, 2023",
    summary:
      "Gut microbiome composition influences host circadian clock genes, with implications for metabolism, sleep, and immune function.",
    keywords: ["Gut microbiome", "Circadian rhythm", "Metabolism", "Sleep"],
  },
  {
    title: "Neuroinflammation as a Driver of Cognitive Decline: New Therapeutic Targets",
    journal: "Neuron",
    date: "Feb 15, 2023",
    summary:
      "Anti-inflammatory interventions targeting specific neural pathways show promise in preventing age-related cognitive decline.",
    keywords: ["Neuroinflammation", "Cognitive decline", "Aging", "Therapeutics"],
  },
]

