'use client';

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  LucideBookOpen,
  LucideCalendarClock,
  LucideFileText,
  LucideList,
  LucideSearch,
  LucideUsers,
  LucideArrowRight,
  LucideX
} from "lucide-react"
import { SciensaurusLogo } from "@/components/sciensaurus-logo"
import { ArticleAnalyzer } from "@/components/article-analyzer"
import ArticleSummaryContent from "@/components/article-summary-content"
import React from "react"
import PreAnalyzedArticles from "@/components/pre-analyzed-articles"

interface ArticleData {
  title: string;
  source: string;
  publish_date: string | null;
  summary: string;
  rawText: string;
  visual_summary: any[];
  keywords: string[];
  study_metadata: {
    studyType?: string;
    duration?: string;
    dateRange?: string;
    cohortSize?: number;
    summary?: string;
    cohortStratification?: {
      gender?: {
        male?: number;
        female?: number;
        other?: number;
      };
      ageRanges?: Array<{
        range: string;
        percentage: number;
      }>;
      demographics?: Array<{
        region: string;
        percentage: number;
      }>;
    };
    demographics?: {
      age?: string;
      gender?: string;
      ethnicities?: string[];
      locations?: string[];
    };
    notes?: string[];
  };
}

interface RelatedResearch {
  supporting: any[];
  contradictory: any[];
  totalFound: number;
  searchKeywords: string[];
  isPreview: boolean;
  error?: string;
}

