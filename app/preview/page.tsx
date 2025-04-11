"use client"

import Link from "next/link"
import { useState, useEffect, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  LucideArrowRight,
  LucideSearch,
  LucideLoader2,
  CheckCircle2,
  LucideChevronLeft,
  LucideLock,
  LucideEye,
} from "lucide-react"
import { SciensaurusLogo } from "@/components/sciensaurus-logo"
import ArticleSummaryContent from "@/components/article-summary-content"
import { useRouter, useSearchParams } from "next/navigation"

// Loading Overlay Component - same as dashboard
const LoadingOverlay = ({ 
  isVisible, 
  currentStep, 
  completedSteps, 
  keywords 
}: { 
  isVisible: boolean; 
  currentStep: string; 
  completedSteps: string[];
  keywords?: string[];
}) => {
  if (!isVisible) return null;

  const steps = [
    "retrievingContent",
    "generatingSummary",
    "extractingKeywords",
    "searchingSimilarArticles",
    "assessingResearch"
  ];

  const stepLabels: Record<string, string> = {
    retrievingContent: "Retrieving article content...",
    generatingSummary: "Generating summary...",
    extractingKeywords: "Extracting relevant keywords...",
    searchingSimilarArticles: "Searching for similar articles...",
    assessingResearch: "Assessing supporting and contradictory research..."
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-xl w-full mx-4 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Analyzing Article</h3>
        <div className="space-y-6">
          {steps.map((step, index) => {
            // Only show steps that are in progress or completed
            const shouldShow = steps.indexOf(currentStep) >= index || completedSteps.includes(step);
            if (!shouldShow) return null;

            const isCompleted = completedSteps.includes(step);
            const isCurrent = currentStep === step;

            return (
              <div key={step} className="flex items-center gap-3">
                {isCompleted ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                ) : isCurrent ? (
                  <div className="h-6 w-6 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin flex-shrink-0"></div>
                ) : (
                  <div className="h-6 w-6 flex-shrink-0"></div>
                )}
                <div className="flex-1">
                  <p className={`${isCompleted ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                    {stepLabels[step]}
                  </p>
                  {step === 'searchingSimilarArticles' && keywords && keywords.length > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      Based on the following keywords: {keywords.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Locked features component
const LockedFeature = ({ title, description }: { title: string, description: string }) => {
  return (
    <div className="relative mt-8">
      <div className="absolute inset-0 backdrop-blur-md bg-white/30 z-10 flex flex-col items-center justify-center rounded-md border border-gray-200">
        <div className="bg-white/80 p-6 rounded-lg shadow-md text-center max-w-md">
          <div className="mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-4">{description}</p>
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <a href="/signup">Sign Up</a>
          </Button>
        </div>
      </div>
      
      {/* Placeholder content that will be blurred */}
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#1e3a6d] text-xl">{title}</CardTitle>
          <CardDescription>This content is locked for preview users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-40 w-full bg-gray-100 animate-pulse rounded-md"></div>
        </CardContent>
      </Card>
    </div>
  );
};

export const dynamic = 'force-dynamic'; // Force dynamic rendering

function PreviewContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const urlParam = searchParams.get('url')
  
  // States for article analysis
  const [url, setUrl] = useState(urlParam || '')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  // Loading overlay state
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false)
  const [currentStep, setCurrentStep] = useState<string>("retrievingContent")
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [extractedKeywords, setExtractedKeywords] = useState<string[]>([])
  
  // Article data state
  const [showArticleSummary, setShowArticleSummary] = useState(false)
  const [articleData, setArticleData] = useState<any>(null)
  const [relatedResearch, setRelatedResearch] = useState<{
    supporting: any[];
    contradictory: any[];
    totalFound: number;
    searchKeywords: string[];
    error?: string;
  }>({
    supporting: [],
    contradictory: [],
    totalFound: 0,
    searchKeywords: []
  })
  
  // Error state
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  
  // Auto-analyze based on URL param
  useEffect(() => {
    if (urlParam && !isAnalyzing && !showArticleSummary) {
      setUrl(urlParam)
      handleAnalyzeSubmit(new Event('submit') as any)
    }
  }, [urlParam])
  
  // Helper function to update loading steps
  const updateLoadingStep = (step: string, isComplete: boolean = false) => {
    setCurrentStep(isComplete ? "" : step);
    
    if (isComplete) {
      setCompletedSteps(prev => {
        if (!prev.includes(step)) {
          return [...prev, step];
        }
        return prev;
      });
    }
  };
  
  // Handle article analysis
  const handleAnalyzeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url || isAnalyzing) return;
    
    // Reset states
    setIsAnalyzing(true);
    setShowLoadingOverlay(true);
    setAnalysisError('');
    setCurrentStep("retrievingContent");
    setCompletedSteps([]);
    setExtractedKeywords([]);
    setArticleData(null);
    setRelatedResearch({
      supporting: [],
      contradictory: [],
      totalFound: 0,
      searchKeywords: []
    });
    
    // Hide article summary if it was showing
    setShowArticleSummary(false);
    
    try {
      // Call the API to summarize the article - same endpoint used by authenticated users
      const response = await fetch('/api/summarize-article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch article: ${response.statusText}`);
      }
      
      // Content retrieved successfully
      updateLoadingStep("retrievingContent", true);
      updateLoadingStep("generatingSummary");
      
      // Check content type to determine how to process the response
      const contentType = response.headers.get('content-type');
      
      // Handle different content types appropriately
      let keywords: string[] = [];
      let articleResult: any = null;
      
      if (contentType && contentType.includes('application/json')) {
        // Handle JSON response
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        // Store the data
        articleResult = data;
        
        // Extract keywords if available
        if (data.keywords && data.keywords.length > 0) {
          keywords = data.keywords;
        }
      } else if (contentType && (contentType.includes('text/plain') || contentType.includes('text/markdown') || contentType.includes('text/event-stream'))) {
        // Handle text/markdown/stream response
        const text = await response.text();
        
        // Store the text response
        articleResult = { rawText: text };
        
        // Try to extract keywords using regex from markdown format
        const keywordsMatch = text.match(/### Keywords:\s*\n([\s\S]*?)(?=###|$)/i);
        if (keywordsMatch && keywordsMatch[1]) {
          keywords = keywordsMatch[1].split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0);
        }
      }
      
      updateLoadingStep("generatingSummary", true);
      
      // Store the article data
      setArticleData(articleResult);
      
      // Set keywords
      if (keywords.length > 0) {
        setExtractedKeywords(keywords);
        
        // For related research in preview mode, we don't actually fetch it
        // but we simulate the loading state for consistency
        updateLoadingStep("extractingKeywords", true);
        updateLoadingStep("searchingSimilarArticles");
        
        // Simulate the search delay
        setTimeout(() => {
          updateLoadingStep("searchingSimilarArticles", true);
          updateLoadingStep("assessingResearch");
          
          // Simulate the assessment delay
          setTimeout(() => {
            updateLoadingStep("assessingResearch", true);
            
            // Show the article with locked features
            setShowArticleSummary(true);
            setIsAnalyzing(false);
            setShowLoadingOverlay(false);
          }, 1500);
        }, 2000);
      } else {
        // If no keywords found, skip related research steps
        setShowArticleSummary(true);
        setIsAnalyzing(false);
        setShowLoadingOverlay(false);
      }
    } catch (error) {
      console.error('Error analyzing article:', error);
      setAnalysisError(error instanceof Error ? error.message : 'Unknown error occurred');
      setIsAnalyzing(false);
      setShowLoadingOverlay(false);
    }
  };
  
  // Handle back button
  const handleBackToSearch = () => {
    setShowArticleSummary(false);
    setArticleData(null);
    setIsAnalyzing(false);
    setShowLoadingOverlay(false);
    setAnalysisError(null);
    router.push('/')
  };
  
  return (
    <div className="min-h-screen bg-white">
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
            <Link href="/#features" className="hover:text-blue-200 transition">
              Features
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

      <main className="container mx-auto px-4 py-8">
        {/* Loading overlay */}
        <LoadingOverlay 
          isVisible={showLoadingOverlay} 
          currentStep={currentStep} 
          completedSteps={completedSteps}
          keywords={extractedKeywords}
        />
        
        {/* Analysis error message */}
        {analysisError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
            <p className="font-medium">Error analyzing article:</p>
            <p>{analysisError}</p>
            <Button 
              variant="outline" 
              className="mt-2" 
              onClick={() => setAnalysisError(null)}
            >
              Dismiss
            </Button>
          </div>
        )}
        
        {/* Article analysis form (when no article is shown) */}
        {!showArticleSummary && !isAnalyzing && (
          <div className="max-w-3xl mx-auto pt-16 pb-24">
            <h1 className="text-3xl md:text-4xl font-bold text-center mb-8 text-[#1e3a6d]">
              Analyze Scientific Articles
            </h1>
            <p className="text-lg text-center mb-10 text-gray-600">
              Our AI summarizes complex scientific research so you can understand it in minutes.
            </p>
            
            <Card className="bg-white shadow-lg border-gray-200">
              <CardHeader>
                <CardTitle className="text-[#1e3a6d]">Paste a scientific article URL</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAnalyzeSubmit} className="flex gap-3">
                  <div className="relative flex-1">
                    <LucideSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      type="url"
                      required
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://pubmed.ncbi.nlm.nih.gov/..."
                      className="pl-10"
                    />
                  </div>
                  <Button type="submit" disabled={isAnalyzing} className="bg-[#1e3a6d] hover:bg-[#152c52]">
                    {isAnalyzing ? (
                      <>
                        <LucideLoader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        Analyze <LucideArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
            
            <div className="mt-12 text-center">
              <h2 className="text-xl font-semibold mb-3 text-[#1e3a6d]">Try some examples:</h2>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/preview?url=https://pubmed.ncbi.nlm.nih.gov/35132400/">
                  <Badge className="px-4 py-2 bg-blue-50 text-[#1e3a6d] hover:bg-blue-100 cursor-pointer">
                    Longevity Study
                  </Badge>
                </Link>
                <Link href="/preview?url=https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7923779/">
                  <Badge className="px-4 py-2 bg-blue-50 text-[#1e3a6d] hover:bg-blue-100 cursor-pointer">
                    Nutrition Research
                  </Badge>
                </Link>
                <Link href="/preview?url=https://pubmed.ncbi.nlm.nih.gov/37337846/">
                  <Badge className="px-4 py-2 bg-blue-50 text-[#1e3a6d] hover:bg-blue-100 cursor-pointer">
                    COVID-19 Study
                  </Badge>
                </Link>
              </div>
            </div>
          </div>
        )}
        
        {/* Article summary content */}
        {showArticleSummary && articleData && (
          <div className="max-w-5xl mx-auto">
            <Button 
              variant="ghost" 
              className="mb-4 text-gray-600" 
              onClick={handleBackToSearch}
            >
              <LucideChevronLeft className="mr-1 h-4 w-4" /> Back to search
            </Button>
            
            {/* Article summary with locked sections */}
            <div className="space-y-8">
              {/* Top section - ArticleSummaryContent wrapper for Key Findings & Keywords */}
              <div className="p-6 bg-white shadow-sm rounded-md">
                <ArticleSummaryContent
                  articleData={articleData}
                  relatedResearch={{
                    supporting: relatedResearch?.supporting || [],
                    contradictory: relatedResearch?.contradictory || [],
                    totalFound: relatedResearch?.totalFound || 0,
                    searchKeywords: relatedResearch?.searchKeywords || [],
                    error: analysisError || undefined,
                  }}
                  url={url || ''}
                  retryRelatedResearch={handleBackToSearch}
                  isPreview={true}
                />
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="mt-auto py-8 bg-gray-100">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© {new Date().getFullYear()} Sciensaurus. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default function PreviewPage() {
  return (
    <Suspense fallback={<div>Loading preview...</div>}>
      <PreviewContent />
    </Suspense>
  );
} 