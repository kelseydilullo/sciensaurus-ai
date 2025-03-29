"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
  LucideArrowLeft,
  LucideExternalLink,
  LucideSearch,
  LucideFilter,
  LucideBookmark,
  LucideShare2,
  LucideDownload,
  LucidePrinter,
  LucideChevronRight,
  LucideFileText,
  LucideAlertCircle,
  LucideCheck,
  LucideBell,
  LucideX,
} from "lucide-react"
import Link from "next/link"

// Sample articles data for primary care physician
const articlesData = [
  {
    id: 1,
    title: "Comparative Effectiveness of GLP-1 Receptor Agonists for Weight Management in Primary Care Settings",
    journal: "New England Journal of Medicine",
    date: "May 2, 2023",
    relevanceScore: 98,
    isNew: true,
    category: "Endocrinology",
    keywords: ["GLP-1 Receptor Agonists", "Weight Management", "Obesity", "Primary Care", "Metabolic Health"],
    summary:
      "This study compares the effectiveness of various GLP-1 receptor agonists for weight management when prescribed in primary care settings, with a focus on real-world outcomes outside of clinical trials.",
    clinicalImplications: [
      "Semaglutide demonstrated superior weight reduction (average 15.2% of body weight) compared to other GLP-1 agonists in primary care settings",
      "Tirzepatide showed promising results with additional glycemic benefits for patients with type 2 diabetes",
      "Adherence rates were significantly higher with once-weekly formulations compared to daily dosing",
      "Gastrointestinal side effects were the primary reason for discontinuation across all medications in this class",
    ],
    practiceRecommendations: [
      "Consider starting with lower doses and titrating slowly to minimize gastrointestinal side effects",
      "Monitor for nutritional deficiencies, particularly with rapid weight loss exceeding 1.5% of body weight per week",
      "Combine with behavioral interventions for optimal outcomes",
      "Discuss realistic expectations regarding weight maintenance after discontinuation",
    ],
    supportingEvidence: [
      {
        title: "Long-term weight maintenance after GLP-1 RA discontinuation",
        finding: "50-60% of lost weight is typically regained within one year of discontinuation",
        strength: "Strong",
      },
      {
        title: "Comparison of side effect profiles across GLP-1 RAs",
        finding: "Newer formulations show reduced incidence of nausea and vomiting",
        strength: "Moderate",
      },
    ],
    contradictoryEvidence: [
      {
        title: "Cost-effectiveness in primary care populations",
        finding: "Limited evidence for cost-effectiveness in non-diabetic patients with BMI < 35",
        strength: "Moderate",
      },
    ],
  },
  {
    id: 2,
    title: "Updated Guidelines for Hypertension Management in Primary Care: A Systematic Review and Meta-analysis",
    journal: "JAMA Internal Medicine",
    date: "April 18, 2023",
    relevanceScore: 95,
    isNew: true,
    category: "Cardiology",
    keywords: ["Hypertension", "Blood Pressure", "Guidelines", "Primary Care", "Cardiovascular Risk"],
    summary:
      "This meta-analysis evaluates recent evidence on blood pressure targets and treatment strategies, providing updated recommendations for hypertension management in primary care settings.",
    clinicalImplications: [
      "Lower systolic blood pressure targets (<130 mmHg) showed additional benefit in high-risk patients but not in low-risk populations",
      "Initial combination therapy demonstrated faster achievement of BP goals compared to stepped care approaches",
      "Home blood pressure monitoring improved treatment adherence and outcomes when integrated with clinical decision support",
      "Chronotherapy (evening dosing) showed modest benefits for nocturnal hypertension but mixed results for overall outcomes",
    ],
    practiceRecommendations: [
      "Consider patient-specific cardiovascular risk when determining BP targets",
      "Initial combination therapy is recommended for patients with BP >20/10 mmHg above target",
      "Incorporate home BP monitoring with structured reporting into treatment plans",
      "Assess for white coat and masked hypertension before initiating or intensifying therapy",
    ],
    supportingEvidence: [
      {
        title: "Cardiovascular outcomes with intensive BP control",
        finding: "NNT of 67 to prevent one major cardiovascular event with targets <130 mmHg vs <140 mmHg",
        strength: "Strong",
      },
      {
        title: "Medication adherence with combination pills",
        finding: "26% improvement in adherence with single-pill combinations vs multiple pills",
        strength: "Strong",
      },
    ],
    contradictoryEvidence: [
      {
        title: "Intensive BP control in elderly patients",
        finding: "Increased risk of falls and acute kidney injury in patients >80 years with SBP <130 mmHg",
        strength: "Moderate",
      },
    ],
  },
  {
    id: 3,
    title: "Efficacy of Brief Behavioral Interventions for Insomnia in Primary Care: Randomized Controlled Trial",
    journal: "Annals of Family Medicine",
    date: "March 10, 2023",
    relevanceScore: 92,
    isNew: true,
    category: "Behavioral Health",
    keywords: ["Insomnia", "Cognitive Behavioral Therapy", "Sleep", "Primary Care", "Brief Intervention"],
    summary:
      "This randomized controlled trial evaluates the effectiveness of brief behavioral interventions for insomnia that can be delivered in primary care settings, comparing outcomes with standard pharmacological approaches.",
    clinicalImplications: [
      "Brief CBT-I interventions (3 sessions) delivered by trained primary care staff showed significant improvements in sleep efficiency and quality",
      "Digital CBT-I applications demonstrated comparable efficacy to in-person brief interventions",
      "Combined approach (brief behavioral + intermittent low-dose medication) showed superior outcomes to either approach alone",
      "Improvements in sleep were associated with reduced anxiety and depression symptoms at 6-month follow-up",
    ],
    practiceRecommendations: [
      "Consider brief behavioral interventions as first-line treatment for chronic insomnia",
      "Implement a stepped care approach, starting with digital tools and progressing to in-person interventions as needed",
      "Limit benzodiazepine receptor agonists to short-term use (2-4 weeks) while initiating behavioral strategies",
      "Screen for and address comorbid conditions that may impact sleep (depression, sleep apnea, restless leg syndrome)",
    ],
    supportingEvidence: [
      {
        title: "Long-term outcomes of CBT-I vs. medication",
        finding: "CBT-I shows superior outcomes at 1-year follow-up compared to pharmacotherapy",
        strength: "Strong",
      },
      {
        title: "Cost-effectiveness in primary care",
        finding: "Brief CBT-I interventions are cost-effective compared to medication-only approaches",
        strength: "Moderate",
      },
    ],
    contradictoryEvidence: [
      {
        title: "Efficacy in patients with significant psychiatric comorbidities",
        finding: "Limited evidence for effectiveness in patients with untreated bipolar disorder or PTSD",
        strength: "Moderate",
      },
    ],
  },
  {
    id: 4,
    title: "Point-of-Care Ultrasound for Common Diagnostic Challenges in Primary Care",
    journal: "American Family Physician",
    date: "February 5, 2023",
    relevanceScore: 88,
    isNew: false,
    category: "Diagnostic Tools",
    keywords: ["POCUS", "Ultrasound", "Diagnosis", "Primary Care", "Imaging"],
    summary:
      "This systematic review examines the utility, accuracy, and implementation of point-of-care ultrasound for common diagnostic challenges encountered in primary care settings.",
  },
  {
    id: 5,
    title: "Deprescribing Strategies for Polypharmacy in Elderly Patients: A Practical Approach",
    journal: "Journal of the American Geriatrics Society",
    date: "January 22, 2023",
    relevanceScore: 85,
    isNew: false,
    category: "Geriatrics",
    keywords: ["Deprescribing", "Polypharmacy", "Elderly", "Medication Management", "Primary Care"],
    summary:
      "This review provides evidence-based strategies for identifying inappropriate medications and implementing deprescribing protocols in elderly patients with polypharmacy in primary care settings.",
  },
]

