"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  LucideArrowLeft,
  LucideExternalLink,
  LucideHome,
  LucideCalendar,
  LucideUser,
  LucideClipboard,
  LucideMessageSquare,
  LucideBell,
  LucideChevronRight,
  LucideShare2,
  LucideBookmark,
} from "lucide-react"

// Update the sample article data to be about nutrition and glucose levels
const articleData = {
  id: 1,
  title: "Impact of Whole Food Consumption on Blood Glucose Regulation and Metabolic Health",
  journal: "Journal of Clinical Nutrition",
  date: "April 8, 2023",
  provider: "Dr. Emily Chen",
  providerSpecialty: "Endocrinology & Nutrition",
  sharedDate: "2 days ago",
  aiSummary:
    "Recent research demonstrates that diets rich in whole foods can significantly improve glucose regulation and insulin sensitivity compared to processed food diets, even with similar macronutrient profiles.",
  patientSummary:
    "This research shows that eating whole, unprocessed foods (like vegetables, fruits, whole grains, and lean proteins) can help your body better control blood sugar levels. Even when comparing diets with the same amount of calories, carbs, proteins, and fats, the whole food diet resulted in more stable glucose levels throughout the day and improved how your body responds to insulin (the hormone that regulates blood sugar).",
  keyFindings: [
    {
      emoji: "🥦",
      text: "Diets rich in fiber from vegetables and whole grains slowed glucose absorption and prevented blood sugar spikes.",
    },
    {
      emoji: "⏱️",
      text: "Eating whole foods resulted in more stable blood sugar levels throughout the day compared to processed foods.",
    },
    {
      emoji: "🍎",
      text: "Antioxidants and polyphenols in fruits and vegetables improved insulin sensitivity by 22% in study participants.",
    },
    {
      emoji: "🥄",
      text: "Reducing ultra-processed foods lowered average blood glucose levels even without reducing total carbohydrate intake.",
    },
  ],
  whatThisMeansForYou: [
    "Try replacing refined grains (like white bread) with whole grains (like brown rice or whole wheat) to help stabilize your blood sugar.",
    "Adding more non-starchy vegetables to your meals can improve your glucose response even when eating carbohydrates.",
    "Spacing your meals throughout the day and including protein and healthy fats with carbohydrates can help prevent glucose spikes.",
    "Small, sustainable changes to increase whole foods in your diet may be more beneficial than strict diets that are difficult to maintain.",
  ],
  keywords: ["Nutrition", "Blood Glucose", "Whole Foods", "Insulin Sensitivity", "Metabolic Health"],
}