export default function LandingPage() {
  const [showArticleSummary, setShowArticleSummary] = useState(false);
  const [articleData, setArticleData] = useState<ArticleData | null>(null);
  const [articleUrl, setArticleUrl] = useState('');
  const [relatedResearch, setRelatedResearch] = useState<RelatedResearch>({
    supporting: [],
    contradictory: [],
    totalFound: 0,
    searchKeywords: [],
    isPreview: true
  });
  // Add ref for ArticleAnalyzer reset function
  const resetUrlInputRef = React.useRef<() => void>(() => {});

  // Sample article data for demo purposes
  const getSampleArticleData = () => {
    return {
      title: "Impact of Whole Food Consumption on Blood Glucose Regulation and Metabolic Health",
      source: "Journal of Clinical Nutrition",
      publish_date: "April 12, 2023",
      summary: "Whole foods significantly improve glucose regulation compared to processed foods, even with identical macronutrient profiles. This study found diets rich in fiber from vegetables and whole grains slowed glucose absorption and prevented blood sugar spikes by 42% compared to processed food diets. Continuous glucose monitoring showed 37% less glycemic variability in participants consuming whole foods versus processed foods with identical macronutrient ratios.",
      rawText: "### Original Article Title: Impact of Whole Food Consumption on Blood Glucose Regulation and Metabolic Health\n\n### Summarized Title: Whole foods significantly improve glucose regulation compared to processed foods, even with identical macronutrient profiles\n\n### Visual Summary:\n🥦 Diets rich in fiber from vegetables and whole grains slowed glucose absorption and prevented blood sugar spikes by 42% compared to processed food diets.\n📊 Continuous glucose monitoring showed 37% less glycemic variability in participants consuming whole foods versus processed foods with identical macronutrient ratios.\n⏱️ Whole food meals resulted in sustained energy levels for 4-5 hours compared to 2-3 hours with processed food meals of equal caloric content.\n🍎 Antioxidants and polyphenols in fruits and vegetables improved insulin sensitivity by 22% in study participants after just 14 days.\n🥄 Reducing ultra-processed foods lowered average blood glucose levels by 15% even without reducing total carbohydrate intake.\n🧠 Cognitive performance tests showed 18% improvement in focus and attention during the whole food phase compared to the processed food phase.\n💤 Sleep quality improved by 27% during the whole food intervention, correlating with improved overnight glucose regulation.\n\n### Keywords: Whole Foods, Blood Glucose, Glycemic Response, Insulin Sensitivity, Metabolic Health, Processed Foods, Nutrition, Fiber, Polyphenols, Continuous Glucose Monitoring\n\n### Methodology:\nStudy Type: 12-week crossover design\nCohort Size: 248 participants\n\nDemographics:\n- Age Distribution: 18-30: 15%, 31-45: 30%, 46-60: 40%, 61-75: 15%\n- Gender: Male: 48%, Female: 52%\n- Metabolic Status: Healthy: 60%, Pre-diabetic: 40%\n- Geographic Distribution: North America (45%), Europe (30%), Asia (15%), Australia (10%)\n\nNotes:\n- All participants completed both the whole food and processed food phases\n- Continuous glucose monitoring was used throughout the 12-week period\n- Dietary compliance was verified through food journals and biomarker testing\n- Participants maintained consistent exercise habits throughout the study",
      visual_summary: [
        { emoji: "🥦", point: "Diets rich in fiber from vegetables and whole grains slowed glucose absorption and prevented blood sugar spikes by 42% compared to processed food diets." },
        { emoji: "📊", point: "Continuous glucose monitoring showed 37% less glycemic variability in participants consuming whole foods versus processed foods with identical macronutrient ratios." },
        { emoji: "⏱️", point: "Whole food meals resulted in sustained energy levels for 4-5 hours compared to 2-3 hours with processed food meals of equal caloric content." },
        { emoji: "🍎", point: "Antioxidants and polyphenols in fruits and vegetables improved insulin sensitivity by 22% in study participants after just 14 days." },
        { emoji: "🥄", point: "Reducing ultra-processed foods lowered average blood glucose levels by 15% even without reducing total carbohydrate intake." },
        { emoji: "🧠", point: "Cognitive performance tests showed 18% improvement in focus and attention during the whole food phase compared to the processed food phase." },
        { emoji: "💤", point: "Sleep quality improved by 27% during the whole food intervention, correlating with improved overnight glucose regulation." }
      ],
      keywords: ["Whole Foods", "Blood Glucose", "Glycemic Response", "Insulin Sensitivity", "Metabolic Health", "Processed Foods", "Nutrition", "Fiber", "Polyphenols", "Continuous Glucose Monitoring"],
      study_metadata: {
        studyType: "12-week crossover design",
        cohortSize: 248,
        demographics: {
          age: [
            { range: "18-30", percentage: 15 },
            { range: "31-45", percentage: 30 },
            { range: "46-60", percentage: 40 },
            { range: "61-75", percentage: 15 }
          ],
          gender: {
            male: 48,
            female: 52,
            other: 0
          },
          regions: [
            { region: "North America", percentage: 45 },
            { region: "Europe", percentage: 30 },
            { region: "Asia", percentage: 15 },
            { region: "Australia", percentage: 10 }
          ]
        },
        notes: [
          "All participants completed both the whole food and processed food phases",
          "Continuous glucose monitoring was used throughout the 12-week period",
          "Dietary compliance was verified through food journals and biomarker testing",
          "Participants maintained consistent exercise habits throughout the study"
        ]
      }
    };
  };

  // Sample related research data
  const getSampleRelatedResearch = () => {
    return {
      supporting: [
        {
          title: "Dietary Fiber Consumption and Postprandial Glucose Excursions: A Systematic Review and Meta-Analysis",
          journal: "Diabetes Care",
          year: 2023,
          url: "https://pubmed.example.com/dietary-fiber",
          finding: "Higher fiber intake consistently reduces postprandial glucose spikes. Soluble fiber shows strongest effect on glycemic control."
        },
        {
          title: "Food Matrix Effects on Nutrient Absorption and Metabolic Response",
          journal: "American Journal of Clinical Nutrition",
          year: 2023,
          url: "https://pubmed.example.com/food-matrix",
          finding: "Whole food matrices slow nutrient absorption compared to isolated nutrients. Food structure preservation improves satiety and metabolic markers."
        },
        {
          title: "Polyphenol-Rich Foods and Insulin Sensitivity: Mechanisms and Clinical Implications",
          journal: "Journal of Nutritional Biochemistry",
          year: 2022,
          url: "https://pubmed.example.com/polyphenols",
          finding: "Polyphenols improve cellular glucose uptake and insulin signaling. Regular consumption reduces inflammatory markers associated with insulin resistance."
        }
      ],
      contradictory: [
        {
          title: "Individual Variability in Glycemic Responses to Identical Foods",
          journal: "Cell",
          year: 2023,
          url: "https://pubmed.example.com/variability",
          finding: "High inter-individual variability in glucose responses to identical meals. Personalized approaches may be more effective than general whole food recommendations."
        },
        {
          title: "Caloric Density vs Food Quality: Comparative Effects on Metabolic Health",
          journal: "Obesity Research",
          year: 2023,
          url: "https://pubmed.example.com/caloric-density",
          finding: "Caloric restriction with processed foods showed similar weight loss to whole foods. Total caloric intake may be more important than food quality for some outcomes."
        },
        {
          title: "Cost-Benefit Analysis of Whole Food vs. Processed Food Diets in Low-Income Populations",
          journal: "Public Health Nutrition",
          year: 2022,
          url: "https://pubmed.example.com/cost-benefit",
          finding: "Whole food diets significantly more expensive and less accessible. Socioeconomic barriers limit practical implementation of study findings."
        }
      ],
      totalFound: 6,
      searchKeywords: ["whole foods", "blood glucose", "glycemic response", "insulin sensitivity", "nutrition"],
      isPreview: true
    };
  };

  // Function to handle article analysis completion
  const handleAnalysisComplete = (url: string, data: any) => {
    console.log("Article analysis complete for URL:", url);
    console.log("Received data:", data);
    
    // Save the URL the user entered
    setArticleUrl(url);
    
    // Check if we received sufficient data from the API
    const hasMinimalData = data && 
                          (data.title || data.summary || 
                           (data.visual_summary && data.visual_summary.length) || 
                           (data.keywords && data.keywords.length));
    
    // If we have sufficient API data, use it; otherwise use sample data
    if (hasMinimalData) {
      console.log("Using API data for summary - found valid data");
      
      // Format the data properly to match ArticleData interface
      const processedData = {
        title: data.title || "Article Summary",
        source: data.source || url.split('/')[2] || "Web Article", // Extract domain as fallback source
        publish_date: data.publish_date || null,
        summary: data.summary || "",
        rawText: data.content || data.rawText || "",
        visual_summary: data.visual_summary || [],
        keywords: data.keywords || [],
        study_metadata: data.study_metadata || data.cohortAnalysis || {}
      } as ArticleData;
      
      console.log("Processed data:", {
        title: processedData.title,
        source: processedData.source,
        publish_date: processedData.publish_date,
        summaryLength: processedData.summary.length,
        visual_summary_count: processedData.visual_summary.length,
        keywords: processedData.keywords,
        has_study_metadata: !!processedData.study_metadata && Object.keys(processedData.study_metadata).length > 0
      });
      
      setArticleData(processedData);
      
      // If API provided related research, use it; otherwise use sample data for preview
      const relatedResearchData = data.relatedResearch || getSampleRelatedResearch();
      // Ensure isPreview flag is correctly set for the component state
      relatedResearchData.isPreview = true; 
            
      setRelatedResearch(relatedResearchData);
      setShowArticleSummary(true);
    } else {
      console.log("Using sample data for demo - insufficient API data");
      console.log("Data quality check:", {
        hasData: !!data,
        hasTitle: data?.title ? true : false,
        hasSummary: data?.summary ? true : false,
        hasVisualSummary: data?.visual_summary ? true : false,
        hasKeywords: data?.keywords ? true : false
      });
      
      // If API data is insufficient, use sample data for demo
      const sampleData = getSampleArticleData() as unknown as ArticleData;
      setArticleData(sampleData);
      
      // Add a slight delay before showing the summary to simulate API processing
      setTimeout(() => {
        setRelatedResearch(getSampleRelatedResearch());
        setShowArticleSummary(true);
        
        // Scroll to the article summary
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 500);
      
      return; // Exit early as we're using setTimeout
    }
    
    // Scroll to the article summary
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Function to hide the article summary and return to the landing page
  const handleCloseArticleSummary = () => {
    setShowArticleSummary(false);
    // Clear the URL input when returning to landing page
    resetUrlInputRef.current();
  };

  // Mock function for retry since we won't implement that fully here
  const retryRelatedResearch = () => {
    console.log("This would retry fetching related research");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Article Summary Overlay when an article has been analyzed */}
      {showArticleSummary && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="sticky top-0 bg-[#1e3a6d] text-white z-10 flex justify-between items-center p-4">
            <div className="flex items-center gap-2">
              <SciensaurusLogo className="h-8 w-8" variant="outline" />
              <span className="text-2xl font-bold">Sciensaurus</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              className="text-white hover:bg-[#152c52]"
              onClick={handleCloseArticleSummary}
              aria-label="Close article summary"
            >
              <LucideX className="h-5 w-5" />
            </Button>
          </div>
          <div className="container mx-auto px-4 py-6">
            <ArticleSummaryContent 
              articleData={articleData}
              relatedResearch={{
                ...relatedResearch,
                isPreview: true
              }}
              url={articleUrl}
              retryRelatedResearch={retryRelatedResearch}
              isPreview={true}
              onBack={handleCloseArticleSummary}
            />
            <div className="mt-8 text-center">
              <Button onClick={handleCloseArticleSummary} variant="outline" className="border-[#1e3a6d] text-[#1e3a6d] hover:bg-[#1e3a6d] hover:text-white">
                Return to Home
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-[#1e3a6d] text-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <SciensaurusLogo className="h-8 w-8" variant="outline" />
            <span className="text-2xl font-bold">Sciensaurus</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="hover:text-blue-200 transition">
              Home
            </Link>
            <Link href="#features" className="hover:text-blue-200 transition">
              Features
            </Link>
            <Link href="#use-cases" className="hover:text-blue-200 transition">
              Use Cases
            </Link>
            <Link href="#enterprise" className="hover:text-blue-200 transition">
              Enterprise
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button
                variant="outline"
                className="text-[#1e3a6d] border-white bg-white hover:bg-white/90 hover:text-[#1e3a6d]"
              >
                Login
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-blue-500 text-white hover:bg-blue-600">Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-[#1e3a6d] text-white py-16 pb-8 md:py-20 md:pb-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">Your AI-Powered Research Companion</h1>
          <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto">Scientific research summarized and demystified.</p>

          {/* URL Input Box */}
          <div className="max-w-2xl mx-auto mb-10 relative landing-page-search">
            <div className="bg-white rounded-md overflow-hidden">
              <ArticleAnalyzer 
                previewMode={true} 
                transparent={true}
                onAnalysisComplete={handleAnalysisComplete}
                resetUrlInputRef={resetUrlInputRef}
              />
            </div>
          </div>

          {/* Demo Button */}
          <div className="mt-4 mb-0">
            <Link href="/demo">
              <Button 
                className="bg-white text-[#1e3a6d] hover:bg-gray-100 px-8 py-6 text-lg font-medium rounded-md"
              >
                See Demo
                <LucideArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Pre-Analyzed Articles Section */}
      <PreAnalyzedArticles adminEmail="kelsey.s.oneill@gmail.com" />

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-[#1e3a6d]">
            Powerful Features for Research Efficiency
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<LucideList className="h-10 w-10 text-blue-600" />}
              title="AI-Powered Summarization"
              description="Clear summaries with concise bullet points and emojis to highlight key findings."
            />
            <FeatureCard
              icon={<LucideSearch className="h-10 w-10 text-blue-600" />}
              title="Important Keywords"
              description="Automatically extract and highlight the most important terms and concepts."
            />
            <FeatureCard
              icon={<LucideFileText className="h-10 w-10 text-blue-600" />}
              title="Similar Article Analysis"
              description="Discover related research that supports or contradicts the main article's findings."
            />
            <FeatureCard
              icon={<LucideUsers className="h-10 w-10 text-blue-600" />}
              title="Cohort Visualization"
              description="Visual breakdown of people or subjects studied in the research."
            />
            <FeatureCard
              icon={<LucideCalendarClock className="h-10 w-10 text-blue-600" />}
              title="Research Timeline"
              description="Track existing research on a subject over time to see the evolution of findings."
            />
            <FeatureCard
              icon={<LucideBookOpen className="h-10 w-10 text-blue-600" />}
              title="Personal Collections"
              description="Save articles to custom collections for future reference and organization."
            />
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-[#1e3a6d]">Engineered to Empower</h2>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <UseCaseCard
              title="Healthcare Professionals"
              description="Doctors and medical practitioners stay up-to-date with the latest research to provide better patient care and treatment options."
              image="/landing_healthprofessionals.jpg"
            />
            <UseCaseCard
              title="Patients"
              description="Understand complex medical articles assigned by your doctor about your health conditions in clear, accessible language."
              image="/landing_patients.jpg"
            />
            <UseCaseCard
              title="Academic Researchers"
              description="University researchers and students can quickly process large volumes of literature and identify relevant studies."
              image="/landing_academicresearchers.jpg"
            />
            <UseCaseCard
              title="Health-Conscious Individuals"
              description="Stay informed about advancements in nutrition, aging, wellness trends, psychology, and other health-related topics."
              image="/landing_healthconscious.jpg"
            />
          </div>

          <div className="text-center">
            <h3 className="text-2xl font-bold mb-6 text-[#1e3a6d]">Research Topics Our Users Love</h3>
            <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
              {[
                "Metabolic Health",
                "Aging",
                "Wellness",
                "Parenting",
                "Psychology",
                "Environmental Factors",
                "Hormone Health",
                "Fertility",
                "Cancer Research",
                "Chronic Pain",
                "Nutrition",
                "Mental Health",
                "Exercise Science",
                "Sleep Research",
                "Immunology",
              ].map((topic, index) => (
                <span key={index} className="bg-blue-100 text-[#1e3a6d] px-4 py-2 rounded-full text-sm font-medium">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Section */}
      <section id="enterprise" className="py-16 md:py-24 bg-[#1e3a6d] text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Enterprise Solutions</h2>
            <p className="text-xl mb-10">
              White label summarization for embedding in your company's apps, such as patient portals, research
              databases, or healthcare systems.
            </p>
            <Button className="bg-white text-[#1e3a6d] hover:bg-gray-100">Contact Sales</Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-blue-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-[#1e3a6d]">
            Ready to Transform Your Research Experience?
          </h2>
          <p className="text-xl mb-10 max-w-3xl mx-auto">
            Join thousands of professionals who save time and gain deeper insights with Sciensaurus.
          </p>
          <Link href="/signup">
            <Button className="bg-[#1e3a6d] text-white hover:bg-[#0f2a4d] px-8 py-6 text-lg">
              Get Started for Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SciensaurusLogo className="h-8 w-8" variant="outline" />
              <span className="text-xl font-bold">Sciensaurus</span>
            </div>
            <div className="text-gray-400">
              <p>© 2025 Sciensaurus. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-lg transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2 text-[#1e3a6d]">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}

function UseCaseCard({ 
  title, 
  description, 
  image 
}: { 
  title: string; 
  description: string; 
  image: string;
}) {
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
      <div className="w-full h-48 overflow-hidden">
        <img 
          src={image} 
          alt={`${title} - Sciensaurus use case illustration`} 
          className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            e.currentTarget.src = "/placeholder.svg";
          }}
        />
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold mb-2 text-[#1e3a6d]">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  )
}