// Sample data for articles shared with patients
const sharedArticles = [
  {
    id: 1,
    patientName: "Jessica Parker",
    articleTitle: "Impact of Whole Food Consumption on Blood Glucose Regulation and Metabolic Health",
    dateShared: "May 10, 2023",
    patientEmail: "jessica.parker@example.com",
  },
  {
    id: 2,
    patientName: "Michael Rodriguez",
    articleTitle: "Understanding the Benefits of Regular Physical Activity for Hypertension Management",
    dateShared: "May 5, 2023",
    patientEmail: "m.rodriguez@example.com",
  },
  {
    id: 3,
    patientName: "Sarah Johnson",
    articleTitle: "Sleep Hygiene Practices for Improving Insomnia and Overall Health",
    dateShared: "April 28, 2023",
    patientEmail: "sarah.j@example.com",
  },
  {
    id: 4,
    patientName: "Robert Chen",
    articleTitle: "Dietary Approaches to Managing Type 2 Diabetes: Beyond Carbohydrate Counting",
    dateShared: "April 15, 2023",
    patientEmail: "robert.chen@example.com",
  },
]

// Define interface for article
interface Article {
  id: number;
  title: string;
  journal: string;
  date: string;
  relevanceScore: number;
  isNew: boolean;
  category: string;
  keywords: string[];
  summary: string;
  clinicalImplications?: string[];
  practiceRecommendations?: string[];
  supportingEvidence?: {
    title: string;
    finding: string;
    strength: string;
  }[];
  contradictoryEvidence?: {
    title: string;
    finding: string;
    strength: string;
  }[];
}

