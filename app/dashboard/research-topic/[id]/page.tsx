"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import {
  LucideSearch,
  LucideCalendar,
  LucideFilter,
  LucideExternalLink,
  LucideBookmark,
  LucideShare2,
  LucideDownload,
  LucidePrinter,
  LucideChevronLeft,
} from "lucide-react"

// Mock data for the research topic
const getResearchTopic = (id) => {
  return {
    id: id,
    topic: "Gut Microbiome",
    count: 12,
    lastResearched: "2 days ago",
    relatedKeywords: ["Probiotics", "Mental Health", "Digestive Health", "Immune Function"],
    relatedTopics: [
      { id: 2, name: "Probiotics" },
      { id: 3, name: "Nutrition" },
      { id: 4, name: "Mental Health" },
      { id: 5, name: "Immune Function" },
      { id: 6, name: "Metabolic Health" },
    ],
  }
}

// Dummy data for timeline articles - same as in research-timeline page
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

export default function ResearchTopicPage() {
  const router = useRouter()
  const params = useParams()
  const topicId = params?.id

  const [topic, setTopic] = useState(null)
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // In a real app, this would be an API call
    const fetchedTopic = getResearchTopic(topicId)
    setTopic(fetchedTopic)

    // Default to the most recent article
    if (timelineArticles.length > 0) {
      setSelectedArticle(timelineArticles[0])
    }

    setIsLoading(false)
  }, [topicId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <DashboardSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1e3a6d] mb-4"></div>
            <h3 className="text-xl font-medium text-gray-900">Loading...</h3>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Topic Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-4">
              <Link
                href="/dashboard/research-interests"
                className="text-[#1e3a6d] hover:underline flex items-center text-sm"
              >
                <LucideChevronLeft className="h-4 w-4 mr-1" />
                Back to Research Interests
              </Link>
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Research Topic: {topic?.topic}</h1>
                <div className="flex items-center mt-2">
                  <Badge className="bg-blue-100 text-blue-800 mr-2">{topic?.count} articles</Badge>
                  <span className="text-sm text-gray-500">Last researched: {topic?.lastResearched}</span>
                </div>
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
              </div>
            </div>

            {/* Related Topics */}
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Related Topics:</h3>
              <div className="flex flex-wrap gap-2">
                {topic?.relatedTopics.map((relatedTopic) => (
                  <Button
                    key={relatedTopic.id}
                    variant="outline"
                    size="sm"
                    className="bg-gray-50 hover:bg-gray-100"
                    onClick={() => router.push(`/dashboard/research-topic/${relatedTopic.id}`)}
                  >
                    {relatedTopic.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col md:flex-row">
          {/* Timeline Panel - Fixed width */}
          <div className="border-r border-gray-200 bg-white w-full md:w-2/5 lg:w-1/3 overflow-hidden">
            {/* Timeline Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Research Timeline</h2>
              <p className="text-sm text-gray-500 mb-3">Chronological view of research on {topic?.topic}</p>

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

            {/* Timeline Content */}
            <div className="relative">
              {/* Vertical Line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-blue-200 transform -translate-x-1/2"></div>

              {/* Timeline Items */}
              {timelineArticles.map((article, index) => (
                <div
                  key={index}
                  className={`relative py-4 cursor-pointer transition-all ${selectedArticle?.id === article.id ? "bg-blue-50" : "hover:bg-gray-50"}`}
                  onClick={() => setSelectedArticle(article)}
                >
                  {/* Timeline Dot */}
                  <div
                    className={`absolute left-1/2 top-6 w-4 h-4 rounded-full transform -translate-x-1/2 z-10 ${selectedArticle?.id === article.id ? "bg-blue-500 ring-4 ring-blue-100" : "bg-blue-300"}`}
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
                        className={`text-sm font-medium mb-1 line-clamp-2 ${selectedArticle?.id === article.id ? "text-blue-700" : "text-gray-900"}`}
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

          {/* Article Detail Panel - Matching the Analysis page format */}
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
                      <Badge
                        key={index}
                        variant="outline"
                        className="bg-blue-50 text-[#1e3a6d] hover:bg-blue-100 cursor-pointer"
                      >
                        {keyword}
                      </Badge>
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

                {/* Cohort Analysis */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-[#1e3a6d] mb-3">Cohort Analysis</h3>
                  <Card>
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        {/* Sample Size */}
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Sample Size</span>
                            <span className="text-sm text-gray-500">{selectedArticle.sampleSize} participants</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-[#1e3a6d] h-2 rounded-full" style={{ width: "100%" }}></div>
                          </div>
                        </div>

                        {/* Age Distribution */}
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Age Distribution</span>
                          </div>
                          <div className="flex items-end h-16 gap-1">
                            <div className="bg-blue-200 w-full rounded-t" style={{ height: "20%" }}>
                              <div className="text-xs text-center mt-1">18-24</div>
                              <div className="text-xs text-center font-medium">8%</div>
                            </div>
                            <div className="bg-blue-300 w-full rounded-t" style={{ height: "45%" }}>
                              <div className="text-xs text-center mt-1">25-34</div>
                              <div className="text-xs text-center font-medium">18%</div>
                            </div>
                            <div className="bg-blue-400 w-full rounded-t" style={{ height: "75%" }}>
                              <div className="text-xs text-center mt-1">35-49</div>
                              <div className="text-xs text-center font-medium">30%</div>
                            </div>
                            <div className="bg-blue-500 w-full rounded-t" style={{ height: "100%" }}>
                              <div className="text-xs text-center mt-1">50-64</div>
                              <div className="text-xs text-center font-medium">40%</div>
                            </div>
                            <div className="bg-blue-600 w-full rounded-t" style={{ height: "25%" }}>
                              <div className="text-xs text-center mt-1 text-white">65+</div>
                              <div className="text-xs text-center font-medium text-white">10%</div>
                            </div>
                          </div>
                        </div>

                        {/* Gender Distribution and Study Duration */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm font-medium">Gender</span>
                            <div className="flex mt-1">
                              <div className="bg-blue-500 h-4 rounded-l" style={{ width: "52%" }}></div>
                              <div className="bg-pink-400 h-4 rounded-r" style={{ width: "48%" }}></div>
                            </div>
                            <div className="flex justify-between text-xs mt-1">
                              <span>Male: 52%</span>
                              <span>Female: 48%</span>
                            </div>
                          </div>

                          {/* Study Duration */}
                          <div>
                            <span className="text-sm font-medium">Study Duration</span>
                            <div className="flex items-center mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-green-500 h-2 rounded-full" style={{ width: "75%" }}></div>
                              </div>
                              <span className="ml-2 text-sm">18 months</span>
                            </div>
                          </div>
                        </div>

                        {/* Geographic Distribution */}
                        <div>
                          <span className="text-sm font-medium">Geographic Distribution</span>
                          <div className="flex flex-wrap gap-1 mt-2">
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">North America (42%)</Badge>
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Europe (28%)</Badge>
                            <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Asia (18%)</Badge>
                            <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">
                              South America (8%)
                            </Badge>
                            <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Africa (4%)</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Related Research */}
                <h3 className="text-xl font-semibold text-[#1e3a6d] mb-6">Related Research</h3>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Supporting Research */}
                  <div>
                    <h4 className="text-lg font-medium mb-4 flex items-center">
                      <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                      Supporting Research
                    </h4>
                    <div className="space-y-4">
                      {[
                        {
                          title:
                            "Dietary Modulation of the Gut Microbiome and Its Impact on Mental Health: A Systematic Review",
                          journal: "Cell",
                          date: "February 2023",
                          findings: [
                            "Prebiotic fiber intake significantly increases beneficial gut bacteria",
                            "Fermented foods enhance microbial diversity and reduce inflammation",
                          ],
                        },
                        {
                          title: "Fecal Microbiota Transplantation Shows Promise for Treatment-Resistant Depression",
                          journal: "Nature Psychiatry",
                          date: "January 2023",
                          findings: [
                            "FMT from healthy donors improved depression symptoms in 70% of recipients",
                            "Changes in microbiome composition correlated with symptom improvement",
                          ],
                        },
                        {
                          title: "Gut-Brain Axis: Mechanisms of Bidirectional Communication in Health and Disease",
                          journal: "Science Translational Medicine",
                          date: "December 2022",
                          findings: [
                            "Vagus nerve identified as primary pathway for gut-brain signaling",
                            "Microbial metabolites directly influence neurotransmitter production",
                          ],
                        },
                      ].map((article, index) => (
                        <Card key={index} className="border-l-4 border-l-green-500">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">{article.title}</CardTitle>
                            <CardDescription className="text-xs">
                              {article.journal} • {article.date}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ul className="text-sm space-y-1">
                              {article.findings.map((finding, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-green-500 font-bold">✓</span>
                                  <span>{finding}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Contradictory Research */}
                  <div>
                    <h4 className="text-lg font-medium mb-4 flex items-center">
                      <span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                      Contradictory Research
                    </h4>
                    <div className="space-y-4">
                      {[
                        {
                          title: "Limitations of Microbiome Analysis in Predicting Individual Health Outcomes",
                          journal: "Nature Methods",
                          date: "March 2023",
                          findings: [
                            "High inter-individual variability limits predictive power",
                            "Sampling methods significantly affect results and reproducibility",
                          ],
                        },
                        {
                          title: "Probiotic Supplementation Shows Inconsistent Effects on Mental Health",
                          journal: "Frontiers in Psychiatry",
                          date: "January 2023",
                          findings: [
                            "Significant placebo effect observed in many trials",
                            "Strain-specific effects not consistently replicated across studies",
                          ],
                        },
                        {
                          title: "Methodological Challenges in Establishing Causality in Gut-Brain Research",
                          journal: "Nature Reviews Neuroscience",
                          date: "February 2023",
                          findings: [
                            "Correlation often misinterpreted as causation in microbiome studies",
                            "Animal models poorly translate to human outcomes in many cases",
                          ],
                        },
                      ].map((article, index) => (
                        <Card key={index} className="border-l-4 border-l-red-500">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">{article.title}</CardTitle>
                            <CardDescription className="text-xs">
                              {article.journal} • {article.date}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ul className="text-sm space-y-1">
                              {article.findings.map((finding, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-red-500 font-bold">✗</span>
                                  <span>{finding}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
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