export default function DemoPatientView() {
  const [showArticle, setShowArticle] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Page Title Section */}
        <div className="bg-white border-b border-gray-200 px-6 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Demo - Patient View</h1>
            <p className="text-gray-600">
              This demo showcases how healthcare providers can share scientific articles with patients through their
              patient portal. The shared articles are automatically translated into patient-friendly language,
              highlighting key points and personalized implications to improve health literacy and patient engagement.
            </p>
          </div>
        </div>

        {/* Mobile App Simulation */}
        <div className="flex-1 p-4 md:p-8 flex justify-center items-start">
          <div className="relative max-w-[375px] w-full h-[700px] bg-white rounded-[40px] shadow-xl border-8 border-gray-800 overflow-hidden">
            {/* Phone Notch */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/3 h-6 bg-gray-800 rounded-b-lg z-10"></div>

            {/* Phone Content */}
            <div className="h-full overflow-y-auto">
              {!showArticle ? (
                // Patient Portal View
                <div className="h-full flex flex-col">
                  {/* Portal Header */}
                  <div className="bg-[#1e3a6d] text-white p-4 sticky top-0 z-10">
                    <div className="flex justify-between items-center">
                      <h2 className="text-lg font-semibold">HealthConnect</h2>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="text-white h-8 w-8">
                          <LucideBell className="h-5 w-5" />
                        </Button>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/placeholder.svg?height=32&width=32" alt="Patient" />
                          <AvatarFallback>JP</AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                  </div>

                  {/* Patient Info */}
                  <div className="bg-blue-50 p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src="/placeholder.svg?height=48&width=48" alt="Patient" />
                        <AvatarFallback>JP</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium text-gray-900">Welcome, Jessica Parker</h3>
                        <p className="text-sm text-gray-600">Last login: Today, 9:45 AM</p>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Menu */}
                  <div className="flex border-b border-gray-200">
                    <div className="flex-1 p-3 text-center border-b-2 border-[#1e3a6d]">
                      <LucideHome className="h-5 w-5 mx-auto text-[#1e3a6d]" />
                      <span className="text-xs font-medium text-[#1e3a6d] mt-1 block">Home</span>
                    </div>
                    <div className="flex-1 p-3 text-center">
                      <LucideCalendar className="h-5 w-5 mx-auto text-gray-500" />
                      <span className="text-xs font-medium text-gray-500 mt-1 block">Appointments</span>
                    </div>
                    <div className="flex-1 p-3 text-center">
                      <LucideMessageSquare className="h-5 w-5 mx-auto text-gray-500" />
                      <span className="text-xs font-medium text-gray-500 mt-1 block">Messages</span>
                    </div>
                    <div className="flex-1 p-3 text-center">
                      <LucideUser className="h-5 w-5 mx-auto text-gray-500" />
                      <span className="text-xs font-medium text-gray-500 mt-1 block">Profile</span>
                    </div>
                  </div>

                  {/* Inbox Section */}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold mb-3">Your Inbox</h3>

                    {/* Shared Article Message */}
                    <Card
                      className="mb-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setShowArticle(true)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="bg-blue-100 p-2 rounded-full">
                            <LucideClipboard className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">Your provider shared an article with you</p>
                                <p className="text-sm text-gray-600 mt-1">
                                  Dr. Emily Chen has shared an article about nutrition and blood glucose management
                                </p>
                              </div>
                              <Badge className="bg-blue-100 text-blue-800 font-medium">New</Badge>
                            </div>
                            <p className="text-sm font-medium text-[#1e3a6d] mt-3 hover:underline flex items-center">
                              {articleData.title}
                              <LucideChevronRight className="h-4 w-4 ml-1" />
                            </p>
                            <p className="text-xs text-gray-500 mt-2">{articleData.sharedDate}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Other Messages */}
                    <Card className="mb-4">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="bg-green-100 p-2 rounded-full">
                            <LucideCalendar className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Appointment Reminder</p>
                            <p className="text-sm text-gray-600 mt-1">
                              You have an upcoming appointment with Dr. Johnson on May 15, 2023
                            </p>
                            <p className="text-xs text-gray-500 mt-2">1 week ago</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="bg-purple-100 p-2 rounded-full">
                            <LucideMessageSquare className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Message from your care team</p>
                            <p className="text-sm text-gray-600 mt-1">
                              Your lab results are now available. Please review them at your convenience.
                            </p>
                            <p className="text-xs text-gray-500 mt-2">2 weeks ago</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                // Article Summary View
                <div className="h-full flex flex-col">
                  {/* Article Header */}
                  <div className="bg-[#1e3a6d] text-white p-4 sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white h-8 w-8"
                        onClick={() => setShowArticle(false)}
                      >
                        <LucideArrowLeft className="h-5 w-5" />
                      </Button>
                      <h2 className="text-base font-semibold">Article Summary</h2>
                    </div>
                  </div>

                  {/* Article Content */}
                  <div className="p-4 flex-1 overflow-auto">
                    <div className="mb-4">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <span>Shared by: {articleData.provider}</span>
                        <span>•</span>
                        <span>{articleData.sharedDate}</span>
                      </div>
                      <h1 className="text-lg font-bold text-gray-900 mb-2">{articleData.title}</h1>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{articleData.journal}</span>
                        <span>•</span>
                        <span>{articleData.date}</span>
                        <a href="#" className="flex items-center gap-1 text-blue-600 ml-auto">
                          <LucideExternalLink className="h-3 w-3" />
                          <span>View Original</span>
                        </a>
                      </div>
                    </div>

                    {/* Patient-friendly Summary */}
                    <Card className="mb-4">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base text-[#1e3a6d]">Summary</CardTitle>
                        <CardDescription>What this article is about</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-700">{articleData.patientSummary}</p>
                      </CardContent>
                    </Card>

                    {/* Key Findings */}
                    <Card className="mb-4">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base text-[#1e3a6d]">Key Points</CardTitle>
                        <CardDescription>Important information from this research</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {articleData.keyFindings.map((finding, idx) => (
                            <li key={idx} className="flex gap-3 text-sm">
                              <span className="text-xl">{finding.emoji}</span>
                              <span className="text-gray-700">{finding.text}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    {/* What This Means For You */}
                    <Card className="mb-4">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base text-[#1e3a6d]">What This Means For You</CardTitle>
                        <CardDescription>How this research might affect your care</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {articleData.whatThisMeansForYou.map((point, idx) => (
                            <li key={idx} className="flex gap-2 text-sm">
                              <span className="text-[#1e3a6d] font-bold">•</span>
                              <span className="text-gray-700">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    {/* Keywords */}
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Related Topics:</h3>
                      <div className="flex flex-wrap gap-2">
                        {articleData.keywords.map((keyword, index) => (
                          <Badge key={index} variant="outline" className="bg-blue-50 text-[#1e3a6d]">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Questions for Provider */}
                    <Card className="mb-4">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base text-[#1e3a6d]">Questions?</CardTitle>
                        <CardDescription>Discuss this article with your provider</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-700 mb-3">
                          If you have questions about this research and how it relates to your health, you can message
                          Dr. Sarah Johnson directly.
                        </p>
                        <Button className="w-full bg-[#1e3a6d]">Message Your Provider</Button>
                      </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mb-6">
                      <Button variant="outline" size="sm" className="flex-1 flex items-center justify-center gap-1">
                        <LucideBookmark className="h-4 w-4" />
                        <span>Save</span>
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 flex items-center justify-center gap-1">
                        <LucideShare2 className="h-4 w-4" />
                        <span>Share</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Phone Home Button */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-1/3 h-1 bg-gray-400 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

