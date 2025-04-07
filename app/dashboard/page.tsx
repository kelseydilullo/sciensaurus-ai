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
import ArticleSummaryContent from "@/components/article-summary-content"

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

// Define interfaces for our data
interface ArticleSummary {
  id?: string;
  url: string;
  title: string;
  source?: string;
  publish_date?: string;
  summary?: string;
  visual_summary?: Array<{emoji: string; point: string}>;
  keywords?: string[];
  study_metadata?: any;
  related_research?: any;
  created_at?: string;
  updated_at?: string;
  is_bookmarked?: boolean;
  view_count?: number;
}

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
  
  // New state for managing article analysis
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
  
  // State for user's recent articles from Supabase
  const [userArticles, setUserArticles] = useState<ArticleSummary[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [articlesError, setArticlesError] = useState<string | null>(null);
  
  // Get the first name from user metadata or fallback to email parsing
  const firstName = user?.user_metadata?.first_name || 
    (user?.email 
      ? user.email.split('@')[0].split('.')[0].charAt(0).toUpperCase() + user.email.split('@')[0].split('.')[0].slice(1) 
      : "there")

  // Inside the component, add a state for notification
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
  } | null>(null);

  // Fetch user's articles from Supabase when the component mounts or user changes
  useEffect(() => {
    if (user?.id) {
      fetchUserArticles();
    }
  }, [user]);

  // Function to fetch user's articles from Supabase
  const fetchUserArticles = async () => {
    setLoadingArticles(true);
    setArticlesError(null);
    
    try {
      const response = await fetch('/api/get-user-articles');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch articles: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setUserArticles(data.articles || []);
      } else {
        throw new Error(data.error || 'Failed to fetch articles');
      }
    } catch (error) {
      console.error('Error fetching user articles:', error);
      setArticlesError(error instanceof Error ? error.message : 'An error occurred while fetching your articles');
    } finally {
      setLoadingArticles(false);
    }
  };

  // Add this function after fetchUserArticles and before formatDate
  const toggleBookmark = async (articleId: string) => {
    try {
      // Call the API to toggle bookmark status
      const response = await fetch('/api/toggle-bookmark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ articleSummaryId: articleId }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to toggle bookmark: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Update the local state to reflect the change
        setUserArticles(prevArticles => 
          prevArticles.map(article => 
            article.id === articleId 
              ? { ...article, is_bookmarked: data.isBookmarked } 
              : article
          )
        );
      } else {
        throw new Error(data.error || 'Failed to toggle bookmark');
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      // Optionally show an error notification to the user
    }
  };

  // Format a date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)} weeks ago`;
    } else {
      return `${Math.floor(diffDays / 30)} months ago`;
    }
  };

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

  // Handle analyzing a URL
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
      // Show a notification that articles are automatically saved
      setNotification({
        show: true,
        message: "Your article will be automatically saved to your collection after analysis."
      });
      
      // Clear notification after 4 seconds
      setTimeout(() => {
        setNotification(null);
      }, 4000);
      
      // Call the API to analyze the article
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
      
      // Use keywords to find related research
      if (keywords.length > 0) {
        setExtractedKeywords(keywords);
        try {
          // Now fetch related research
          updateLoadingStep("generatingSummary", true);
          updateLoadingStep("extractingKeywords", true);
          updateLoadingStep("searchingSimilarArticles");
          
          const researchResponse = await fetch('/api/semantic-scholar-search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              keywords,
              url,
            }),
          });
  
          if (!researchResponse.ok) {
            const errorText = await researchResponse.text();
            throw new Error(`Failed to fetch related research: ${researchResponse.statusText || errorText}`);
          }
  
          const researchData = await researchResponse.json();
          
          if (researchData.error) {
            throw new Error(researchData.error);
          }
          
          // Store the related research
          setRelatedResearch({
            supporting: researchData.supporting || [],
            contradictory: researchData.contradictory || [],
            totalFound: researchData.totalFound || 0,
            searchKeywords: keywords,
          });
          
          updateLoadingStep("searchingSimilarArticles", true);
          updateLoadingStep("assessingResearch", true);
        } catch (researchError: any) {
          console.error('Error fetching related research:', researchError);
          
          // Store error but continue with article display
          setRelatedResearch(prev => ({
            ...prev,
            error: researchError.message || 'Error fetching related research',
            searchKeywords: keywords,
          }));
          
          // Mark as complete even with error to proceed
          updateLoadingStep("searchingSimilarArticles", true);
          updateLoadingStep("assessingResearch", true);
        }
      }
      
      // Set a short timeout to ensure the loading overlay shows completed state before hiding
      setTimeout(() => {
        setShowLoadingOverlay(false);
        setIsAnalyzing(false);
        setShowArticleSummary(true);
      }, 1000);
      
    } catch (error) {
      console.error('Error analyzing article:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setAnalysisError(errorMessage);
      setShowLoadingOverlay(false);
      setIsAnalyzing(false);
    }
  };
  
  // Function to return to dashboard from article summary
  const handleBackToDashboard = () => {
    setShowArticleSummary(false);
    setArticleData(null);
    setUrl('');
  };

  // Add a function to fetch related research (for retry functionality)
  const fetchRelatedResearch = async (keywords: string[]) => {
    if (!keywords || keywords.length === 0) return;
    
    try {
      updateLoadingStep("searchingSimilarArticles");
      
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
        const errorText = await response.text();
        throw new Error(`Failed to fetch related research: ${response.statusText || errorText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Store the related research
      setRelatedResearch({
        supporting: data.supporting || [],
        contradictory: data.contradictory || [],
        totalFound: data.totalFound || 0,
        searchKeywords: keywords,
      });
      
      updateLoadingStep("searchingSimilarArticles", true);
      updateLoadingStep("assessingResearch", true);
    } catch (error: any) {
      console.error('Error fetching related research:', error);
      
      // Store error but continue with article display
      setRelatedResearch(prev => ({
        ...prev,
        error: error.message || 'Error fetching related research',
        searchKeywords: keywords,
      }));
      
      // Mark as complete even with error to proceed
      updateLoadingStep("searchingSimilarArticles", true);
      updateLoadingStep("assessingResearch", true);
    }
  };

  return (
    <>
      {/* Loading Overlay - keep this visible during analysis */}
      <LoadingOverlay 
        isVisible={showLoadingOverlay} 
        currentStep={currentStep} 
        completedSteps={completedSteps} 
        keywords={extractedKeywords}
      />

      {/* Conditionally render either the dashboard or the article summary */}
      {showArticleSummary && articleData ? (
        <div className="article-summary-content">
          {/* Back button to return to dashboard */}
          <div className="mb-6">
            <Button 
              variant="ghost" 
              className="flex items-center text-gray-600 hover:text-gray-900"
              onClick={handleBackToDashboard}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4 mr-1" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </Button>
          </div>
          
          {/* Article Summary Content - We'll implement the ArticleSummaryContent component next */}
          <ArticleSummaryContent 
            articleData={articleData} 
            relatedResearch={relatedResearch}
            url={url}
            retryRelatedResearch={() => {
              if (extractedKeywords.length > 0) {
                // Implement retry functionality for related research
                fetchRelatedResearch(extractedKeywords);
              }
            }}
          />
        </div>
      ) : (
        /* Standard Dashboard UI */
        <div className="dashboard-content">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Hi {firstName}. Here's your research overview.</p>
          </div>

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

            {loadingArticles ? (
              <div className="text-center py-8">
                <div className="h-6 w-6 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading your articles...</p>
              </div>
            ) : articlesError ? (
              <div className="text-center py-8 text-red-600">
                <p>{articlesError}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={fetchUserArticles}
                >
                  Retry
                </Button>
              </div>
            ) : userArticles.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-600 mb-2">You haven't analyzed any articles yet</p>
                <p className="text-gray-500 text-sm mb-4">Enter a URL above to get started</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                {userArticles.slice(0, 4).map((article: ArticleSummary, index: number) => (
                  <div key={article.id || index}>
                    <Card className="overflow-hidden hover:shadow-md transition-shadow h-full border border-gray-200 bg-white">
                      <CardHeader className="p-4 pb-2 border-b bg-white">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-base line-clamp-2">{article.title}</CardTitle>
                            <CardDescription className="text-xs mt-1">
                              {article.source || 'Unknown Source'} • {article.publish_date ? new Date(article.publish_date).toLocaleDateString() : 'No date'}
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
                              <DropdownMenuItem onClick={() => article.id && toggleBookmark(article.id)}>
                                <LucideBookmark className="mr-2 h-4 w-4" />
                                <span>{article.is_bookmarked ? 'Remove bookmark' : 'Save to collection'}</span>
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
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{article.summary || 'No summary available'}</p>
                        <div className="flex flex-wrap gap-1">
                          {article.keywords && Array.isArray(article.keywords) && article.keywords.slice(0, 3).map((keyword: string, idx: number) => (
                            <Link href={`/dashboard/research-topic/1`} key={idx}>
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-[#1e3a6d] text-xs hover:bg-blue-100 cursor-pointer"
                              >
                                {keyword}
                              </Badge>
                            </Link>
                          ))}
                          {article.keywords && Array.isArray(article.keywords) && article.keywords.length > 3 && (
                            <Badge variant="outline" className="bg-gray-100 text-gray-600 text-xs">
                              +{article.keywords.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex justify-between items-center">
                        <div className="text-xs text-gray-500">
                          <LucideCalendar className="inline h-3 w-3 mr-1" />
                          Analyzed {formatDate(article.created_at)}
                        </div>
                        <Link href={`/article-summary?url=${encodeURIComponent(article.url)}`}>
                          <Button variant="ghost" size="sm" className="h-8 text-[#1e3a6d] hover:bg-[#1e3a6d]/10">
                            View
                          </Button>
                        </Link>
                      </CardFooter>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trending Research Topics */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Trending Research Topics</h2>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex flex-wrap gap-2">
                {trendingTopics.map((topic: { name: string; isHot: boolean }, index: number) => (
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
              {suggestedArticles.map((article: any, index: number) => (
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
                        {article.keywords.slice(0, 3).map((keyword: string, idx: number) => (
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

          {/* Notification */}
          {notification && notification.show && (
            <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-4 mb-4 rounded shadow-sm">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm">{notification.message}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}

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

