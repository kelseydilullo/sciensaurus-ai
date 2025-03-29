"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import {
  LucideCalendar,
  LucideExternalLink,
  LucideFilter,
  LucideSearch,
  LucideBookmark,
  LucideShare2,
  LucideDownload,
  LucidePrinter,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"

// Dummy data for timeline articles
const timelineArticles = [
  {
    id: 1,
    date: "October 26, 2023",
    title: "Intermittent Fasting Effects on Metabolic Health: A Systematic Review",
    journal: "The Lancet",
    keywords: ["Intermittent Fasting", "Metabolism", "Weight Management", "Insulin Sensitivity"],
    aiSummary:
      "Time-restricted eating shows promising results for improving metabolic markers in adults with various health conditions.",
    keyFindings: [
      { emoji: "✅", text: "Significant improvements in insulin sensitivity observed." },
      { emoji: "🛡️", text: "Reduction in inflammatory markers across multiple studies." },
      { emoji: "🧪", text: "Minimal adverse effects reported in clinical trials." },
      { emoji: "👵", text: "Benefits observed across all adult age groups." },
    ],
    methodology:
      "Systematic review and meta-analysis of 42 randomized controlled trials with 2,500 participants across 12 medical centers. Studies evaluated various intermittent fasting protocols with follow-up assessments at 3, 6, and 12 months.",
    sampleSize: 2500,
    conclusion:
      "Intermittent fasting demonstrates significant benefits for metabolic health markers, particularly improved insulin sensitivity and reduced inflammation. These findings suggest that timing of food intake, independent of caloric content, plays an important role in metabolic regulation and may offer a sustainable approach to improving health outcomes.",
    impactScore: 4,
    citationCount: 120,
  },
  {
    id: 2,
    date: "September 15, 2023",
    title: "Gut Microbiome Composition and Mental Health Outcomes",
    journal: "Nature Medicine",
    keywords: ["Gut Microbiome", "Mental Health", "Depression", "Anxiety"],
    aiSummary:
      "New research demonstrates strong bidirectional relationship between gut microbiota diversity and mental health outcomes.",
    keyFindings: [
      { emoji: "💪", text: "Strong correlation between microbiome diversity and reduced depression symptoms." },
      { emoji: "🔬", text: "Specific bacterial strains identified that produce neurotransmitter precursors." },
      { emoji: "⚡", text: "Dietary interventions showed measurable changes in both gut composition and mood." },
      { emoji: "🧬", text: "Genetic factors influence individual response to microbiome-targeted interventions." },
    ],
    methodology:
      "Prospective cohort study involving 1,800 participants followed for 24 months. The study combined microbiome sequencing, dietary analysis, and validated psychological assessments to evaluate the relationship between gut health and mental wellbeing.",
    sampleSize: 1800,
    conclusion:
      "This research establishes a clear bidirectional relationship between gut microbiome composition and mental health outcomes. Dietary interventions that enhance microbiome diversity show promise as complementary approaches to traditional mental health treatments. The identification of specific bacterial strains involved in neurotransmitter production opens new avenues for targeted probiotic therapies.",
    impactScore: 5,
    citationCount: 210,
  },
  {
    id: 3,
    date: "August 1, 2023",
    title: "Effects of Forest Bathing on Stress Biomarkers and Immune Function",
    journal: "Science Translational Medicine",
    keywords: ["Forest Bathing", "Stress Reduction", "Immune Function", "Nature Therapy"],
    aiSummary:
      "Immersion in forest environments shows measurable physiological benefits for stress reduction and immune enhancement.",
    keyFindings: [
      { emoji: "🎯", text: "Significant reduction in cortisol levels after just 2 hours in forest environments." },
      { emoji: "🌱", text: "Increased natural killer cell activity persisting for up to 7 days after exposure." },
      { emoji: "⏱️", text: "Cumulative benefits observed with regular weekly forest immersion over 3 months." },
      { emoji: "🔄", text: "Phytoncides (wood essential oils) identified as key active compounds." },
    ],
    methodology:
      "Randomized crossover study with 50 healthy adults comparing physiological responses to forest environments versus urban settings. Participants provided blood and saliva samples before, immediately after, and at 7-day follow-up after each environmental exposure.",
    sampleSize: 50,
    conclusion:
      "This study provides robust evidence for the physiological benefits of forest environments on human health. The documented effects on stress hormones and immune function suggest that regular forest bathing could be an effective preventive health strategy. The persistence of benefits for days after exposure indicates potential for lasting health improvements with regular nature immersion.",
    impactScore: 3,
    citationCount: 75,
  },
]

