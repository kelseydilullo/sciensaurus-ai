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
  LucideTag,
  LucideTrash2,
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

// Helper functions for safe URL handling
const getSourceFromUrl = (url?: string): string => {
  if (!url) return 'Unknown Source';
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'Unknown Source';
  }
};

const getPathEndFromUrl = (url?: string): string => {
  if (!url) return '';
  try {
    const parts = url.split('/');
    return parts[parts.length - 1] || parts[parts.length - 2] || '';
  } catch {
    return '';
  }
};

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
  summarized_title?: string;
  source?: string;
  publish_date?: string;
  summary?: string;
  visual_summary?: Array<{emoji: string; point: string}>;
  visualSummary?: Array<{emoji: string; point: string}>;
  keywords?: string[];
  study_metadata?: any;
  related_research?: any;
  created_at?: string;
  updated_at?: string;
  is_bookmarked?: boolean;
  view_count?: number;
  originalArticleTitle?: string;
  originalTitle?: string;
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
  
  // State for Keyword Stats
  const [researchInterestCount, setResearchInterestCount] = useState<number | null>(null);
  const [topKeyword, setTopKeyword] = useState<string | null>(null);
  const [keywordStatsLoading, setKeywordStatsLoading] = useState(true);
  const [keywordStatsError, setKeywordStatsError] = useState<string | null>(null);
  
  // State for user's dashboard stats from the new API
  const [dashboardStats, setDashboardStats] = useState<{
    user: {
      id: string;
      firstName: string;
      email: string;
    };
    articlesAnalyzed: {
      count: number;
      growthPercentage: number;
      savedCount: number;
    };
    recentArticles: ArticleSummary[];
    lastSavedDaysAgo: number;
    responseTime: number;
  }>({
    user: {
      id: '',
      firstName: 'there',
      email: ''
    },
    articlesAnalyzed: {
      count: 0,
      growthPercentage: 0,
      savedCount: 0
    },
    recentArticles: [],
    lastSavedDaysAgo: 0,
    responseTime: 0
  });

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

  // Replace the separate fetch with a single API call
  const fetchDashboardStats = async () => {
    setLoadingArticles(true);
    setArticlesError(null);
    
    try {
      const response = await fetch('/api/get-dashboard-stats');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard stats: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Update all dashboard stats at once
        setDashboardStats(data.stats);
        setUserArticles(data.stats.recentArticles || []);
        
        // Check for data inconsistency - if we have a count but no recent articles
        if (data.stats.articlesAnalyzed.count > 0 && 
            (!data.stats.recentArticles || data.stats.recentArticles.length === 0)) {
          console.warn('Data inconsistency detected: Non-zero article count but empty recent articles list');
          
          // Try to fix the data
          await runArticleVerification();
        }
      } else {
        throw new Error(data.error || 'Failed to fetch dashboard statistics');
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setArticlesError(error instanceof Error ? error.message : 'An error occurred while fetching your statistics');
    } finally {
      setLoadingArticles(false);
    }
  };

  // Fetch Keyword Stats
  const fetchKeywordStats = async () => {
    setKeywordStatsLoading(true);
    setKeywordStatsError(null);
    try {
      const response = await fetch('/api/get-user-keyword-stats');
      if (!response.ok) {
        throw new Error(`Failed to fetch keyword stats: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.success) {
        setResearchInterestCount(data.stats.researchInterestCount);
        setTopKeyword(data.stats.topKeyword);
      } else {
        throw new Error(data.error || 'Failed to fetch keyword statistics');
      }
    } catch (error) {
      console.error('Error fetching keyword stats:', error);
      setKeywordStatsError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setKeywordStatsLoading(false);
    }
  };

  // Add a function to run article verification
  const runArticleVerification = async () => {
    try {
      console.log('Running article verification');
      const response = await fetch('/api/verify-article-references');
      
      if (!response.ok) {
        console.error('Article verification failed:', response.statusText);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Article verification completed:', data.result);
        
        if (data.result.deleted > 0) {
          // Refresh the dashboard stats after verification
          await fetchDashboardStats();
        }
      }
    } catch (error) {
      console.error('Error during article verification:', error);
    }
  };

  // Replace the fetchUserArticles with fetchDashboardStats in the useEffect
  useEffect(() => {
    if (user?.id) {
      fetchDashboardStats();
      fetchKeywordStats();
    }
  }, [user?.id]);

  // Function to handle viewing an article summary
  const handleViewArticleSummary = async (articleId: string | undefined, articleUrl: string) => {
    if (!articleId) {
      setNotification({
        show: true,
        message: "Unable to view article summary: Missing article ID"
      });
      return;
    }

    try {
      // Show a simple loading spinner instead of the multi-step loading overlay
      setIsAnalyzing(true);
      
      // Fetch the article summary from the database
      const response = await fetch(`/api/get-article-summary?id=${articleId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch article summary: ${response.statusText}`);
      }
      
      // *** Log raw response text BEFORE parsing JSON ***
      const rawText = await response.text();
      console.log("--- Raw Response Text from /api/get-article-summary ---");
      console.log(rawText.substring(0, 1000)); // Log first 1000 chars
      console.log("-------------------------------------------------------");
      
      // Parse the raw text
      const data = JSON.parse(rawText);
      
      if (data.success) {
        // Log the parsed object (as before)
        console.log("--- Received article data in handleViewArticleSummary ---");
        console.log(JSON.stringify(data.article, null, 2));
        console.log("----------------------------------------------------");

        // Log the structure of the article data
        console.log("Article data received:", {
          id: data.article.id,
          title: data.article.title,
          hasVisualSummary: !!data.article.visual_summary,
          visualSummaryType: typeof data.article.visual_summary,
          visualSummaryIsArray: Array.isArray(data.article.visual_summary),
          visualSummaryLength: Array.isArray(data.article.visual_summary) ? data.article.visual_summary.length : 0,
          visualSummaryData: data.article.visual_summary ? JSON.stringify(data.article.visual_summary).substring(0, 100) : 'null',
          hasKeywords: !!data.article.keywords,
          keywordsLength: Array.isArray(data.article.keywords) ? data.article.keywords.length : 0,
          hasRelatedResearch: !!data.article.related_research
        });
        
        // Set article data for display
        setArticleData(data.article);
        
        // Set URL for viewing the original article
        setUrl(articleUrl);
        
        // Extract keywords for related research
        const keywords = data.article.keywords || [];
        if (keywords.length > 0) {
          setExtractedKeywords(keywords);
          // Optionally fetch related research if available
          if (data.article.related_research) {
            setRelatedResearch({
              supporting: data.article.related_research.supporting || [],
              contradictory: data.article.related_research.contradictory || [],
              totalFound: (data.article.related_research.supporting || []).length + 
                         (data.article.related_research.contradictory || []).length,
              searchKeywords: keywords
            });
          }
        }
        
        // Show the article summary
        setShowArticleSummary(true);
        
      } else {
        throw new Error(data.error || 'Failed to fetch article summary');
      }
    } catch (error) {
      console.error('Error fetching article summary:', error);
      setAnalysisError(error instanceof Error ? error.message : 'An error occurred while fetching the article summary');
    } finally {
      // Hide loading spinner
      setIsAnalyzing(false);
    }
  };

  // Function to toggle bookmarks
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

  // Function to handle going back to dashboard
  const handleBackToDashboard = () => {
    setShowArticleSummary(false);
    setArticleData(null);
    setExtractedKeywords([]);
    setRelatedResearch({
      supporting: [],
      contradictory: [],
      totalFound: 0,
      searchKeywords: []
    });
    setIsAnalyzing(false);
    setShowLoadingOverlay(false);
    setUrl(''); // Reset the URL input field
    
    // Refresh dashboard stats
    fetchDashboardStats();
  };

  // Function to format date
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
    setShowLoadingOverlay(true); // Show the detailed loading overlay for new analyses
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
        // Attempt to get more information from the error response
        let errorMessage = `Failed to fetch article: ${response.statusText}`;
        try {
          const errorResponse = await response.text();
          // Check if error response contains valid JSON
          try {
            const errorJson = JSON.parse(errorResponse);
            if (errorJson.error) {
              errorMessage = errorJson.error;
            }
          } catch (e) {
            // If not JSON, use the text response if it's not empty
            if (errorResponse && errorResponse.trim()) {
              errorMessage = errorResponse;
            }
          }
        } catch (e) {
          // If we can't get the response text, stick with the status message
          console.error('Could not parse error response:', e);
        }

        // Special handling for specific HTTP status codes
        if (response.status === 502) {
          errorMessage = "Bad Gateway: The article processing server is unavailable or the URL may be inaccessible. Please try again later or try a different article.";
        } else if (response.status === 403) {
          errorMessage = "Access Forbidden: This article may be behind a paywall or requires special access.";
        } else if (response.status === 404) {
          errorMessage = "Not Found: The article URL could not be found. Please check the URL and try again.";
        } else if (response.status === 429) {
          errorMessage = "Too Many Requests: Request rate limit exceeded. Please try again in a few minutes.";
        }

        throw new Error(errorMessage);
      }
      
      // Content retrieved successfully
      updateLoadingStep("retrievingContent", true);
      updateLoadingStep("generatingSummary");
      
      // Check content type to determine how to process the response
      const contentType = response.headers.get('content-type');
      
      console.log('[Dashboard] Received Content-Type from /api/summarize-article:', contentType);
      
      // --- Strict JSON Handling --- 
      let keywords: string[] = []; // Keep local variable
      let articleResult: any = null; // Keep local variable
      
      if (contentType && contentType.includes('application/json')) {
        // Handle JSON response
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        // Store the data in local variable first
        articleResult = data; 
        
        // Extract keywords if available (handle potential empty array)
        if (data.keywords && Array.isArray(data.keywords)) {
            keywords = data.keywords; // Assign to local variable
            console.log(`[Dashboard] Extracted keywords from JSON: Count=${keywords.length}`);
        } else {
            console.log('[Dashboard] Keywords missing or not an array in JSON response.');
        }
      } else {
        // If not JSON, throw an error
        const responseText = await response.text().catch(() => '(Could not read response body)'); // Try to get text for error message
        console.error('[Dashboard] Unexpected Content-Type from /api/summarize-article:', contentType, responseText);
        throw new Error(`Unexpected response format from summary API. Expected JSON but received ${contentType || 'unknown'}.`);
      }
       
      updateLoadingStep("generatingSummary", true);
      
      // --- Set State AFTER processing --- 
      setArticleData(articleResult); // Set main article data state
      setExtractedKeywords(keywords); // Set extracted keywords state (even if empty)
      
      // --- DEBUG LOG: Check keywords before the conditional fetch --- 
      // Note: We check the local 'keywords' variable here, as state updates might be async
      console.log('[Dashboard] Checking keywords before fetch:', { 
        keywordsVariable: keywords, 
        articleResultKeywords: articleResult?.keywords, 
        articleResultKeys: articleResult ? Object.keys(articleResult) : null
      });
      
      // --- Use local 'keywords' variable for the check --- 
      if (keywords.length > 0) {
        // We already set extractedKeywords state above, no need to set again
        // setExtractedKeywords(keywords); 
        try {
          // Extract title and findings for better classification context
          const mainArticleTitle = articleResult?.originalArticleTitle || articleResult?.title || '';
          const mainArticleFindings = (articleResult?.visualSummary || articleResult?.visual_summary || [])
            .map((item: { point: string }) => item.point)
            .filter((point: string) => point);

          // Now fetch related research
          updateLoadingStep("generatingSummary", true); // Move these? They were called earlier
          updateLoadingStep("extractingKeywords", true);
          updateLoadingStep("searchingSimilarArticles");
          
          // --- DEBUG LOG: Confirm fetch attempt --- 
          console.log('[Dashboard] Attempting to fetch related research...');
          
          const researchResponse = await fetch('/api/semantic-scholar-search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              keywords, // Pass the local keywords variable
              url,
              mainArticleTitle,
              mainArticleFindings,
            }),
          });
  
          if (!researchResponse.ok) {
            let errorMessage = `Failed to fetch related research: ${researchResponse.statusText}`;
            
            try {
              const errorText = await researchResponse.text();
              
              // Try to parse as JSON first
              try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.error) {
                  errorMessage = `Failed to fetch related research: ${errorJson.error}`;
                }
              } catch (jsonError) {
                // If not JSON, use text if it's meaningful
                if (errorText && errorText.trim() && errorText.length < 200) {
                  errorMessage = `Failed to fetch related research: ${errorText}`;
                }
              }
            } catch (textError) {
              console.error('Could not extract error text from response:', textError);
            }
            
            // Special handling for specific status codes
            if (researchResponse.status === 500) {
              errorMessage = "Failed to fetch related research: Internal server error. This might be due to a temporary issue with our research database. The article summary is still available.";
              
              // For server errors, don't throw - just store the error and continue
              console.warn(errorMessage);
              
              // Store error but continue with article display
              setRelatedResearch({
                supporting: [],
                contradictory: [],
                totalFound: 0,
                error: errorMessage,
                searchKeywords: keywords, // Use local keywords for error state
              });
              
              // Mark these steps as complete to proceed with the UI
              updateLoadingStep("searchingSimilarArticles", true);
              updateLoadingStep("assessingResearch", true);
              return; // Skip the throw and continue processing
            }
            
            throw new Error(errorMessage);
          }
  
          const researchData = await researchResponse.json();
          
          // --- DEBUG LOG: Check API response data --- 
          console.log('[Dashboard] Related Research API Response:', researchData);

          if (researchData.error) {
            throw new Error(researchData.error);
          }
          
          // Store the related research state
          setRelatedResearch({
            supporting: researchData.supporting || [],
            contradictory: researchData.contradictory || [],
            totalFound: researchData.totalFound || 0,
            searchKeywords: keywords, // Use local keywords for state
          });
          
          updateLoadingStep("searchingSimilarArticles", true);
          updateLoadingStep("assessingResearch", true);
        } catch (researchError: any) {
          console.error('Error fetching related research:', researchError);
          
          // Store error but continue with article display
          setRelatedResearch(prev => ({
            ...prev,
            error: researchError.message || 'Error fetching related research',
            searchKeywords: keywords, // Use local keywords for error state
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
      // --- DEBUG LOG: Check if execution jumps to catch block ---
      console.log('[Dashboard] Caught error in handleAnalyzeSubmit:', error instanceof Error ? error.message : error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setAnalysisError(errorMessage);
      setShowLoadingOverlay(false);
      setIsAnalyzing(false);
    }
  };

  // Effect to clear URL input on initial mount and back navigation
  useEffect(() => {
    // Clear the URL input when the dashboard mounts
    setUrl('');
  }, []); // Empty dependency array ensures this runs only once on mount

  // Function to remove an article from history
  const handleRemoveArticle = async (articleSummaryId: string) => {
    try {
      const response = await fetch('/api/remove-user-article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ articleSummaryId }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove article');
      }

      const data = await response.json();

      if (data.success) {
        // Remove the article from the local state
        setUserArticles(prevArticles => prevArticles.filter(article => article.id !== articleSummaryId));
        
        // Decrement the Articles Analyzed count in the UI state
        setDashboardStats(prevStats => ({
          ...prevStats,
          articlesAnalyzed: {
            ...prevStats.articlesAnalyzed,
            // Ensure count doesn't go below 0
            count: Math.max(0, (prevStats.articlesAnalyzed?.count ?? 0) - 1) 
          }
        }));
        
        // Optionally show a success notification
        setNotification({ show: true, message: 'Article removed from history.' });
        setTimeout(() => setNotification(null), 3000); 
      } else {
        throw new Error(data.error || 'Failed to remove article');
      }
    } catch (error) {
      console.error('Error removing article:', error);
      setNotification({ show: true, message: `Error: ${error instanceof Error ? error.message : 'Could not remove article'}` });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  return (
    <>
      {/* Loading Overlay for analyzing new articles */}
      {showLoadingOverlay && (
        <LoadingOverlay 
          isVisible={showLoadingOverlay} 
          currentStep={currentStep} 
          completedSteps={completedSteps} 
          keywords={extractedKeywords}
        />
      )}
      
      {/* Simple loading spinner for viewing existing articles */}
      {isAnalyzing && !showLoadingOverlay && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 flex flex-col items-center">
            <div className="h-12 w-12 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-700 font-medium">Loading article summary...</p>
          </div>
        </div>
      )}

      {/* Centralized Dashboard Loading Spinner */}
      {loadingArticles && !showArticleSummary && !showLoadingOverlay && !isAnalyzing && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
          <div className="h-16 w-16 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin mb-6"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Dashboard...</h2>
        </div>
      )}

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
          
          {/* Article Summary Content */}
          <ArticleSummaryContent 
            articleData={articleData} 
            relatedResearch={relatedResearch}
            url={url}
            retryRelatedResearch={() => {
              if (articleData && articleData.id) {
                handleViewArticleSummary(articleData.id, url);
              }
            }}
          />
        </div>
      ) : (
        // Main Dashboard View
        // Add w-full to ensure it takes available width
        <div className="w-full flex-1 space-y-4 px-2 pt-6 pb-4 md:px-8 md:pt-8 md:pb-8">
          {/* Header with title and analyze form */}
          <div className="flex flex-col space-y-2 mb-6">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h2>
            <p className="text-gray-600">Hi {dashboardStats.user.firstName || firstName}. Here's your research overview.</p>
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
                  <h3 className="text-3xl font-bold text-gray-900">{dashboardStats.articlesAnalyzed.count}</h3>
                  <div className="h-10 w-10 rounded-full flex items-center justify-center bg-blue-100">
                    <LucideFileText className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 flex items-center">
                  <span className="text-green-500 font-medium">+{dashboardStats.articlesAnalyzed.growthPercentage}% </span>
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
                  <h3 className="text-3xl font-bold text-gray-900">
                    {keywordStatsLoading ? '-' : (keywordStatsError ? '!' : researchInterestCount ?? 0)}
                  </h3>
                  <div className="h-10 w-10 rounded-full flex items-center justify-center bg-purple-100">
                    <LucideCompass className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 flex items-center">
                  {/* Placeholder text, update if needed */}
                  {keywordStatsLoading ? 'Loading...' : keywordStatsError ? keywordStatsError : 'Distinct topics analyzed ≥ 2 times'}
                </div>
              </CardContent>
            </Card>

            {/* Top Keyword Widget - Replaces Saved Articles placeholder */}
            <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <p className="text-sm font-medium text-gray-700">Top Keyword</p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-gray-900 break-words">
                    {keywordStatsLoading ? '-' : (keywordStatsError ? 'Error' : topKeyword || 'N/A')}
                  </h3>
                  {/* Use LucideTag or another relevant icon */}
                  <div className="h-10 w-10 rounded-full flex items-center justify-center bg-orange-100">
                    <LucideTag className="h-5 w-5 text-orange-600" /> { /* Added LucideTag */}
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 flex items-center">
                  {keywordStatsLoading ? 'Loading...' : keywordStatsError ? 'Could not load' : 'Most frequent keyword in your analyses'}
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

            {articlesError ? (
              <div className="text-center py-8 text-red-600">
                <p>{articlesError}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={fetchDashboardStats}
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
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2">
                {userArticles.slice(0, 8).map((article: ArticleSummary, index: number) => (
                  <div key={article.id || index}>
                    <Card className="overflow-hidden hover:shadow-md transition-shadow h-full border border-gray-200 bg-white">
                      <CardHeader className="p-4 pb-2 border-b bg-white">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-base line-clamp-2">
                              {article.originalArticleTitle || article.originalTitle || article.summarized_title || article.title || getPathEndFromUrl(article.url) || "Untitled Article"}
                            </CardTitle>
                            <CardDescription className="text-xs mt-1">
                              {article.source || getSourceFromUrl(article.url)} • {article.publish_date ? new Date(article.publish_date).toLocaleDateString() : 'No date'}
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
                            <DropdownMenuContent align="end" className="bg-white" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => handleViewArticleSummary(article.id, article.url)} className="cursor-pointer">
                                <LucideFileText className="mr-2 h-4 w-4" />
                                <span>View Full Analysis</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => article.id && handleRemoveArticle(article.id)}
                                className="text-red-600 cursor-pointer"
                                disabled={!article.id}
                              >
                                <LucideTrash2 className="mr-2 h-4 w-4" /> 
                                <span>Remove From History</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-3">
                        {/* Display first two key findings from visual_summary if available */}
                        {(() => {
                          const visualSummaryData = article.visualSummary || article.visual_summary;
                          if (visualSummaryData && Array.isArray(visualSummaryData) && visualSummaryData.length > 0) {
                            return (
                              <div className="space-y-2 mb-3">
                                {visualSummaryData.slice(0, 2).map((item: { emoji: string; point: string }, idx: number) => (
                                  <div key={idx} className="flex items-start gap-2">
                                    <div className="text-lg">{item.emoji}</div>
                                    <p className="text-sm text-gray-700 line-clamp-2">{item.point}</p>
                                  </div>
                                ))}
                              </div>
                            );
                          } else {
                            return (
                              <p className="text-sm text-gray-600 line-clamp-2 mb-3">{article.summary || 'No summary available'}</p>
                            );
                          }
                        })()}
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
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-[#1e3a6d] hover:bg-[#1e3a6d]/10"
                          onClick={() => handleViewArticleSummary(article.id, article.url)}
                        >
                          View
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hide Trending Research Topics section */}
          {false && (
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
          )}

          {/* Hide Suggested For You section */}
          {false && (
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
          )}

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

