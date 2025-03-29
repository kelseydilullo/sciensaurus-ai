"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import {
  LucideSearch,
  LucideCalendar,
  LucideMoreHorizontal,
  LucideFilter,
  LucideFileText,
  LucideTrash2,
  LucideFolder,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function SavedArticlesPage() {
  const [activeCollection, setActiveCollection] = useState("all")

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">My Saved Articles</h1>
            <p className="text-gray-600">Articles you've bookmarked for future reference</p>
          </div>

          {/* Search and Filter */}
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Input type="search" placeholder="Search..." className="pl-10" />
              <LucideSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <LucideFilter className="h-4 w-4" />
              <span>Filter</span>
            </Button>
          </div>

          {/* Collections Tabs */}
          <Tabs defaultValue="all" className="mb-6" onValueChange={setActiveCollection}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Saved</TabsTrigger>
              <TabsTrigger value="sleep">Sleep Science</TabsTrigger>
              <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
              <TabsTrigger value="neuroscience">Neuroscience</TabsTrigger>
              <TabsTrigger value="immunology">Immunology</TabsTrigger>
            </TabsList>

            {/* All Collections Content */}
            <TabsContent value="all" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {savedArticles.map((article, index) => (
                  <SavedArticleCard key={index} article={article} />
                ))}
              </div>
            </TabsContent>

            {/* Sleep Science Collection */}
            <TabsContent value="sleep" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {savedArticles
                  .filter((article) => article.collections.includes("Sleep Science"))
                  .map((article, index) => (
                    <SavedArticleCard key={index} article={article} />
                  ))}
              </div>
            </TabsContent>

            {/* Nutrition Collection */}
            <TabsContent value="nutrition" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {savedArticles
                  .filter((article) => article.collections.includes("Nutrition"))
                  .map((article, index) => (
                    <SavedArticleCard key={index} article={article} />
                  ))}
              </div>
            </TabsContent>

            {/* Neuroscience Collection */}
            <TabsContent value="neuroscience" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {savedArticles
                  .filter((article) => article.collections.includes("Neuroscience"))
                  .map((article, index) => (
                    <SavedArticleCard key={index} article={article} />
                  ))}
              </div>
            </TabsContent>

            {/* Immunology Collection */}
            <TabsContent value="immunology" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {savedArticles
                  .filter((article) => article.collections.includes("Immunology"))
                  .map((article, index) => (
                    <SavedArticleCard key={index} article={article} />
                  ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Collection Management */}
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Manage Collections</h2>
              <Button variant="outline" size="sm" className="text-[#1e3a6d]">
                Create New Collection
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {collections.map((collection, index) => (
                <Card
                  key={index}
                  className={`hover:shadow-md transition-shadow cursor-pointer ${activeCollection === collection.value ? "border-[#1e3a6d] border-2" : ""}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <LucideFolder className="h-5 w-5 text-[#1e3a6d]" />
                      </div>
                      <Badge>{collection.count} articles</Badge>
                    </div>
                    <h3 className="font-medium text-gray-900">{collection.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">Last updated {collection.lastUpdated}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function SavedArticleCard({ article }) {
  return (
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
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <LucideMoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <LucideFileText className="mr-2 h-4 w-4" />
                <span>View full analysis</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <LucideFolder className="mr-2 h-4 w-4" />
                <span>Move to collection</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <LucideTrash2 className="mr-2 h-4 w-4" />
                <span>Remove from saved</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-3">
        <div className="flex flex-wrap gap-1 mb-3">
          {article.collections.map((collection, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {collection}
            </Badge>
          ))}
        </div>
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{article.summary}</p>
        <div className="flex flex-wrap gap-1">
          {article.keywords.slice(0, 3).map((keyword, idx) => (
            <Link href={`/dashboard/research-topic/1`} key={idx}>
              <Badge variant="outline" className="bg-blue-50 text-[#1e3a6d] text-xs hover:bg-blue-100 cursor-pointer">
                {keyword}
              </Badge>
            </Link>
          ))}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <div className="text-xs text-gray-500">
          <LucideCalendar className="inline h-3 w-3 mr-1" />
          Saved {article.savedDate}
        </div>
        <Link href="/dashboard/analysis">
          <Button variant="ghost" size="sm" className="h-8 text-[#1e3a6d]">
            View
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}

// Sample data for saved articles
const savedArticles = [
  {
    title: "Circadian Rhythm Disruption and Metabolic Consequences: A Comprehensive Review",
    journal: "Nature Medicine",
    date: "Mar 15, 2023",
    summary:
      "Disruption of circadian rhythms through shift work, irregular sleep patterns, and light exposure at night shows significant negative impacts on metabolic health and insulin sensitivity.",
    keywords: ["Circadian Rhythm", "Metabolism", "Sleep", "Insulin Sensitivity", "Chronobiology"],
    savedDate: "2 days ago",
    collections: ["Sleep Science", "Metabolic Health"],
  },
  {
    title: "Neuroplasticity and Cognitive Function: Impact of Intermittent Fasting on Brain Health",
    journal: "Neuroscience",
    date: "Feb 28, 2023",
    summary:
      "Intermittent fasting protocols demonstrate significant improvements in cognitive function and neuroplasticity markers in adult subjects.",
    keywords: ["Neuroplasticity", "Intermittent fasting", "Cognitive function", "Brain health", "Metabolism"],
    savedDate: "1 week ago",
    collections: ["Neuroscience", "Nutrition"],
  },
  {
    title: "Gut Microbiome Composition and Its Relationship to Mental Health Outcomes",
    journal: "Cell",
    date: "Jan 10, 2023",
    summary:
      "Analysis of gut microbiome diversity shows strong correlations with anxiety, depression, and overall mental health status in a large cohort study.",
    keywords: ["Gut microbiome", "Mental health", "Anxiety", "Depression", "Microbiota-gut-brain axis"],
    savedDate: "2 weeks ago",
    collections: ["Neuroscience", "Nutrition"],
  },
  {
    title: "Artificial Intelligence Applications in Early Cancer Detection: A Systematic Review",
    journal: "Journal of Clinical Oncology",
    date: "Dec 5, 2022",
    summary:
      "AI algorithms demonstrate superior sensitivity and specificity compared to traditional screening methods for early-stage cancer detection.",
    keywords: ["Artificial intelligence", "Cancer detection", "Machine learning", "Oncology", "Screening"],
    savedDate: "3 weeks ago",
    collections: ["Oncology"],
  },
  {
    title: "Environmental Factors in Autoimmune Disease Development: New Insights",
    journal: "Immunity",
    date: "Nov 18, 2022",
    summary:
      "Recent evidence suggests significant roles for air pollution, dietary factors, and chemical exposures in triggering autoimmune conditions.",
    keywords: ["Autoimmune disease", "Environmental factors", "Immunology", "Inflammation", "Epigenetics"],
    savedDate: "1 month ago",
    collections: ["Immunology"],
  },
  {
    title: "Comparative Effectiveness of Digital vs. In-Person Cognitive Behavioral Therapy for Insomnia",
    journal: "JAMA Psychiatry",
    date: "Oct 5, 2022",
    summary:
      "Long-term follow-up study comparing the efficacy and adherence rates between digital and traditional in-person cognitive behavioral therapy for chronic insomnia.",
    keywords: ["Cognitive Behavioral Therapy", "Insomnia", "Digital Health", "Sleep Medicine", "Telemedicine"],
    savedDate: "2 months ago",
    collections: ["Sleep Science", "Digital Health"],
  },
]

// Sample data for collections
const collections = [
  {
    name: "All Saved",
    value: "all",
    count: 12,
    lastUpdated: "2 days ago",
  },
  {
    name: "Sleep Science",
    value: "sleep",
    count: 4,
    lastUpdated: "2 days ago",
  },
  {
    name: "Nutrition",
    value: "nutrition",
    count: 3,
    lastUpdated: "1 week ago",
  },
  {
    name: "Neuroscience",
    value: "neuroscience",
    count: 3,
    lastUpdated: "2 weeks ago",
  },
  {
    name: "Immunology",
    value: "immunology",
    count: 2,
    lastUpdated: "1 month ago",
  },
]