export default function DemoDoctorView() {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [activeTab, setActiveTab] = useState("all")

  const handleBackToInbox = () => {
    setSelectedArticle(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Page Title Section */}
        <div className="bg-white border-b border-gray-200 px-6 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Demo - Doctor View</h1>
            <p className="text-gray-600">
              This demo showcases how Sciensaurus helps physicians stay updated with the latest research relevant to
              their specialty. The platform curates high-impact studies, provides concise summaries with clinical
              implications, and enables easy sharing of patient-friendly versions with your patients.
            </p>
          </div>
        </div>

        {/* Doctor Dashboard */}
        <div className="flex-1 p-6">
          {!selectedArticle ? (
            // Inbox View
            <div className="max-w-6xl mx-auto">
              {/* Doctor Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="/placeholder.svg?height=48&width=48" alt="Doctor" />
                    <AvatarFallback>DM</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Dr. David Mitchell</h2>
                    <p className="text-gray-600">Primary Care Medicine</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <LucideBell className="h-4 w-4" />
                    <span>Notifications</span>
                    <Badge className="ml-1 bg-red-500 text-white">3</Badge>
                  </Button>
                  <Button className="bg-[#1e3a6d] hover:bg-[#0f2a4d] text-white">Update Preferences</Button>
                </div>
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

              {/* Tabs */}
              <Tabs defaultValue="new" className="mb-6" onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="new">
                    New Articles <Badge className="ml-1 bg-red-500 text-white">3</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="saved">Saved</TabsTrigger>
                  <TabsTrigger value="shared">Shared with Patients</TabsTrigger>
                </TabsList>

                {/* New Articles Tab */}
                <TabsContent value="new" className="space-y-4">
                  {articlesData
                    .filter((article) => article.isNew)
                    .map((article) => (
                      <Card
                        key={article.id}
                        className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setSelectedArticle(article)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="bg-blue-100 p-2 rounded-full">
                              <LucideFileText className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-semibold text-lg text-gray-900">{article.title}</h3>
                                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                    <span>{article.journal}</span>
                                    <span>•</span>
                                    <span>{article.date}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-blue-100 text-blue-800">New</Badge>
                                  <Badge className="bg-gray-100 text-gray-800">
                                    Relevance: {article.relevanceScore}%
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-gray-600 mt-3 line-clamp-2">{article.summary}</p>
                              <div className="flex flex-wrap gap-2 mt-3">
                                {article.keywords.slice(0, 3).map((keyword: string, idx: number) => (
                                  <Badge key={idx} variant="outline" className="bg-gray-50">
                                    {keyword}
                                  </Badge>
                                ))}
                                {article.keywords.length > 3 && (
                                  <Badge variant="outline" className="bg-gray-50">
                                    +{article.keywords.length - 3} more
                                  </Badge>
                                )}
                              </div>
                              <div className="flex justify-between items-center mt-4">
                                <Badge variant="outline" className="bg-gray-50 text-gray-700">
                                  {article.category}
                                </Badge>
                                <Button variant="ghost" size="sm" className="text-[#1e3a6d]">
                                  View Details <LucideChevronRight className="ml-1 h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </TabsContent>

                {/* Saved Articles Tab */}
                <TabsContent value="saved" className="p-8 text-center text-gray-500">
                  <LucideBookmark className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">No saved articles</h3>
                  <p>Articles you save will appear here for quick reference</p>
                </TabsContent>

                {/* Shared with Patients Tab */}
                <TabsContent value="shared">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl text-[#1e3a6d]">Articles Shared with Patients</CardTitle>
                      <CardDescription>Track which articles you've shared and with whom</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Patient
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Article
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Date Shared
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {sharedArticles.map((shared) => (
                              <tr key={shared.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <Avatar className="h-8 w-8 mr-3">
                                      <AvatarFallback>
                                        {shared.patientName
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">{shared.patientName}</div>
                                      <div className="text-sm text-gray-500">{shared.patientEmail}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-sm text-gray-900 line-clamp-2">{shared.articleTitle}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-500">{shared.dateShared}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <div className="flex justify-end items-center gap-2">
                                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                                      <LucideShare2 className="h-4 w-4" />
                                      <span className="sr-only">Reshare</span>
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800">
                                      <LucideX className="h-4 w-4" />
                                      <span className="sr-only">Delete</span>
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            // Article Detail View
            <div className="max-w-5xl mx-auto">
              {/* Back Button */}
              <Button variant="ghost" size="sm" className="mb-4 text-[#1e3a6d]" onClick={handleBackToInbox}>
                <LucideArrowLeft className="mr-1 h-4 w-4" />
                Back to Articles
              </Button>

              {/* Article Header */}
              <div className="mb-8">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <span>{selectedArticle.journal}</span>
                      <span>•</span>
                      <span>Published: {selectedArticle.date}</span>
                      <span>•</span>
                      <a href="#" className="flex items-center gap-1 text-blue-600 hover:underline">
                        View Original <LucideExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{selectedArticle.title}</h1>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedArticle.keywords.map((keyword: string, idx: number) => (
                        <Link href={`/dashboard/research-topic/1`} key={idx}>
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-[#1e3a6d] hover:bg-blue-100 cursor-pointer"
                          >
                            {keyword}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                      <LucideBookmark className="h-4 w-4" />
                      <span className="hidden sm:inline">Save</span>
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                      <LucideShare2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Share with Patient</span>
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

              {/* Study Summary */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-xl text-[#1e3a6d]">Study Summary</CardTitle>
                  <CardDescription>Concise overview of the research</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{selectedArticle.summary}</p>
                </CardContent>
              </Card>

              {/* Clinical Implications */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-xl text-[#1e3a6d]">Clinical Implications</CardTitle>
                  <CardDescription>How this research may impact clinical practice</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="mt-2 space-y-2">
                    {selectedArticle.clinicalImplications?.map((implication: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#1e3a6d] font-bold">•</span>
                        <span className="text-gray-700">{implication}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Practice Recommendations */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-xl text-[#1e3a6d]">Practice Recommendations</CardTitle>
                  <CardDescription>Actionable guidance for clinical practice</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {selectedArticle.practiceRecommendations?.map((recommendation: string, idx: number) => (
                      <li key={idx} className="flex gap-3">
                        <LucideCheck className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <span className="text-gray-700">{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Evidence Assessment */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Supporting Evidence */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-[#1e3a6d]">Supporting Evidence</CardTitle>
                    <CardDescription>Research that supports these findings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-4">
                      {selectedArticle.supportingEvidence?.map((evidence: any, idx: number) => (
                        <li key={idx} className="border-l-4 border-green-500 pl-4 py-1">
                          <h4 className="font-medium text-gray-900">{evidence.title}</h4>
                          <p className="text-sm text-gray-700 mt-1">{evidence.finding}</p>
                          <Badge className="mt-2 bg-green-100 text-green-800">{evidence.strength} Evidence</Badge>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Contradictory Evidence */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-[#1e3a6d]">Contradictory Evidence</CardTitle>
                    <CardDescription>Research that presents alternative findings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-4">
                      {selectedArticle.contradictoryEvidence?.map((evidence: any, idx: number) => (
                        <li key={idx} className="border-l-4 border-amber-500 pl-4 py-1">
                          <h4 className="font-medium text-gray-900">{evidence.title}</h4>
                          <p className="text-sm text-gray-700 mt-1">{evidence.finding}</p>
                          <Badge className="mt-2 bg-amber-100 text-amber-800">{evidence.strength} Evidence</Badge>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Share with Patient */}
              <Card className="mb-6 border-2 border-dashed border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-lg text-[#1e3a6d] flex items-center">
                    <LucideAlertCircle className="h-5 w-5 mr-2 text-blue-600" />
                    Share with Your Patients
                  </CardTitle>
                  <CardDescription>This article has been translated into patient-friendly language</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4">
                    Share a simplified version of this research with your patients to improve health literacy and
                    engagement. The patient version includes plain language explanations, practical advice, and
                    personalized implications.
                  </p>
                  <div className="flex gap-3">
                    <Button className="bg-[#1e3a6d] text-white">Preview Patient Version</Button>
                    <Button variant="outline">Share with Patient</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

