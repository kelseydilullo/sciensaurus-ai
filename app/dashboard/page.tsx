"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  LucideArrowRight,
  LucideBookmark,
  LucideCalendar,
  LucideChevronRight,
  LucideFileText,
  LucideMoreHorizontal,
  LucideClock,
  LucideCompass,
  CheckCircle2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

// Loading Overlay Component
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

export default function DashboardPage() {
  const [url, setUrl] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const router = useRouter()
  const { user } = useAuth()
  
  // Loading overlay state
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false)
  const [currentStep, setCurrentStep] = useState<string>("retrievingContent")
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [extractedKeywords, setExtractedKeywords] = useState<string[]>([])
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  
  // Get the first name from user metadata or fallback to email parsing
  const firstName = user?.user_metadata?.first_name || 
    (user?.email 
      ? user.email.split('@')[0].split('.')[0].charAt(0).toUpperCase() + user.email.split('@')[0].split('.')[0].slice(1) 
      : "there")

  const updateLoadingStep = (step: string, isComplete: boolean = false) => {
    if (isComplete) {
      setCompletedSteps(prev => [...prev, step]);
      // Move to the next step
      const steps = ["retrievingContent", "generatingSummary", "extractingKeywords", "searchingSimilarArticles", "assessingResearch"];
      const currentIndex = steps.indexOf(step);
      if (currentIndex < steps.length - 1) {
        setCurrentStep(steps[currentIndex + 1]);
      }
    } else {
      setCurrentStep(step);
    }
  };

  const handleAnalyzeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    setIsAnalyzing(true)
    setShowLoadingOverlay(true)
    setCurrentStep("retrievingContent")
    setCompletedSteps([])
    setExtractedKeywords([])
    setAnalysisError(null)
    
    try {
      // Store the URL in session storage so we can access it on the article-summary page
      sessionStorage.setItem('articleUrl', url)
      
      // Call the API to start the analysis process
      const response = await fetch('/api/summarize-article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start analysis: ${response.statusText}`);
      }
      
      // Mark content retrieval as complete
      updateLoadingStep("retrievingContent", true);
      
      // Start summary generation
      updateLoadingStep("generatingSummary");
      
      // Content type check for streaming or JSON response
      const contentType = response.headers.get('content-type');
      
      if (contentType && (contentType.includes('text/event-stream') || contentType.includes('text/plain'))) {
        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (!reader) {
          throw new Error('Failed to read response stream');
        }
        
        let accumulatedText = '';
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;
          
          // Try to parse keywords if available
          try {
            // Simple regex to extract keywords from the response
            const keywordsMatch = accumulatedText.match(/keywords:\s*\[(.*?)\]/i);
            if (keywordsMatch && keywordsMatch[1]) {
              const keywordsStr = keywordsMatch[1];
              const keywords = keywordsStr.split(',').map(k => k.trim().replace(/["']/g, ''));
              
              if (keywords.length > 0) {
                setExtractedKeywords(keywords);
                updateLoadingStep("generatingSummary", true);
                updateLoadingStep("extractingKeywords", true);
                updateLoadingStep("searchingSimilarArticles");
                
                // Call API to fetch related research
                await fetchRelatedResearch(keywords);
                
                // Set flag to indicate article is preprocessed
                sessionStorage.setItem('articlePreprocessed', 'true');
                
                // All steps complete, redirect to article summary page
                router.push(`/dashboard/article-summary?url=${encodeURIComponent(url)}`);
                return;
              }
            }
          } catch (error) {
            console.error('Error parsing keywords:', error);
          }
        }
        
        // If we reach here, we've completed reading the stream
        updateLoadingStep("generatingSummary", true);
        updateLoadingStep("extractingKeywords", true);
        updateLoadingStep("searchingSimilarArticles", true);
        updateLoadingStep("assessingResearch", true);
        
        // Set flag to indicate article is preprocessed
        sessionStorage.setItem('articlePreprocessed', 'true');
        
        // Redirect to article summary page
        router.push(`/dashboard/article-summary?url=${encodeURIComponent(url)}`);
      } else {
        // Handle JSON response
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        // Mark summary generation as complete
        updateLoadingStep("generatingSummary", true);
        
        // If we have keywords, use them
        if (data.keywords && data.keywords.length > 0) {
          setExtractedKeywords(data.keywords);
          updateLoadingStep("extractingKeywords", true);
          
          // Fetch related research
          updateLoadingStep("searchingSimilarArticles");
          await fetchRelatedResearch(data.keywords);
        } else {
          // Mark remaining steps as complete
          updateLoadingStep("extractingKeywords", true);
          updateLoadingStep("searchingSimilarArticles", true);
          updateLoadingStep("assessingResearch", true);
        }
        
        // Try to cache the result for the article summary page
        try {
          sessionStorage.setItem('articleResult', JSON.stringify(data));
        } catch (error) {
          console.error('Error caching result:', error);
        }
        
        // Set flag to indicate article is preprocessed
        sessionStorage.setItem('articlePreprocessed', 'true');
        
        // Redirect to article summary page
        router.push(`/dashboard/article-summary?url=${encodeURIComponent(url)}`);
      }
    } catch (error: unknown) {
      console.error('Error analyzing article:', error);
      setAnalysisError(error instanceof Error ? error.message : 'An unexpected error occurred');
      
      // Mark all steps as complete after a delay
      setTimeout(() => {
        setShowLoadingOverlay(false);
        setIsAnalyzing(false);
      }, 1000);
    }
  }

  // Add a function to fetch related research
  const fetchRelatedResearch = async (keywords: string[]) => {
    try {
      updateLoadingStep("searchingSimilarArticles");
      
      // Call the API to fetch related research
      const response = await fetch('/api/semantic-scholar-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords,
          url,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch related research: ${response.statusText}`);
      }

      // Get the response data
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Store related research results in session storage
      try {
        const relatedResearchData = {
          supporting: data.supporting || [],
          contradictory: data.contradictory || [],
          totalFound: data.totalFound || 0,
          searchKeywords: keywords,
        };
        
        sessionStorage.setItem('relatedResearchResults', JSON.stringify(relatedResearchData));
      } catch (cacheError) {
        console.error('Error caching related research results:', cacheError);
      }

      // Mark research assessment as complete
      updateLoadingStep("searchingSimilarArticles", true);
      updateLoadingStep("assessingResearch", true);
    } catch (error) {
      console.error('Error fetching related research:', error);
      
      // Still mark steps as complete to proceed with redirection
      updateLoadingStep("searchingSimilarArticles", true);
      updateLoadingStep("assessingResearch", true);
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Hi {firstName}. Here's your research overview.</p>
      </div>

      {/* Loading Overlay */}
      <LoadingOverlay 
        isVisible={showLoadingOverlay} 
        currentStep={currentStep} 
        completedSteps={completedSteps} 
        keywords={extractedKeywords}
      />

      {/* Research Activity Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Articles Analyzed */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-gray-700">Articles Analyzed</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex justify-between items-center">
              <h3 className="text-3xl font-bold text-gray-900">24</h3>
              <div className="h-10 w-10 rounded-full flex items-center justify-center bg-blue-100">
                <LucideFileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500 flex items-center">
              <span className="text-green-500 font-medium">+12% </span>
              <span className="ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        {/* Research Interests */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-gray-700">Research Interests</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex justify-between items-center">
              <h3 className="text-3xl font-bold text-gray-900">8</h3>
              <div className="h-10 w-10 rounded-full flex items-center justify-center bg-purple-100">
                <LucideCompass className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500 flex items-center">
              <span className="text-green-500 font-medium">+3 </span>
              <span className="ml-1">new interests this month</span>
            </div>
          </CardContent>
        </Card>

        {/* Saved Articles */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-gray-700">Saved Articles</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex justify-between items-center">
              <h3 className="text-3xl font-bold text-gray-900">12</h3>
              <div className="h-10 w-10 rounded-full flex items-center justify-center bg-green-100">
                <LucideBookmark className="h-5 w-5 text-green-600" />
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
      <Card className="mb-8 border border-gray-200 shadow-sm bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold">Analyze New Research</CardTitle>
          <CardDescription>Enter a URL to a scientific article to get AI-powered insights</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAnalyzeSubmit} className="flex w-full space-x-2">
            <Input 
              type="url" 
              placeholder="Paste article URL here..." 
              className="flex-1 border-gray-300 focus:border-[#1e3a6d] focus:ring-[#1e3a6d]"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              disabled={isAnalyzing}
            />
            <Button 
              type="submit" 
              className="bg-[#1e3a6d] hover:bg-[#0f2a4d] text-white px-6"
              disabled={isAnalyzing}
            >
              Analyze <LucideArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
          {analysisError && (
            <p className="mt-2 text-sm text-red-600">{analysisError}</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Research */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Your Recent Articles</h2>
          <Link href="/dashboard/research-interests">
            <Button variant="outline" size="sm" className="text-[#1e3a6d] border-[#1e3a6d] hover:bg-[#1e3a6d]/10">
              View All <LucideChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {recentArticles.slice(0, 3).map((article, index) => (
            <div key={index}>
              <Card className="overflow-hidden hover:shadow-md transition-shadow h-full border border-gray-200">
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
                    <Button variant="ghost" size="sm" className="h-8 text-[#1e3a6d] hover:bg-[#1e3a6d]/10">
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
          <h2 className="text-xl font-bold text-gray-900">Trending Research Topics</h2>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
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
          <h2 className="text-xl font-bold text-gray-900">Suggested For You</h2>
          <Link href="/dashboard/suggestions">
            <Button variant="ghost" size="sm" className="text-[#1e3a6d] hover:bg-[#1e3a6d]/10">
              More Suggestions
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {suggestedArticles.slice(0, 3).map((article, index) => (
            <div key={index}>
              <Card className="overflow-hidden hover:shadow-md transition-shadow h-full border border-gray-200">
                <CardHeader className="p-4 pb-2">
                  <div>
                    <CardTitle className="text-base line-clamp-2">{article.title}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {article.journal} • {article.date}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">{article.summary}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {article.keywords.slice(0, 3).map((keyword, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="bg-blue-50 text-[#1e3a6d] text-xs hover:bg-blue-100"
                      >
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 italic">{article.recommendation}</p>
                </CardContent>
                <CardFooter className="p-4 pt-2 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[#1e3a6d] border-[#1e3a6d] hover:bg-[#1e3a6d]/10"
                    onClick={() => {
                      // This would normally fetch the URL for this article
                      // For now, we'll just redirect to the demo page
                      router.push('/demo')
                    }}
                  >
                    Analyze
                  </Button>
                </CardFooter>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </>
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
    recommendation: "Recommended based on your interests",
  },
  {
    title: "The Role of Gut Microbiota in Regulating Circadian Rhythms",
    journal: "Science",
    date: "Mar 22, 2023",
    summary:
      "Gut microbiome composition influences host circadian clock genes, with implications for metabolism, sleep, and immune function.",
    keywords: ["Gut microbiome", "Circadian rhythm", "Metabolism", "Sleep"],
    recommendation: "Recommended based on your interests",
  },
  {
    title: "Neuroinflammation as a Driver of Cognitive Decline: New Therapeutic Targets",
    journal: "Neuron",
    date: "Feb 15, 2023",
    summary:
      "Anti-inflammatory interventions targeting specific neural pathways show promise in preventing age-related cognitive decline.",
    keywords: ["Neuroinflammation", "Cognitive decline", "Aging"],
    recommendation: "Recommended based on your interests",
  },
]