export default function ResearchTimelinePage() {
  const [selectedArticle, setSelectedArticle] = useState(timelineArticles[0])
  const keyword = "mRNA vaccines"

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col md:flex-row">
          {/* Timeline Panel - Always visible with fixed width */}
          <div className="border-r border-gray-200 bg-white w-full md:w-2/5 lg:w-1/3 overflow-hidden">
            {/* Timeline Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Research Timeline</h1>
                  <p className="text-sm text-gray-500">Keyword: {keyword}</p>
                </div>
              </div>

              <div className="relative">
                <Input type="search" placeholder="Search..." className="pl-9" />
                <LucideSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              </div>

              <div className="flex items-center justify-between mt-3">
                <Badge variant="outline" className="flex items-center gap-1">
                  <LucideFilter className="h-3 w-3" />
                  <span>Filter</span>
                </Badge>
                <span className="text-xs text-gray-500">{timelineArticles.length} articles</span>
              </div>
            </div>

            {/* Timeline Content - Always visible */}
            <div className="relative">
              {/* Vertical Line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-blue-200 transform -translate-x-1/2"></div>

              {/* Timeline Items */}
              {timelineArticles.map((article, index) => (
                <div
                  key={index}
                  className={`relative py-4 cursor-pointer transition-all ${selectedArticle.id === article.id ? "bg-blue-50" : "hover:bg-gray-50"}`}
                  onClick={() => setSelectedArticle(article)}
                >
                  {/* Timeline Dot */}
                  <div
                    className={`absolute left-1/2 top-6 w-4 h-4 rounded-full transform -translate-x-1/2 z-10 ${selectedArticle.id === article.id ? "bg-blue-500 ring-4 ring-blue-100" : "bg-blue-300"}`}
                  ></div>

                  {/* Article Content - Alternating sides */}
                  <div
                    className={`flex ${index % 2 === 0 ? "justify-end pr-[calc(50%+1rem)] pl-4" : "justify-start pl-[calc(50%+1rem)] pr-4"}`}
                  >
                    <div className={`w-full max-w-[calc(100%-0.5rem)]`}>
                      {/* Date Label */}
                      <div className="text-xs font-medium text-gray-500 mb-1 flex items-center">
                        <LucideCalendar className="h-3 w-3 mr-1" />
                        {article.date}
                      </div>

                      {/* Article Title */}
                      <h3
                        className={`text-sm font-medium mb-1 line-clamp-2 ${selectedArticle.id === article.id ? "text-blue-700" : "text-gray-900"}`}
                      >
                        {article.title}
                      </h3>

                      {/* Journal */}
                      <p className="text-xs text-gray-500 mb-2">{article.journal}</p>

                      {/* Keywords */}
                      <div className="flex flex-wrap gap-1">
                        {article.keywords.slice(0, 2).map((kw, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs py-0 px-1.5">
                            {kw}
                          </Badge>
                        ))}
                        {article.keywords.length > 2 && (
                          <Badge variant="outline" className="text-xs py-0 px-1.5">
                            +{article.keywords.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Connector Line */}
                  <div
                    className={`absolute top-6 h-0.5 bg-blue-200 ${index % 2 === 0 ? "right-1/2 left-[calc(100%-5rem)]" : "left-1/2 right-[calc(100%-5rem)]"}`}
                  ></div>
                </div>
              ))}
            </div>
          </div>

          {/* Article Detail Panel - Similar to Analysis page */}
          <div className="flex-1 overflow-auto p-4 md:p-6">
            {selectedArticle ? (
              <div>
                {/* Article Header with Actions */}
                <div className="mb-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <span>Source: {selectedArticle.journal}</span>
                        <span>•</span>
                        <span>Published: {selectedArticle.date}</span>
                        <span>•</span>
                        <a href="#" className="flex items-center gap-1 text-blue-600 hover:underline">
                          View Original <LucideExternalLink className="h-3 w-3" />
                        </a>
                      </div>

                      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{selectedArticle.title}</h1>

                      <h2 className="text-xl md:text-2xl font-semibold text-[#1e3a6d] mb-6">
                        AI Summary: {selectedArticle.aiSummary}
                      </h2>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex items-center gap-1">
                        <LucideBookmark className="h-4 w-4" />
                        <span className="hidden sm:inline">Save</span>
                      </Button>
                      <Button variant="outline" size="sm" className="flex items-center gap-1">
                        <LucideShare2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Share</span>
                      </Button>
                      <Button variant="outline" size="sm" className="flex items-center gap-1">
                        <LucideDownload className="h-4 w-4" />
                        <span className="hidden sm:inline">Export</span>
                      </Button>
                      <Button variant="outline" size="sm" className="flex items-center gap-1">
                        <LucidePrinter className="h-4 w-4" />
                        <span className="hidden sm:inline">Print</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Keywords */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-[#1e3a6d] mb-3">Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedArticle.keywords.map((keyword, index) => (
                      <Link href={`/dashboard/research-topic/1`} key={index}>
                        <Badge variant="outline" className="bg-blue-50 text-[#1e3a6d] hover:bg-blue-100 cursor-pointer">
                          {keyword}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Key Findings */}
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle className="text-xl text-[#1e3a6d]">Key Findings</CardTitle>
                    <CardDescription>The most important discoveries from this research</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-4">
                      {selectedArticle.keyFindings.map((finding, idx) => (
                        <li key={idx} className="flex gap-3">
                          <span className="text-2xl">{finding.emoji}</span>
                          <span>{finding.text}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Methodology */}
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle className="text-xl text-[#1e3a6d]">Methodology</CardTitle>
                    <CardDescription>How the research was conducted</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{selectedArticle.methodology}</p>

                    {/* Sample Size */}
                    <div className="mt-4">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Sample Size</span>
                        <span className="text-sm text-gray-500">{selectedArticle.sampleSize} participants</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#1e3a6d] h-2 rounded-full"
                          style={{ width: `${Math.min(100, (selectedArticle.sampleSize / 500) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Conclusions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl text-[#1e3a6d]">Conclusions</CardTitle>
                    <CardDescription>What the researchers concluded</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{selectedArticle.conclusion}</p>

                    {/* Impact Score */}
                    <div className="mt-4 flex items-center gap-2">
                      <div className="text-sm font-medium">Research Impact:</div>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`h-5 w-5 ${star <= selectedArticle.impactScore ? "text-yellow-400" : "text-gray-300"}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-.181h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <div className="text-sm text-gray-500">
                        {selectedArticle.impactScore}/5 ({selectedArticle.citationCount} citations)
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-gray-500">Select an article from the timeline to view details</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

