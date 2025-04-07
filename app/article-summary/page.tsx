'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookmarkIcon, Share2Icon, DownloadIcon, PrinterIcon, ExternalLinkIcon, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Sector,
  LabelList
} from 'recharts';
import { Input } from "@/components/ui/input";

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
        <p className="text-center text-gray-500 text-sm mt-6">
          Please wait while we process your article. This may take up to a minute.
        </p>
      </div>
    </div>
  );
};

export default function ArticleSummaryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [url, setUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [streamedText, setStreamedText] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [articleTitle, setArticleTitle] = useState<string>('');
  const [articleSource, setArticleSource] = useState<string>('');
  const [publishDate, setPublishDate] = useState("");
  const [activeGenderIndex, setActiveGenderIndex] = useState<number | undefined>(undefined);
  
  // Loading overlay state
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>("retrievingContent");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [extractedKeywords, setExtractedKeywords] = useState<string[]>([]);
  
  // Add state for storing related research results
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
  });
  
  // Helper function to update loading steps
  const updateLoadingStep = useCallback((step: string, isComplete: boolean = false) => {
    if (isComplete) {
      // Check if the step is already in completedSteps to avoid unnecessary re-renders
      setCompletedSteps(prev => {
        if (prev.includes(step)) {
          return prev;
        }
        return [...prev, step];
      });
      
      // Move to the next step
      const steps = ["retrievingContent", "generatingSummary", "extractingKeywords", "searchingSimilarArticles", "assessingResearch"];
      const currentIndex = steps.indexOf(step);
      if (currentIndex < steps.length - 1) {
        setCurrentStep(steps[currentIndex + 1]);
      } else {
        // All steps are complete, hide overlay
        setTimeout(() => {
          setShowLoadingOverlay(false);
        }, 1000); // Keep it visible briefly so user can see completion
      }
    } else {
      // Only update current step if it's different
      setCurrentStep(prevStep => {
        if (prevStep === step) {
          return prevStep;
        }
        return step;
      });
    }
  }, []);

  useEffect(() => {
    // Get stored url from sessionStorage
    const storedUrl = typeof window !== 'undefined' ? sessionStorage.getItem('articleUrl') : null;
    
    // Check if this is a redirect from dashboard with preloaded data
    const isPreprocessed = typeof window !== 'undefined' && sessionStorage.getItem('articlePreprocessed') === 'true';
    
    // Extract URL from query parameters or stored URL
    const articleUrl = url || searchParams.get('url') || storedUrl || '';
    setUrl(articleUrl);
    
    // If we have a valid URL but no result yet
    if (articleUrl && !result && !streamedText) {
      console.log("Processing article URL:", articleUrl, "isPreprocessed:", isPreprocessed);
      
      // First, try to fetch from our database if not preprocessed
      if (!isPreprocessed) {
        // Only check the database if this isn't preprocessed data from the dashboard
        fetch(`/api/get-article-summary?url=${encodeURIComponent(articleUrl)}`)
          .then(response => {
            if (response.ok) {
              return response.json();
            }
            throw new Error('Article not found in database');
          })
          .then(data => {
            if (data.found && data.articleSummary) {
              console.log("Found article in database, using stored data");
              
              // Set the stored article data
              setResult(data.articleSummary);
              
              // Set article title if available
              if (data.articleSummary.title) {
                setArticleTitle(data.articleSummary.title);
              }
              
              // Set article source if available
              if (data.articleSummary.source) {
                setArticleSource(data.articleSummary.source);
              }
              
              // Set keywords if available
              if (data.articleSummary.keywords && data.articleSummary.keywords.length > 0) {
                setExtractedKeywords(data.articleSummary.keywords);
              }
              
              // Set related research if available
              if (data.articleSummary.related_research) {
                setRelatedResearch({
                  supporting: data.articleSummary.related_research.supporting || [],
                  contradictory: data.articleSummary.related_research.contradictory || [],
                  totalFound: data.articleSummary.related_research.totalFound || 0,
                  searchKeywords: data.articleSummary.related_research.searchKeywords || []
                });
              }
              
              // Set loading to false
              setIsLoading(false);
            } else {
              throw new Error('Article not found in database');
            }
          })
          .catch(error => {
            console.log("Article not found in database, continuing with normal processing:", error.message);
            
            // Continue with normal processing - show loading overlay
            if (!isLoading) {
              console.log("No cached data available, fetching with overlay");
              fetchSummaryWithOverlay(articleUrl);
            }
          });
      } else {
        // Handle preprocessed data 
        console.log("Article was preprocessed on dashboard, checking for cached data");
        // Clear the preprocessed flag immediately
        sessionStorage.removeItem('articlePreprocessed');
        
        let foundCachedData = false;
        
        // Try to get cached related research
        const cachedRelatedResearch = sessionStorage.getItem('relatedResearchResults');
        if (cachedRelatedResearch) {
          try {
            const parsedResearch = JSON.parse(cachedRelatedResearch);
            setRelatedResearch(parsedResearch);
            console.log("Using cached related research:", parsedResearch);
            sessionStorage.removeItem('relatedResearchResults');
            foundCachedData = true;
          } catch (e) {
            console.error('Error parsing cached related research:', e);
          }
        }
        
        // Try to get cached article result
        const cachedResult = sessionStorage.getItem('articleResult');
        if (cachedResult) {
          try {
            const parsedResult = JSON.parse(cachedResult);
            console.log("Using cached article result:", parsedResult);
            
            // If the cached result contains rawText, parse it
            if (parsedResult.rawText) {
              try {
                const parsedTextResult = parseTextResponse(parsedResult.rawText);
                if (parsedTextResult) {
                  setResult(parsedTextResult);
                  setStreamedText(parsedResult.rawText);
                  
                  // Set article title if available
                  if (parsedTextResult.title) {
                    setArticleTitle(parsedTextResult.title);
                  } else if (parsedTextResult.originalTitle) {
                    setArticleTitle(parsedTextResult.originalTitle);
                  }
                  
                  // Set extracted keywords if available
                  if (parsedTextResult.keywords && parsedTextResult.keywords.length > 0) {
                    setExtractedKeywords(parsedTextResult.keywords);
                  }
                }
              } catch (parseError) {
                console.error('Error parsing cached raw text:', parseError);
                setStreamedText(parsedResult.rawText);
              }
            } else {
              // Use the JSON result directly
              setResult(parsedResult);
              
              // Set article title if available
              if (parsedResult.title) {
                setArticleTitle(parsedResult.title);
              } else if (parsedResult.originalTitle) {
                setArticleTitle(parsedResult.originalTitle);
              }
              
              // Set extracted keywords if available
              if (parsedResult.keywords && parsedResult.keywords.length > 0) {
                setExtractedKeywords(parsedResult.keywords);
              }
            }
            
            sessionStorage.removeItem('articleResult');
            setIsLoading(false);
            foundCachedData = true;
          } catch (e) {
            console.error('Error parsing cached result:', e);
          }
        }
        
        // If we couldn't find or use cached data, fetch silently
        if (!foundCachedData) {
          console.log("No usable cached data found, fetching quietly");
          fetchSummaryQuietly(articleUrl);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, url, result, streamedText, isLoading]);

  // Fetch the summary without showing a loading overlay (for preprocessed articles)
  const fetchSummaryQuietly = async (articleUrl: string) => {
    setIsLoading(true);
    
    try {
      // Extract domain name for source
      try {
        const url = new URL(articleUrl);
        const domain = url.hostname.replace('www.', '');
        
        // Common domain to source name mappings
        const domainSourceMap: Record<string, string> = {
          'nature.com': 'Nature Medicine',
          'science.org': 'Science',
          'cell.com': 'Cell',
          'nejm.org': 'New England Journal of Medicine',
          'thelancet.com': 'The Lancet',
          'pubmed.ncbi.nlm.nih.gov': 'PubMed',
          'pmc.ncbi.nlm.nih.gov': 'PubMed Central',
          'sciencedirect.com': 'ScienceDirect',
          'springer.com': 'Springer',
          'wiley.com': 'Wiley',
          'nih.gov': 'NIH',
          'cdc.gov': 'CDC',
          'biorxiv.org': 'bioRxiv',
          'medrxiv.org': 'medRxiv',
          'jamanetwork.com': 'JAMA Network'
        };
        
        // Check if domain matches known sources
        const matchedSource = Object.entries(domainSourceMap).find(([key]) => 
          domain.includes(key)
        );
        
        if (matchedSource) {
          setArticleSource(matchedSource[1]);
        } else {
          // Use capitalized domain name as fallback
          const sourceName = domain.split('.')[0];
          setArticleSource(sourceName.charAt(0).toUpperCase() + sourceName.slice(1));
        }
      } catch (e) {
        // Ignore URL parsing errors
        setArticleSource("");
      }

      // Call the API to fetch summary
      console.log("Fetching article summary quietly for:", articleUrl);
      const response = await fetch('/api/summarize-article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: articleUrl }),
      });
        
      if (!response.ok) {
        throw new Error(`Failed to fetch article: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      
      // Handle different content types appropriately
      if (contentType && contentType.includes('application/json')) {
        // Handle JSON response
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        setResult(data);
        setArticleTitle(data.title || articleTitle);
        
        // If we have keywords, fetch related research silently
        if (data.keywords && data.keywords.length > 0) {
          setExtractedKeywords(data.keywords);
          fetchRelatedResearchQuietly(data.keywords);
        }
      } else if (contentType && (contentType.includes('text/event-stream') || contentType.includes('text/plain') || contentType.includes('text/markdown'))) {
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
          setStreamedText(accumulatedText);
          
          // Try to parse the accumulated text as markdown
          try {
            const parsedResult = parseTextResponse(accumulatedText);
            if (parsedResult) {
              setResult(parsedResult);
              
              // If we have keywords, fetch related research silently
              if (parsedResult.keywords && parsedResult.keywords.length > 0) {
                setExtractedKeywords(parsedResult.keywords);
                fetchRelatedResearchQuietly(parsedResult.keywords);
              }
            }
          } catch (parseError: any) {
            setParseError(`Unable to parse response: ${parseError.message}. The API returned markdown text instead of JSON format, but we'll still show you the content.`);
          }
        }
      } else {
        // Fallback - try to parse as JSON first, then as text if that fails
        try {
          const data = await response.json();
          setResult(data);
          
          if (data.keywords && data.keywords.length > 0) {
            setExtractedKeywords(data.keywords);
            fetchRelatedResearchQuietly(data.keywords);
          }
        } catch (jsonError) {
          // If JSON parsing fails, try to handle as text
          const text = await response.text();
          setStreamedText(text);
          
          try {
            const parsedResult = parseTextResponse(text);
            if (parsedResult) {
              setResult(parsedResult);
              
              if (parsedResult.keywords && parsedResult.keywords.length > 0) {
                setExtractedKeywords(parsedResult.keywords);
                fetchRelatedResearchQuietly(parsedResult.keywords);
              }
            }
          } catch (parseError: any) {
            setParseError(`Unable to parse response: ${parseError.message}. The API returned an unexpected format.`);
          }
        }
      }
    } catch (error: unknown) {
      console.error('Error fetching article quietly:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch related research without showing loading steps (for preprocessed articles)
  const fetchRelatedResearchQuietly = async (keywords: string[], maxRetries = 3) => {
    let retryCount = 0;
    let lastError: string | null = null;
    const backoffDelay = (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 8000); // Exponential backoff
    
    while (retryCount <= maxRetries) {
      try {
        // If this is a retry, wait before trying again
        if (retryCount > 0) {
          const delay = backoffDelay(retryCount - 1);
          console.log(`Retry attempt ${retryCount}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Update the state to indicate a retry if applicable
        if (retryCount > 0) {
          setRelatedResearch(prev => ({
            ...prev,
            error: `Reconnecting... (Attempt ${retryCount}/${maxRetries})`,
          }));
        }
        
        const response = await fetch('/api/semantic-scholar-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            keywords,
            url,
            articleTitle
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

        setRelatedResearch({
          supporting: data.supporting || [],
          contradictory: data.contradictory || [],
          totalFound: data.totalFound || 0,
          searchKeywords: keywords,
        });
        
        // If we get here, the request was successful, so break out of the retry loop
        return;
      } catch (error) {
        const err = error as Error;
        console.error(`Error fetching related research (attempt ${retryCount + 1}/${maxRetries + 1}):`, err);
        lastError = err.message;
        retryCount++;
        
        // If this was the last retry attempt, save the error state
        if (retryCount > maxRetries) {
          setRelatedResearch(prev => ({
            ...prev,
            error: lastError || 'Failed to fetch related research after multiple attempts',
            searchKeywords: keywords,
          }));
        }
      }
    }
  };

  // Original fetchSummary method with loading overlay (renamed for clarity)
  const fetchSummaryWithOverlay = async (articleUrl: string) => {
    // Prevent multiple loading states or reprocessing the same URL
    if (isLoading || showLoadingOverlay) {
      return;
    }
    
    setIsLoading(true);
    setResult(null);
    setStreamedText('');
    setError(null);
    setShowLoadingOverlay(true);
    setCurrentStep("retrievingContent");
    setCompletedSteps([]);
    setExtractedKeywords([]);
    
    // Reset related research
    setRelatedResearch({
      supporting: [],
      contradictory: [],
      totalFound: 0,
      searchKeywords: []
    });
    
    try {
      // Extract domain name for source
      try {
        const url = new URL(articleUrl);
        const domain = url.hostname.replace('www.', '');
        
        // Common domain to source name mappings
        const domainSourceMap: Record<string, string> = {
          'nature.com': 'Nature Medicine',
          'science.org': 'Science',
          'cell.com': 'Cell',
          'nejm.org': 'New England Journal of Medicine',
          'thelancet.com': 'The Lancet',
          'pubmed.ncbi.nlm.nih.gov': 'PubMed',
          'pmc.ncbi.nlm.nih.gov': 'PubMed Central',
          'sciencedirect.com': 'ScienceDirect',
          'springer.com': 'Springer',
          'wiley.com': 'Wiley',
          'nih.gov': 'NIH',
          'cdc.gov': 'CDC',
          'biorxiv.org': 'bioRxiv',
          'medrxiv.org': 'medRxiv',
          'jamanetwork.com': 'JAMA Network'
        };
        
        // Check if domain matches known sources
        const matchedSource = Object.entries(domainSourceMap).find(([key]) => 
          domain.includes(key)
        );
        
        if (matchedSource) {
          setArticleSource(matchedSource[1]);
        } else {
          // Use capitalized domain name as fallback
          const sourceName = domain.split('.')[0];
          setArticleSource(sourceName.charAt(0).toUpperCase() + sourceName.slice(1));
        }
      } catch (e) {
        // Ignore URL parsing errors
        setArticleSource("");
      }

      // Call the API to fetch and summarize the article
      try {
        const response = await fetch('/api/summarize-article', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: articleUrl }),
        });

        if (!response.ok) {
          // If we can't access the article directly, try to find an alternative source
          if (response.status === 403 || response.status === 401) {
            // Mark content retrieval as failed but continue with other steps
            throw new Error("Article access restricted. Possible paywall or access controls.");
          }
          
          const errorText = await response.text();
          throw new Error(errorText || `Failed to fetch article: ${response.statusText}`);
        }

        // Content retrieved successfully
        updateLoadingStep("retrievingContent", true);
        
        // Now we're generating the summary
        updateLoadingStep("generatingSummary");

        // Check if the response is a stream or plain text
        const contentType = response.headers.get('content-type');
        
        // Handle different content types appropriately
        if (contentType && contentType.includes('application/json')) {
          // Handle JSON response
          const data = await response.json();
          
          if (data.error) {
            throw new Error(data.error);
          }
          
          setResult(data);
          
          // Set article title if available
          if (data.title) {
            setArticleTitle(data.title);
          } else if (data.originalTitle) {
            setArticleTitle(data.originalTitle);
          }
          
          // Mark summary generation as complete
          updateLoadingStep("generatingSummary", true);
          
          // If we have keywords, extract and use them
          if (data.keywords && data.keywords.length > 0) {
            setExtractedKeywords(data.keywords);
            updateLoadingStep("extractingKeywords", true);
            
            // Fetch related research based on keywords
            fetchRelatedResearch(data.keywords);
          } else {
            // No keywords found, mark remaining steps as complete
            updateLoadingStep("extractingKeywords", true);
            updateLoadingStep("searchingSimilarArticles", true);
            updateLoadingStep("assessingResearch", true);
            
            // Finish loading
            setTimeout(() => {
              setIsLoading(false);
              setShowLoadingOverlay(false);
            }, 500);
          }
        } else if (contentType && (contentType.includes('text/event-stream') || contentType.includes('text/plain') || contentType.includes('text/markdown'))) {
          // Handle streaming response or plain text
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
            setStreamedText(accumulatedText);
            
            // Try to parse the accumulated text as markdown
            try {
              const parsedResult = parseTextResponse(accumulatedText);
              if (parsedResult) {
                setResult(parsedResult);
                
                // If we have keywords, update the extractedKeywords
                if (parsedResult.keywords && parsedResult.keywords.length > 0) {
                  setExtractedKeywords(parsedResult.keywords);
                  updateLoadingStep("generatingSummary", true);
                  updateLoadingStep("extractingKeywords", true);
                  
                  // Start searching for related research
                  fetchRelatedResearch(parsedResult.keywords);
                }
              }
            } catch (parseError: any) {
              // Don't show error for incomplete text parsing during streaming
              if (done) {
                setParseError(`Unable to parse response. The API returned a text format that couldn't be processed.`);
              }
            }
          }
          
          // After stream is complete
          updateLoadingStep("generatingSummary", true);
          
          // If we don't have keywords yet, try to extract them from the final text
          if (extractedKeywords.length === 0) {
            try {
              // Try to extract keywords using regex
              const keywordsMatch = accumulatedText.match(/### Keywords:\s*\n([\s\S]*?)(?=###|$)/i);
              if (keywordsMatch && keywordsMatch[1]) {
                const keywords = keywordsMatch[1].split(',')
                  .map(k => k.trim())
                  .filter(k => k.length > 0);
                
                if (keywords.length > 0) {
                  setExtractedKeywords(keywords);
                  updateLoadingStep("extractingKeywords", true);
                  
                  // Fetch related research based on extracted keywords
                  fetchRelatedResearch(keywords);
                } else {
                  // No keywords found, mark remaining steps as complete
                  updateLoadingStep("extractingKeywords", true);
                  updateLoadingStep("searchingSimilarArticles", true);
                  updateLoadingStep("assessingResearch", true);
                  
                  // Finish loading
                  setTimeout(() => {
                    setIsLoading(false);
                    setShowLoadingOverlay(false);
                  }, 500);
                }
              } else {
                // No keywords found, mark remaining steps as complete
                updateLoadingStep("extractingKeywords", true);
                updateLoadingStep("searchingSimilarArticles", true);
                updateLoadingStep("assessingResearch", true);
                
                // Finish loading
                setTimeout(() => {
                  setIsLoading(false);
                  setShowLoadingOverlay(false);
                }, 500);
              }
            } catch (error) {
              // Failed to extract keywords, mark remaining steps as complete
              updateLoadingStep("extractingKeywords", true);
              updateLoadingStep("searchingSimilarArticles", true);
              updateLoadingStep("assessingResearch", true);
              
              // Finish loading
              setTimeout(() => {
                setIsLoading(false);
                setShowLoadingOverlay(false);
              }, 500);
            }
          }
        } else {
          // Fallback - try to parse as JSON first, then as text if that fails
          try {
            const data = await response.json();
            setResult(data);
            
            // Set article title if available
            if (data.title) {
              setArticleTitle(data.title);
            } else if (data.originalTitle) {
              setArticleTitle(data.originalTitle);
            }
            
            // Mark summary generation as complete
            updateLoadingStep("generatingSummary", true);
            
            // If we have keywords, extract and use them
            if (data.keywords && data.keywords.length > 0) {
              setExtractedKeywords(data.keywords);
              updateLoadingStep("extractingKeywords", true);
              
              // Fetch related research based on keywords
              fetchRelatedResearch(data.keywords);
            } else {
              // No keywords found, mark remaining steps as complete
              updateLoadingStep("extractingKeywords", true);
              updateLoadingStep("searchingSimilarArticles", true);
              updateLoadingStep("assessingResearch", true);
              
              // Finish loading
              setTimeout(() => {
                setIsLoading(false);
                setShowLoadingOverlay(false);
              }, 500);
            }
          } catch (jsonError) {
            // If JSON parsing fails, try to handle as text
            const text = await response.text();
            setStreamedText(text);
            
            try {
              const parsedResult = parseTextResponse(text);
              if (parsedResult) {
                setResult(parsedResult);
                
                // If we have keywords, update the extractedKeywords
                if (parsedResult.keywords && parsedResult.keywords.length > 0) {
                  setExtractedKeywords(parsedResult.keywords);
                  updateLoadingStep("generatingSummary", true);
                  updateLoadingStep("extractingKeywords", true);
                  
                  // Start searching for related research
                  fetchRelatedResearch(parsedResult.keywords);
                } else {
                  // No keywords found, mark remaining steps as complete
                  updateLoadingStep("generatingSummary", true);
                  updateLoadingStep("extractingKeywords", true);
                  updateLoadingStep("searchingSimilarArticles", true);
                  updateLoadingStep("assessingResearch", true);
                  
                  // Finish loading
                  setTimeout(() => {
                    setIsLoading(false);
                    setShowLoadingOverlay(false);
                  }, 500);
                }
              } else {
                // Couldn't parse text, mark all steps as complete
                updateLoadingStep("generatingSummary", true);
                updateLoadingStep("extractingKeywords", true);
                updateLoadingStep("searchingSimilarArticles", true);
                updateLoadingStep("assessingResearch", true);
                
                // Finish loading
                setTimeout(() => {
                  setIsLoading(false);
                  setShowLoadingOverlay(false);
                }, 500);
              }
            } catch (parseError: any) {
              setParseError(`Unable to parse response: ${parseError.message}. The API returned an unexpected format.`);
              
              // Mark all steps as complete
              updateLoadingStep("generatingSummary", true);
              updateLoadingStep("extractingKeywords", true);
              updateLoadingStep("searchingSimilarArticles", true);
              updateLoadingStep("assessingResearch", true);
              
              // Finish loading
              setTimeout(() => {
                setIsLoading(false);
                setShowLoadingOverlay(false);
              }, 500);
            }
          }
        }
      } catch (apiError) {
        console.error("API error:", apiError);
        const errorMsg = apiError instanceof Error ? apiError.message : 'An unexpected error occurred';
        setError(errorMsg);
        
        // Mark all steps as complete and finish loading
        updateLoadingStep("retrievingContent", true);
        updateLoadingStep("generatingSummary", true);
        updateLoadingStep("extractingKeywords", true);
        updateLoadingStep("searchingSimilarArticles", true);
        updateLoadingStep("assessingResearch", true);
        
        setTimeout(() => {
          setIsLoading(false);
          setShowLoadingOverlay(false);
        }, 1000);
      }
    } catch (error) {
      console.error("General error:", error);
      const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMsg);
      
      // Mark all steps as complete and finish loading
      setTimeout(() => {
        setIsLoading(false);
        setShowLoadingOverlay(false);
      }, 1000);
    }
  };

  // Add a function to fetch related research
  const fetchRelatedResearch = useCallback(async (keywords: string[]) => {
    try {
      // Update the loading step to searching for similar articles
      updateLoadingStep("searchingSimilarArticles");
      
      // Update search keywords in the state
      setRelatedResearch(prev => ({
        ...prev,
        searchKeywords: keywords
      }));
      
      // Call the API to fetch related research
      const response = await fetch('/api/semantic-scholar-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords,
          url,
          articleTitle
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch related research: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Store the research results
      setRelatedResearch({
        supporting: data.supporting || [],
        contradictory: data.contradictory || [],
        totalFound: data.totalFound || 0,
        searchKeywords: keywords,
      });
      
      // Mark research assessment as complete
      updateLoadingStep("searchingSimilarArticles", true);
      updateLoadingStep("assessingResearch", true);
      
      // Finish loading after everything is complete
      setTimeout(() => {
        setIsLoading(false);
      }, 500);

      } catch (error) {
      const err = error as Error;
      console.error('Error fetching related research:', err);
      setRelatedResearch(prev => ({
        ...prev,
        error: err.message,
        searchKeywords: keywords,
      }));
      
      // Mark as error but still complete the step
      updateLoadingStep("searchingSimilarArticles", true);
      updateLoadingStep("assessingResearch", true);
      setIsLoading(false);
    }
  }, [url, articleTitle, updateLoadingStep]);

  // Function to parse the plain text response
  const parseTextResponse = (text: string) => {
    try {
      // Define the types for the cohort analysis data structure
      type GenderDistribution = {
        male: number;
        female: number;
        other: number;
      }
      
      type AgeRange = {
        range: string;
        percentage: number;
      }
      
      type GeographicRegion = {
        region: string;
        percentage: number;
      }
      
      type CohortStratification = {
        gender: GenderDistribution;
        ageRanges: AgeRange[];
        demographics: GeographicRegion[];
      }
      
      type CohortAnalysis = {
        studyType: string;
        duration: string;
        dateRange: string;
        cohortSize: number;
        cohortStratification: CohortStratification;
        notes: string[];
      }
      
      type ResultData = {
        title: string;
        originalTitle: string;
        visualSummary: { emoji: string; point: string }[];
        keywords: string[];
        cohortAnalysis: CohortAnalysis;
      }
      
      const result: ResultData = {
        title: "",
        originalTitle: "",
        visualSummary: [] as { emoji: string; point: string }[],
        keywords: [] as string[],
        cohortAnalysis: {
          studyType: "",
          duration: "",
          dateRange: "",
          cohortSize: 0,
          cohortStratification: {
            gender: {
              male: 0,
              female: 0,
              other: 0
            },
            ageRanges: [] as AgeRange[],
            demographics: [] as GeographicRegion[]
          },
          notes: [] as string[]
        }
      };
      
      // Parse original title if it exists
      const originalTitleSection = text.match(/### Original Article Title:\s*([\s\S]*?)(?=###|$)/);
      if (originalTitleSection && originalTitleSection[1]) {
        result.originalTitle = originalTitleSection[1].trim();
        
        // If an original title was found, immediately set it as the article title
        if (result.originalTitle && result.originalTitle.length > 5) {
          setArticleTitle(result.originalTitle);
        }
      }
      
      // Parse title
      const titleSection = text.match(/### Summarized Title:\s*([\s\S]*?)(?=###|$)/);
      if (titleSection && titleSection[1]) {
        result.title = titleSection[1].trim();
      }
      
      // Parse visual summary
      const visualSummarySection = text.match(/### Visual Summary:\s*([\s\S]*?)(?=###|$)/);
      
      if (visualSummarySection && visualSummarySection[1]) {
        const summaryText = visualSummarySection[1].trim();
        const summaryItems = summaryText.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        // Track used emojis to prevent duplication
        const usedEmojis = new Set<string>();
        
        // Use these as alternatives when we need to replace duplicates
        const scientificEmojis = [
          "🔬", "📊", "🧪", "💉", "🩺", "🧬", "🦠", "📈", "🧫", "⚗️", "🧰", 
          "🔋", "💡", "📝", "📑", "🔎", "⚕️", "🔍", "📚", "📱", "📡", "🔭", 
          "💻", "🌡️", "⚖️", "🧠", "🧩", "🔌", "🏥", "🔬", "💊", "🧪", "🔎", 
          "🦴", "🩸", "💧", "🌿", "🧾", "🧮", "♻️", "🧫", "🧴", "🧼"
        ];
        
        // Function to get a unique emoji
        const getUniqueEmoji = (preferredEmoji: string): string => {
          // If this emoji hasn't been used yet, use it
          if (!usedEmojis.has(preferredEmoji)) {
            usedEmojis.add(preferredEmoji);
            return preferredEmoji;
          }
          
          // Find an unused emoji from our list
          for (const emoji of scientificEmojis) {
            if (!usedEmojis.has(emoji)) {
              usedEmojis.add(emoji);
              return emoji;
            }
          }
          
          // If all emojis are used (unlikely), create a unique emoji using a number
          const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
          const index = usedEmojis.size % numberEmojis.length;
          return numberEmojis[index];
        };
        
        summaryItems.forEach(item => {
          try {
            // Primary approach - use Unicode property for emoji detection
            // Look for emoji at beginning of the line, following the API prompt format
            const match = item.match(/^[-\s•⦁*]*\s*([\p{Emoji}]+)(.+)$/u);
            if (match && match[1]) {
              // If there's an emoji at the beginning
              const emoji = match[1].trim();
              const pointText = match[2].trim();
              
              // Get a unique emoji, preferring the one provided but replacing if it's a duplicate
              const uniqueEmoji = getUniqueEmoji(emoji);
              
              // Add the item to the visual summary
              result.visualSummary.push({
                emoji: uniqueEmoji,
                point: pointText
              });
              return; // Skip the fallback
            }
          } catch (e) {
            // If the regex fails (e.g., in browsers that don't support Unicode property)
            console.log("Primary emoji detection failed, using fallback");
          }
          
          // Fallback approach: look for anything that might be an emoji
          // This looks for non-alphanumeric, non-punctuation characters at the start of the line
          const fallbackMatch = item.match(/^[-\s•⦁*]*\s*([^\w\s.,;:!?'"(){}\[\]<>\/\\|`~@#$%^&*_+=\-]*)(.+)$/);
          if (fallbackMatch && fallbackMatch[1] && fallbackMatch[1].trim().length > 0) {
            const emoji = fallbackMatch[1].trim();
            const pointText = fallbackMatch[2].trim();
            
            // Check if emoji is a standard single or double character emoji
            const isLikelyEmoji = emoji.length <= 2 && /[^\w\s.,;:!?'"(){}\[\]<>\/\\|`~@#$%^&*_+=\-]/.test(emoji);
            
            // Get a unique emoji
            const uniqueEmoji = getUniqueEmoji(
              isLikelyEmoji ? emoji : scientificEmojis[Math.floor(Math.random() * scientificEmojis.length)]
            );
            
            result.visualSummary.push({
              emoji: uniqueEmoji,
              point: pointText
            });
          } else {
            // If no emoji found, extract the text
            const plainTextMatch = item.match(/^[-\s•⦁*]*\s*(.+)$/);
            if (plainTextMatch && plainTextMatch[1]) {
              const pointText = plainTextMatch[1].trim();
              
              // Find a unique emoji from our scientific set
              const uniqueEmoji = getUniqueEmoji("📌"); // Start with pin as default
              
              result.visualSummary.push({
                emoji: uniqueEmoji,
                point: pointText
              });
            }
          }
        });
      }
      
      // Parse keywords
      const keywordsSection = text.match(/### Keywords:\s*([\s\S]*?)(?=###|$)/);
      
      if (keywordsSection && keywordsSection[1]) {
        const keywordsText = keywordsSection[1].trim();
        
        // If it's just the prompt instructions without actual keywords, skip it
        if (keywordsText.includes("GUIDELINES FOR GOOD KEYWORDS") || keywordsText.includes("[Generate 5-7")) {
          result.keywords = []; // No valid keywords found
        } else {
          // Split by commas and clean up
          const keywordsList = keywordsText
            .split(/[,\n]/)
            .map(k => k.replace(/^[-\s•⦁*✓✗]*/, '').trim())
            .filter(k => {
              // Filter out empty keywords and any text that's clearly not a keyword
              return k !== '' && 
                     k !== 'N/A' && 
                     k !== 'Not applicable' && 
                     k !== 'None' &&
                     !k.includes('too generic') &&
                     !k.includes('too vague') &&
                     !k.includes('too broad') &&
                     !k.toLowerCase().startsWith('avoid') &&
                     !k.toLowerCase().startsWith('prefer') &&
                     !k.toLowerCase().startsWith('include');
            });
          
          // Remove any keywords in quotes
          result.keywords = keywordsList.map(k => k.replace(/["']/g, ''));
          
          // Log the extracted keywords for debugging
          console.log("Extracted keywords for research:", result.keywords);
        }
      }
      
      // Parse cohort analysis
      const cohortSection = text.match(/### Cohort Analysis:\s*([\s\S]*?)(?=###|$)/);
      
      if (cohortSection && cohortSection[1]) {
        const cohortText = cohortSection[1].trim();
        const cohortLines = cohortText.split('\n').map(line => line.trim());
        
        // Study type
        const studyTypeLine = cohortLines.find(line => line.startsWith('Type of study:'));
        if (studyTypeLine) {
          const studyType = studyTypeLine.replace('Type of study:', '').trim();
          if (studyType && studyType !== 'Not specified' && studyType !== 'N/A' && studyType !== 'Not applicable') {
            result.cohortAnalysis.studyType = studyType;
          }
        }
        
        // Duration
        const durationLine = cohortLines.find(line => 
          line.startsWith('Duration:') || 
          line.startsWith('Duration of study:')
        );
        if (durationLine) {
          const duration = durationLine
            .replace('Duration of study:', '')
            .replace('Duration:', '')
            .trim();
          
          if (duration && duration !== 'Not specified' && duration !== 'N/A' && duration !== 'Not applicable') {
            result.cohortAnalysis.duration = duration;
          }
        }
        
        // Date range
        const dateRangeLine = cohortLines.find(line => 
          line.startsWith('Date range:') || 
          line.startsWith('Date range of articles:') ||
          line.startsWith('Date range of articles used:')
        );
        if (dateRangeLine) {
          const dateRange = dateRangeLine
            .replace('Date range of articles used:', '')
            .replace('Date range of articles:', '')
            .replace('Date range:', '')
            .trim();
          
          if (dateRange && dateRange !== 'Not specified' && dateRange !== 'N/A' && dateRange !== 'Not applicable') {
            result.cohortAnalysis.dateRange = dateRange;
          }
        }
        
        // Cohort size
        const sizeLine = cohortLines.find(line => 
          line.startsWith('Cohort size:') || 
          line.startsWith('Size:') ||
          line.startsWith('Sample Size:')
        );
        if (sizeLine) {
          const sizeText = sizeLine
            .replace('Cohort size:', '')
            .replace('Size:', '')
            .replace('Sample Size:', '')
            .trim();
          
          if (sizeText && sizeText !== 'Not specified' && sizeText !== 'N/A' && sizeText !== 'Not applicable') {
            const numberMatch = sizeText.match(/\d+/);
            if (numberMatch) {
              result.cohortAnalysis.cohortSize = parseInt(numberMatch[0], 10);
            }
          }
        }
        
        // Parse age distribution
        const ageDistributionStart = cohortLines.findIndex(line => 
          line.includes('Age Distribution') || 
          line.includes('Age Ranges') ||
          line.includes('Age Groups')
        );
        
        if (ageDistributionStart !== -1) {
          let i = ageDistributionStart + 1;
          
          // Special handling for text descriptions of age distribution
          const ageNotes = [];
          
          // Continue until we find a line that doesn't look like age data
          while (i < cohortLines.length) {
            const line = cohortLines[i].trim();
            
            // Skip empty lines
            if (line === '') {
              i++;
              continue;
            }
            
            // Capture age-related notes for display if we don't get structured data
            if (line && !line.includes('Gender:') && !line.includes('Geographic Distribution:')) {
              ageNotes.push(line);
            }
            
            // Look for patterns like "X out of Y participants were in age group Z"
            const ageGroupPattern = line.match(/(\d+)\s*out\s*of\s*(\d+).*?(under|over|above|below|between)\s*(\d+).*?(years|yrs)/i);
            if (ageGroupPattern) {
              // Extract the actual counts and age information
              const count = parseInt(ageGroupPattern[1], 10);
              const total = parseInt(ageGroupPattern[2], 10);
              const ageDirection = ageGroupPattern[3].toLowerCase();
              const ageValue = parseInt(ageGroupPattern[4], 10);
              
              // Only process if we have valid numbers
              if (!isNaN(count) && !isNaN(total) && !isNaN(ageValue) && total > 0) {
                // Calculate the percentage
                const percentage = (count / total) * 100;
                
                // Determine the age range label based on the text
                let ageRange = '';
                if (ageDirection === 'under' || ageDirection === 'below') {
                  ageRange = `Under ${ageValue}`;
                  
                  // Add this specific age range
                  result.cohortAnalysis.cohortStratification.ageRanges.push({
                    range: ageRange,
                    percentage
                  });
                  
                  // Add the complementary age range
                  result.cohortAnalysis.cohortStratification.ageRanges.push({
                    range: `${ageValue}+`,
                    percentage: 100 - percentage
                  });
                } else if (ageDirection === 'over' || ageDirection === 'above') {
                  ageRange = `${ageValue}+`;
                  
                  // Add this specific age range
                  result.cohortAnalysis.cohortStratification.ageRanges.push({
                    range: ageRange,
                    percentage
                  });
                  
                  // Add the complementary age range
                  result.cohortAnalysis.cohortStratification.ageRanges.push({
                    range: `Under ${ageValue}`,
                    percentage: 100 - percentage
                  });
                }
                
                // Store the original text description as a note
                if (!result.cohortAnalysis.notes) {
                  result.cohortAnalysis.notes = [];
                }
                result.cohortAnalysis.notes.push(line);
                
                i++;
                continue;
              }
            }
            
            // Check if this looks like an age range line
            const ageMatch = line.match(/(\d+[-–]\d+|\d+\+|\d+\s*and\s*over|under\s*\d+)\s*[:\s]*(\d+\.?\d*)%?/i);
            
            if (ageMatch && ageMatch[1] && ageMatch[2]) {
              let ageRange = ageMatch[1].trim();
              const percentageStr = ageMatch[2].trim();
              const percentage = parseFloat(percentageStr);
              
              // Standardize age range format
              if (ageRange.match(/^(\d+)-(\d)$/)) {
                // Handle truncated ranges like 18-2 (should be 18-24)
                if (ageRange === "18-2") ageRange = "18-24";
                else if (ageRange === "25-3") ageRange = "25-34";
                else if (ageRange === "35-4") ageRange = "35-49";
                else if (ageRange === "50-6") ageRange = "50-64";
              }
              
              if (!isNaN(percentage)) {
                result.cohortAnalysis.cohortStratification.ageRanges.push({
                  range: ageRange,
                  percentage
                });
              }
              i++;
            } else {
              // If this line doesn't contain age data but does contain relevant age text,
              // save it as a note for potential use in display
              if (line.toLowerCase().includes('age') && 
                  (line.includes('year') || line.includes('yr') || 
                   line.includes('old') || line.includes('young'))) {
                ageNotes.push(line);
                i++;
                continue;
              }
              
              // Try a different format: look for age range followed by percentage on separate line
              const ageRangeOnly = line.match(/(\d+[-–]\d+|\d+\+|\d+\s*and\s*over|under\s*\d+)$/i);
              
              if (ageRangeOnly && ageRangeOnly[1] && i + 1 < cohortLines.length) {
                const nextLine = cohortLines[i + 1].trim();
                const percentageMatch = nextLine.match(/(\d+\.?\d*)%?/);
                
                if (percentageMatch && percentageMatch[1]) {
                  const ageRange = ageRangeOnly[1].trim();
                  const percentageStr = percentageMatch[1].trim();
                  const percentage = parseFloat(percentageStr);
                  
                  if (!isNaN(percentage)) {
                    result.cohortAnalysis.cohortStratification.ageRanges.push({
                      range: ageRange,
                      percentage
                    });
                  }
                  i += 2; // Skip both the age range line and the percentage line
                  continue;
                }
              }
              
              // If we get here, this doesn't look like age distribution data anymore
              break;
            }
          }
          
          // If we didn't find any structured age data but did find age text notes,
          // add them to the notes section
          if (result.cohortAnalysis.cohortStratification.ageRanges.length === 0 && ageNotes.length > 0) {
            for (const note of ageNotes) {
              if (!result.cohortAnalysis.notes.includes(note)) {
                result.cohortAnalysis.notes.push(note);
              }
            }
          }
        }
        
        // Parse gender distribution
        const genderLine = cohortLines.find(line => 
          line.includes('Gender') || 
          line.includes('Sex')
        );
        
        if (genderLine) {
          // Look for male/female percentages within the gender line
          const maleFemaleMatch = genderLine.match(/Male\s*:?\s*(\d+\.?\d*)%\s*,?\s*Female\s*:?\s*(\d+\.?\d*)%/i) || 
                                  genderLine.match(/Female\s*:?\s*(\d+\.?\d*)%\s*,?\s*Male\s*:?\s*(\d+\.?\d*)%/i);
          
          if (maleFemaleMatch) {
            // Check if Female comes first in the match
            if (maleFemaleMatch[0].toLowerCase().indexOf('female') < maleFemaleMatch[0].toLowerCase().indexOf('male')) {
              result.cohortAnalysis.cohortStratification.gender.female = parseFloat(maleFemaleMatch[1]);
              result.cohortAnalysis.cohortStratification.gender.male = parseFloat(maleFemaleMatch[2]);
            } else {
              result.cohortAnalysis.cohortStratification.gender.male = parseFloat(maleFemaleMatch[1]);
              result.cohortAnalysis.cohortStratification.gender.female = parseFloat(maleFemaleMatch[2]);
            }
          } else {
            // Check lines following the gender line
            const genderIndex = cohortLines.indexOf(genderLine);
            
            if (genderIndex !== -1) {
              // Look for male percentage
              for (let i = genderIndex + 1; i < Math.min(genderIndex + 5, cohortLines.length); i++) {
                const maleLine = cohortLines[i].match(/Male\s*:?\s*(\d+\.?\d*)%/i);
                if (maleLine && maleLine[1]) {
                  result.cohortAnalysis.cohortStratification.gender.male = parseFloat(maleLine[1]);
                  break;
                }
              }
              
              // Look for female percentage
              for (let i = genderIndex + 1; i < Math.min(genderIndex + 5, cohortLines.length); i++) {
                const femaleLine = cohortLines[i].match(/Female\s*:?\s*(\d+\.?\d*)%/i);
                if (femaleLine && femaleLine[1]) {
                  result.cohortAnalysis.cohortStratification.gender.female = parseFloat(femaleLine[1]);
                  break;
                }
              }
              
              // Look for other gender percentage
              for (let i = genderIndex + 1; i < Math.min(genderIndex + 5, cohortLines.length); i++) {
                const otherLine = cohortLines[i].match(/Other\s*:?\s*(\d+\.?\d*)%/i);
                if (otherLine && otherLine[1]) {
                  result.cohortAnalysis.cohortStratification.gender.other = parseFloat(otherLine[1]);
                  break;
                }
              }
            }
          }
        }
        
        // Parse geographic distribution
        const geoDistributionStart = cohortLines.findIndex(line => 
          line.includes('Geographic Distribution') || 
          line.includes('Geography') ||
          line.includes('Regions')
        );
        
        if (geoDistributionStart !== -1) {
          let i = geoDistributionStart + 1;
          
          // Continue until we find a line that doesn't look like geographic data
          while (i < cohortLines.length) {
            const line = cohortLines[i].trim();
            
            // Skip empty lines
            if (line === '') {
              i++;
              continue;
            }
            
            // Check if this looks like a region line
            const geoMatch = line.match(/(North America|South America|Europe|Asia|Africa|Oceania|Australia|Middle East|Eastern Europe|Western Europe|Latin America|Central America|Caribbean|Pacific|Mediterranean)[:\s]*(\d+\.?\d*)%/i) ||
                             line.match(/(United States|USA|Canada|UK|United Kingdom|China|Japan|Germany|France|Italy|Spain|Brazil|India|Russia|Australia)[:\s]*(\d+\.?\d*)%/i);
            
            if (geoMatch) {
              const region = geoMatch[1].trim();
              let percentage = parseFloat(geoMatch[2]);
              
              if (!isNaN(percentage)) {
                result.cohortAnalysis.cohortStratification.demographics.push({
                  region,
                  percentage
                });
              }
              i++;
            } else {
              // If we get here, this doesn't look like geographic data anymore
              break;
            }
          }
        }
        
        // Notes
        const notesStartIndex = cohortLines.findIndex(line => line === 'Notes:');
        if (notesStartIndex !== -1) {
          const notesLines = cohortLines.slice(notesStartIndex + 1)
            .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
            .map(line => line.replace(/^[-\s•]*/, '').trim())
            .filter(note => note !== '' && note !== 'Not specified' && note !== 'N/A' && note !== 'Not applicable');
          
          result.cohortAnalysis.notes = notesLines;
        }
      }
      
      // Add this at the end of the successful parsing section
      // Fetch related research using the keywords
      if (result.keywords && result.keywords.length > 0) {
        fetchRelatedResearch(result.keywords);
      }
      
      return result;
    } catch (error) {
      console.error("Error parsing text response:", error);
      return null;
    }
  };

  // Render the visual summary section with emojis and points
  const renderVisualSummary = () => {
    if (!result?.visualSummary || result.visualSummary.length === 0) {
      return (
        <div className="text-gray-500 italic">
          No visual summary available
        </div>
      );
    }

    // Comprehensive mapping of potentially problematic emojis to well-supported alternatives
    const emojiSubstitutes: Record<string, string> = {
      // Scientific/medical emojis that might not render in all browsers
      "🧫": "🧪", // Petri dish → test tube
      "🦠": "🔬", // Microbe → microscope
      "🧬": "🧠", // DNA → brain
      "🩺": "⚕️", // Stethoscope → medical symbol
      "🪤": "⚠️", // Mousetrap → warning
      "🩸": "💉", // Blood drop → syringe
      "🧪": "⚗️", // Test tube → alembic
      "🦿": "🦴", // Mechanical leg → bone
      "🧠": "🧐", // Brain → face with monocle
      "🫀": "❤️", // Anatomical heart → heart
      "🫁": "🫧", // Lungs → bubbles
      "🧮": "🔢", // Abacus → numbers
      "🩻": "📊", // X-ray → chart
      "🫧": "💧", // Bubbles → droplet
      "🧯": "🔥", // Fire extinguisher → fire
      "🪬": "🔮", // Hamsa → crystal ball
      "🪫": "🔋", // Low battery → battery
      "🪪": "📋", // ID card → clipboard
      "🩹": "🩺", // Bandage → stethoscope
      "🚱": "💧", // Non-potable water → droplet
    };

    // Track the emojis we've seen during rendering to prevent duplicates
    const seenEmojis = new Set<string>();
    const backupEmojis = ["📱", "📡", "🔭", "💻", "🌡️", "⚖️", "🧩", "🔌", "🏥", "💊", "🌿", "📎", "📌", "🔖", "📒", "📓", "📔", "📙", "📘", "📗", "📕"];
    
    // Function to get a unique rendering emoji
    const getUniqueRenderingEmoji = (preferredEmoji: string): string => {
      // If we haven't seen this emoji yet, use it
      if (!seenEmojis.has(preferredEmoji)) {
        seenEmojis.add(preferredEmoji);
        return preferredEmoji;
      }
      
      // Otherwise find a backup emoji we haven't used yet
      for (const emoji of backupEmojis) {
        if (!seenEmojis.has(emoji)) {
          seenEmojis.add(emoji);
          return emoji;
        }
      }
      
      // If all emojis are used (unlikely), return a number emoji
      return ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"][seenEmojis.size % 5];
    };

    // Function to highlight percentages with special styling
    const highlightPercentages = (text: string) => {
      return text.split(/(\d+(?:\.\d+)?%|\d+(?:\.\d+)? percent|\d+(?:\.\d+)?-fold)/g).map((part, i) => {
        // Check if this part contains a percentage or fold-change
        const isPercentage = /\d+(?:\.\d+)?%|\d+(?:\.\d+)? percent|\d+(?:\.\d+)?-fold/.test(part);
        return isPercentage ? 
          <span key={i} className="font-medium text-blue-700">{part}</span> : 
          <span key={i}>{part}</span>;
      });
    };

    return (
      <div className="space-y-4">
        {result.visualSummary.map((item: { emoji: string; point: string }, index: number) => {
          // Check if the emoji might need substitution
          let displayEmoji = item.emoji;
          if (emojiSubstitutes[item.emoji]) {
            displayEmoji = emojiSubstitutes[item.emoji];
          }
          
          // Ensure emoji is unique when rendering
          displayEmoji = getUniqueRenderingEmoji(displayEmoji);
          
          return (
            <div key={index} className="flex gap-4 items-start">
              <div className="text-2xl min-w-[28px] emoji-container">
                {/* Use emoji font families for best cross-platform support */}
                <span style={{ 
                  fontFamily: '"Segoe UI Emoji", "Segoe UI Symbol", "Apple Color Emoji", "Noto Color Emoji", "EmojiOne Color", "Android Emoji", sans-serif',
                  fontSize: '1.5rem',
                  lineHeight: 1
                }}>
                  {displayEmoji}
                </span>
              </div>
              <div className="flex-1">
                {highlightPercentages(item.point)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render the keywords as badge components
  const renderKeywords = () => {
    if (!result?.keywords || result.keywords.length === 0) {
      return <div className="text-gray-500 italic">No keywords available</div>;
    }

    // Function to evaluate keyword quality based on our guidelines
    const evaluateKeywordQuality = (keyword: string): { quality: 'good' | 'moderate' | 'poor', reason?: string } => {
      // Convert to lowercase for comparisons
      const k = keyword.toLowerCase();
      
      // These are likely poor or generic keywords
      const poorKeywords = [
        'therapy', 'medical', 'research', 'health', 'study', 'treatment', 
        'analysis', 'disease', 'medicine', 'patient', 'clinical', 'doctor',
        'hospital', 'drug', 'care', 'health'
      ];
      
      // Check if it's a single generic term
      if (poorKeywords.includes(k)) {
        return { quality: 'poor', reason: 'Too generic' };
      }
      
      // Good keywords likely have multiple terms or are specific scientific terms
      const isMultiWord = k.includes(' ');
      const hasSpecificTerm = /\w+-\w+/.test(k) || k.length > 12;
      
      if (isMultiWord || hasSpecificTerm) {
        return { quality: 'good' };
      }
      
      // Default to moderate
      return { quality: 'moderate' };
    };
    
    // Map quality to CSS class
    const getKeywordClass = (quality: 'good' | 'moderate' | 'poor') => {
      switch (quality) {
        case 'good':
          return "bg-blue-50 text-blue-800 py-1 px-3 rounded-md text-sm";
        case 'moderate': 
          return "bg-gray-50 text-gray-700 py-1 px-3 rounded-md text-sm";
        case 'poor':
          return "bg-red-50 text-red-700 py-1 px-3 rounded-md text-sm";
      }
    };

    return (
      <div className="flex flex-wrap gap-2">
        {result.keywords.map((keyword: string, index: number) => {
          const { quality } = evaluateKeywordQuality(keyword);
          return (
            <span 
              key={index} 
              className={getKeywordClass(quality)}
              title={quality === 'poor' ? 'This keyword may be too generic' : undefined}
            >
              {keyword}
            </span>
          );
        })}
      </div>
    );
  };

  // Render the cohort analysis section
  const renderCohortAnalysis = () => {
    if (!result?.cohortAnalysis) {
      return <div className="text-gray-500 italic">No cohort analysis available</div>;
    }

    // Only use actual values from the API response, no defaults
    const {
      studyType,
      duration,
      dateRange,
      cohortSize,
      cohortStratification,
      notes
    } = result.cohortAnalysis;

    // Colors for charts
    const CHART_COLORS = [
      '#3b82f6', // blue-500
      '#8b5cf6', // violet-500
      '#ec4899', // pink-500
      '#f97316', // orange-500
      '#10b981', // emerald-500
      '#6366f1', // indigo-500
      '#facc15', // yellow-500
      '#ef4444', // red-500
      '#8b5cf6', // violet-500
      '#14b8a6', // teal-500
    ];

    // Check if we have actual gender data
    const hasGenderData = 
      cohortStratification?.gender && 
      (cohortStratification.gender.male > 0 || 
      cohortStratification.gender.female > 0 || 
      cohortStratification.gender.other > 0);

    // Only create gender data if it actually exists
    const genderData = hasGenderData ? [
      { name: 'Male', value: cohortStratification.gender.male },
      { name: 'Female', value: cohortStratification.gender.female },
      ...(cohortStratification.gender.other > 0 ? [{ name: 'Other', value: cohortStratification.gender.other }] : [])
    ] : [];

    // Calculate study duration in months from string if possible
    const getDurationInMonths = (): number => {
      if (!duration) return 0;
      
      const yearMatch = duration.match(/(\d+)\s*(?:year|yr)/i);
      const monthMatch = duration.match(/(\d+)\s*(?:month|mo)/i);
      
      let months = 0;
      if (yearMatch && yearMatch[1]) {
        months += parseInt(yearMatch[1]) * 12;
      }
      if (monthMatch && monthMatch[1]) {
        months += parseInt(monthMatch[1]);
      }
      
      // If no specific duration found, estimate based on text
      if (months === 0) {
        if (duration.toLowerCase().includes('long-term')) return 36;
        if (duration.toLowerCase().includes('medium')) return 18; 
        if (duration.toLowerCase().includes('short')) return 6;
      }
      
      return months;
    };
    
    const durationMonths = getDurationInMonths();
    const durationPercentage = durationMonths > 0 ? Math.min(100, Math.max(10, (durationMonths / 36) * 100)) : 0;

    // Check if we have age data
    const hasAgeData = cohortStratification?.ageRanges && cohortStratification.ageRanges.length > 0;
    const hasOnlyOneAgeRange = hasAgeData && cohortStratification.ageRanges.length === 1;
    
    // Store any textual age-related notes
    const ageTextNotes = notes?.filter((note: string) => 
      note.toLowerCase().includes('age') || 
      note.toLowerCase().includes('year') ||
      note.toLowerCase().includes('old') ||
      note.toLowerCase().includes('young')
    ) || [];
    
    // Transform age data to include counts instead of just percentages
    let ageRangesData = [];
    if (hasAgeData && cohortSize > 0) {
      // Process the age ranges data to add count and ensure percentages add up to 100%
      let totalPercentage = 0;
      ageRangesData = cohortStratification.ageRanges.map((range: { range: string, percentage: number }) => {
        totalPercentage += range.percentage;
        // Fix any cut-off age range labels - ensure they display correctly
        let fixedRange = range.range;
        
        // Handle common truncated formats that might come from the API
        if (fixedRange === "18-2") fixedRange = "18-24";
        else if (fixedRange === "25-3") fixedRange = "25-34";
        else if (fixedRange === "35-4") fixedRange = "35-49";
        else if (fixedRange === "50-6") fixedRange = "50-64";
        
        return {
          ...range,
          range: fixedRange,
          // Calculate the count of participants based on percentage
          count: Math.round((range.percentage / 100) * cohortSize)
        };
      });
      
      // Adjust if percentages don't add up to 100%
      if (totalPercentage > 0 && Math.abs(totalPercentage - 100) > 1) {
        // Scale all percentages to add up to 100%
        const scaleFactor = 100 / totalPercentage;
        ageRangesData = ageRangesData.map((range: { range: string, percentage: number, count: number }) => ({
          ...range,
          percentage: Math.round(range.percentage * scaleFactor),
          // Recalculate count based on adjusted percentage
          count: Math.round((range.percentage * scaleFactor / 100) * cohortSize)
        }));
      }
      
      // Ensure total count matches cohort size by adjusting the largest group if needed
      const totalCount = ageRangesData.reduce((sum: number, range: { count: number }) => sum + range.count, 0);
      if (totalCount !== cohortSize && ageRangesData.length > 0) {
        // Find the largest group to adjust
        const largestGroupIndex = ageRangesData.reduce(
          (maxIndex: number, range: { count: number }, index: number, arr: Array<{ count: number }>) => 
            range.count > arr[maxIndex].count ? index : maxIndex, 
          0
        );
        // Adjust the count of the largest group
        ageRangesData[largestGroupIndex].count += (cohortSize - totalCount);
        // Recalculate its percentage
        ageRangesData[largestGroupIndex].percentage = Math.round(
          (ageRangesData[largestGroupIndex].count / cohortSize) * 100
        );
      }
    }
    
    // Check if we have geographic data
    const hasGeoData = cohortStratification?.demographics && cohortStratification.demographics.length > 0;

    return (
      <div className="space-y-6">
        {/* First row: Study Type and Study Duration */}
        <div className="flex flex-wrap gap-6">
          {/* Study Type */}
        {studyType && (
            <div className="flex-1 min-w-[200px]">
              <h4 className="text-gray-700 font-medium mb-2">Study Type</h4>
            <p>{studyType}</p>
          </div>
        )}
        
          {/* Study Duration and Date Range */}
          {(duration || dateRange) ? (
            <div className="flex-1 min-w-[200px]">
              <h4 className="text-gray-700 font-medium mb-2">Study Duration</h4>
              {dateRange && <p className="text-sm mb-1">{dateRange}</p>}
              {duration && durationMonths > 0 && (
            <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${durationPercentage}%` }}
                      ></div>
              </div>
            </div>
                  <div className="whitespace-nowrap text-sm font-medium">
                    {duration}
                  </div>
          </div>
                      )}
                    </div>
          ) : (
            <div className="flex-1 min-w-[200px]">
              <h4 className="text-gray-700 font-medium mb-2">Study Duration</h4>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="flex items-center text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">
                    No study duration information was provided
                  </p>
                </div>
              </div>
                </div>
              )}
            </div>
        
        {/* Second row: Sample Size and Age Distribution */}
        <div className="flex flex-wrap gap-6">
          {/* Sample Size */}
          {cohortSize > 0 && (
            <div className="flex-1 min-w-[200px]">
              <h4 className="text-gray-700 font-medium mb-2">Sample Size</h4>
            <div className="flex items-center gap-4">
                <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-md">
                  <span className="text-xl font-semibold">{cohortSize.toLocaleString()}</span>
                  <span className="text-sm ml-2">participants</span>
              </div>
            </div>
          </div>
        )}
        
          {/* Age Distribution - Multiple age ranges (Chart) */}
        {((hasAgeData && cohortStratification.ageRanges.length > 1) || (ageRangesData.length > 1)) && (
            <div className="flex-1 min-w-[200px]">
            <h4 className="text-gray-700 font-medium mb-2">Age Distribution</h4>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ageRangesData.length > 0 ? ageRangesData : cohortStratification.ageRanges}
                  margin={{ top: 10, right: 20, left: 20, bottom: 50 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="range" 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    tick={{fontSize: 12}}
                    tickFormatter={(value) => {
                      // Ensure all age ranges are properly displayed
                      if (value === "18-2") return "18-24";
                      if (value === "25-3") return "25-34";
                      if (value === "35-4") return "35-49";
                      if (value === "50-6") return "50-64";
                      return value;
                    }}
                  />
                  <YAxis 
                      tickFormatter={(value) => `${value}%`}
                      tick={{fontSize: 12}}
                  />
                  <Tooltip 
                      formatter={(value, name, props) => {
                        if (props.payload.count !== undefined) {
                          return [`${value}% (${props.payload.count} participants)`, "Percentage"];
                        }
                        return [`${value}%`, "Percentage"];
                      }}
                      labelFormatter={(label) => `Age: ${label}`}
                  />
                  <Bar 
                      dataKey="percentage" 
                    fill="#3b82f6" 
                      label={{
                        position: 'top',
                        formatter: (value: number) => `${value}%`,
                        fontSize: 12,
                        fill: '#6b7280'
                      }} 
                    />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        
          {/* Age Distribution - Single age range (Info box) */}
          {hasAgeData && hasOnlyOneAgeRange && (
            <div className="flex-1 min-w-[200px]">
            <h4 className="text-gray-700 font-medium mb-2">Age Distribution</h4>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <div className="flex items-center">
                <div className="text-blue-500 mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-blue-800 font-medium">
                    {cohortStratification.ageRanges[0].range}: {cohortStratification.ageRanges[0].percentage}% of participants
                  </p>
                  {cohortSize > 0 && (
                    <p className="text-xs text-blue-600">
                      Approximately {Math.round((cohortStratification.ageRanges[0].percentage / 100) * cohortSize)} out of {cohortSize} total participants
                    </p>
                  )}
                </div>
                {cohortSize > 0 && (
                  <div className="ml-4 flex-shrink-0">
                    <div 
                      className="rounded-full px-3 py-1 text-sm font-medium" 
                      style={{ 
                        backgroundColor: CHART_COLORS[0],
                        color: 'white'
                      }}
                    >
                      {Math.round((cohortStratification.ageRanges[0].percentage / 100) * cohortSize)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
          {/* Age Distribution - Text notes */}
        {!hasAgeData && ageTextNotes.length > 0 && (
            <div className="flex-1 min-w-[200px]">
            <h4 className="text-gray-700 font-medium mb-2">Age Distribution</h4>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <div className="flex items-start space-x-3">
                <div className="text-blue-500 mt-0.5 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  {ageTextNotes.map((note: string, index: number) => (
                    <p key={`age-note-${index}`} className={`text-sm ${index === 0 ? 'font-medium text-blue-800' : 'text-blue-700'} ${index !== ageTextNotes.length - 1 ? 'mb-2' : ''}`}>
                      {note}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
          {/* Age Distribution - No data message */}
          {!hasAgeData && ageTextNotes.length === 0 && (
            <div className="flex-1 min-w-[200px]">
            <h4 className="text-gray-700 font-medium mb-2">Age Distribution</h4>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <div className="flex items-center text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">
                  No age distribution data was provided in this study
                </p>
              </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Gender Distribution - Only show if we have gender data */}
        {hasGenderData && (
          <div>
            <h4 className="text-gray-700 font-medium mb-2">Gender</h4>
            <div className="flex flex-col space-y-2">
              {/* Horizontal gender bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-8 rounded-md overflow-hidden flex">
                  {genderData.map((gender, index) => (
                    <div 
                      key={`gender-bar-${index}`}
                      className={`h-full flex items-center justify-center text-white font-medium ${
                        gender.name === 'Male' ? 'bg-blue-500' : 
                        gender.name === 'Female' ? 'bg-pink-500' : 
                        'bg-purple-500'
                      }`}
                      style={{ width: `${gender.value}%` }}
                    >
                      {gender.value > 15 && (
                        <span>{gender.value}% {gender.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Small legend for the gender bar if text doesn't fit in bars */}
              {genderData.some(gender => gender.value <= 15) && (
                <div className="flex gap-4 text-sm">
                  {genderData.filter(gender => gender.value <= 15).map((gender, index) => (
                    <div key={`gender-legend-${index}`} className="flex items-center">
                      <div className={`w-3 h-3 rounded-sm mr-1 ${
                        gender.name === 'Male' ? 'bg-blue-500' : 
                        gender.name === 'Female' ? 'bg-pink-500' : 
                        'bg-purple-500'
                      }`}></div>
                      <span>{gender.name}: {gender.value}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Geographic Distribution - Only show if we have geo data */}
        {hasGeoData && (
          <div>
            <h4 className="text-gray-700 font-medium mb-2">Geographic Distribution</h4>
            <div className="flex flex-wrap gap-2">
              {cohortStratification.demographics.map((region: { region: string, percentage: number }, index: number) => (
                <Badge 
                  key={`region-${index}`}
                  className="py-1.5 px-3 text-white font-medium"
                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                >
                  {region.region}: {region.percentage}%
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Notes - Only show if present */}
        {notes && notes.length > 0 && (
          <div>
            <h4 className="text-gray-700 font-medium mb-1">Notes</h4>
            <ul className="list-disc pl-5 space-y-1">
              {notes.map((note: string, index: number) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // Add a new function to render related research
  const renderRelatedResearch = () => {
    const { supporting, contradictory, error: researchError, searchKeywords } = relatedResearch;
    
    // Check if the error contains common connection errors and make them user-friendly
    const getFormattedErrorMessage = (error: string) => {
      if (error.includes('ECONNREFUSED') || error.includes('CONNECTION_REFUSED')) {
        return 'Unable to connect to the research database. The service might be temporarily unavailable.';
      } else if (error.includes('ETIMEDOUT') || error.includes('timeout')) {
        return 'Connection to the research database timed out. Please try again later.';
      } else if (error.includes('ENOTFOUND')) {
        return 'Could not resolve the research database hostname. Please check your network connection.';
      }
      return error;
    };
    
    // Handle errors with a retry button
    if (researchError) {
      return (
        <div className="p-6 bg-red-50 border border-red-100 rounded-md">
          <div className="flex flex-col items-center text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-red-600 mb-4">{getFormattedErrorMessage(researchError)}</p>
            <Button 
              variant="outline"
              className="bg-white hover:bg-gray-100 text-red-600 border-red-300"
              onClick={() => {
                // Retry fetching related research
                if (extractedKeywords.length > 0) {
                  fetchRelatedResearchQuietly(extractedKeywords);
                }
              }}
            >
              Retry
            </Button>
          </div>
        </div>
      );
    }
    
    if (supporting.length === 0 && contradictory.length === 0) {
      if (currentStep === "searchingSimilarArticles" && !completedSteps.includes("searchingSimilarArticles")) {
        return (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-900 mx-auto mb-2"></div>
            <p className="text-gray-600">
              {searchKeywords && searchKeywords.length > 0 
                ? `Retrieving similar articles using the following keywords: ${searchKeywords.join(', ')}` 
                : 'Searching for related research...'}
            </p>
          </div>
        );
      }
      
      return (
        <div className="p-6 text-center bg-gray-50 border border-gray-100 rounded-md">
          <p className="text-gray-600 mb-2">No related research articles found.</p>
          {extractedKeywords.length > 0 && (
            <Button 
              variant="outline"
              className="text-gray-600 border-gray-300 hover:bg-gray-100 text-sm"
              onClick={() => fetchRelatedResearchQuietly(extractedKeywords)}
            >
              Try again
            </Button>
          )}
        </div>
      );
    }
    
    return (
      <div className="grid md:grid-cols-2 gap-8">
        {/* Supporting Research */}
        <div>
          <h4 className="text-lg font-medium mb-4 flex items-center">
            <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
            Supporting Research
          </h4>
          <div className="space-y-4">
            {supporting.length === 0 ? (
              <p className="text-gray-500">No supporting research articles found.</p>
            ) : (
              supporting.map((article, index) => (
                <div key={index} className="border-l-4 border-l-green-500 p-4 bg-white shadow-sm rounded-md">
                  <h5 className="font-medium text-blue-900 mb-1">
                    <a href={article.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {article.title}
                    </a>
                  </h5>
                  {article.finding && (
                    <p className="text-sm text-gray-700 my-2 bg-green-50 p-2 rounded border-l-2 border-l-green-400">
                      <span className="text-green-600 font-medium">This study supports: </span>{article.finding}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Contradictory Research */}
        <div>
          <h4 className="text-lg font-medium mb-4 flex items-center">
            <span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>
            Contradictory Research
          </h4>
          <div className="space-y-4">
            {contradictory.length === 0 ? (
              <p className="text-gray-500">No contradictory research articles found.</p>
            ) : (
              contradictory.map((article, index) => (
                <div key={index} className="border-l-4 border-l-red-500 p-4 bg-white shadow-sm rounded-md">
                  <h5 className="font-medium text-blue-900 mb-1">
                    <a href={article.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {article.title}
                    </a>
                  </h5>
                  {article.finding && (
                    <p className="text-sm text-gray-700 my-2 bg-red-50 p-2 rounded border-l-2 border-l-red-400">
                      <span className="text-red-600 font-medium">This study challenges: </span>{article.finding}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  // Add a function to handle URL submission from the article-summary page
  const handleAnalyzeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) return;
    
    // When analyzing from the summary page, we want to show the loading overlay
    // This is different from navigation from the dashboard
    fetchSummaryWithOverlay(url);
  };

  // Add a function to store article data in Supabase
  const storeArticleData = useCallback(async (articleData: any) => {
    try {
      if (!articleData || !url) {
        console.log("Not storing article data - missing data or URL", { hasArticleData: !!articleData, url });
        return;
      }
      
      // Extract the necessary data using snake_case for database compatibility
      const dataToStore = {
        url,
        title: articleData.title || articleTitle,
        source: articleSource,
        publish_date: publishDate || null,
        summary: typeof articleData.summary === 'string' ? 
          articleData.summary : 
          (articleData.visualSummary && articleData.visualSummary.length > 0 ? 
            articleData.visualSummary.map((item: any) => item.point).join(' ') : 
            null),
        visual_summary: articleData.visualSummary || [],
        keywords: articleData.keywords || [],
        study_metadata: articleData.cohortAnalysis || null,
        related_research: {
          supporting: relatedResearch.supporting,
          contradictory: relatedResearch.contradictory,
          totalFound: relatedResearch.totalFound,
          searchKeywords: relatedResearch.searchKeywords
        },
        raw_content: articleData.content || articleData.rawContent || null
      };
      
      console.log("Attempting to store article data in database", { 
        url: dataToStore.url,
        title: dataToStore.title,
        source: dataToStore.source,
        hasKeywords: dataToStore.keywords?.length > 0,
        keywordsCount: dataToStore.keywords?.length,
        hasSummary: !!dataToStore.summary,
        hasVisualSummary: dataToStore.visual_summary?.length > 0,
        hasStudyMetadata: !!dataToStore.study_metadata,
        hasRelatedResearch: !!dataToStore.related_research
      });

      // Detailed logging of the actual data structure
      console.log("Summary structure type:", typeof dataToStore.summary);
      console.log("Visual summary structure:", {
        type: typeof dataToStore.visual_summary,
        isArray: Array.isArray(dataToStore.visual_summary),
        length: dataToStore.visual_summary?.length || 0,
        firstItem: dataToStore.visual_summary && dataToStore.visual_summary.length > 0 ? 
          JSON.stringify(dataToStore.visual_summary[0]).substring(0, 100) + '...' : 'N/A'
      });
      console.log("Keywords structure:", {
        type: typeof dataToStore.keywords,
        isArray: Array.isArray(dataToStore.keywords),
        length: dataToStore.keywords?.length || 0,
        firstItem: dataToStore.keywords && dataToStore.keywords.length > 0 ? 
          dataToStore.keywords[0] : 'N/A'
      });
      console.log("Related research structure:", {
        type: typeof dataToStore.related_research,
        isObject: dataToStore.related_research instanceof Object,
        hasSupporting: !!dataToStore.related_research?.supporting,
        supportingLength: dataToStore.related_research?.supporting?.length || 0,
        hasContradictory: !!dataToStore.related_research?.contradictory,
        contradictoryLength: dataToStore.related_research?.contradictory?.length || 0
      });
      
      // Send the data to our API
      console.log("Sending POST request to /api/store-article-summary");
      const response = await fetch('/api/store-article-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToStore),
      });
      
      console.log("Response received from /api/store-article-summary:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      const result = await response.json();
      
      console.log("Complete API response:", result);
      
      if (!response.ok || result.error) {
        console.error("API returned error:", result.error);
        throw new Error(result.error || 'Failed to store article data');
      }
      
      console.log("Article data stored successfully", {
        success: result.success,
        articleSummaryId: result.articleSummaryId,
        hasUserArticle: !!result.userArticle,
      });
    } catch (error) {
      console.error("Error storing article data:", error);
      // Don't show errors to user - we don't want to disrupt the UI
    }
  }, [url, articleTitle, articleSource, publishDate, relatedResearch]);

  // Modify the part where result is set to also store in Supabase
  useEffect(() => {
    // If we have a result and a URL, store the data
    if (result && url && !isLoading) {
      storeArticleData(result);
    }
  }, [result, url, isLoading, storeArticleData]);

  return (
    <div className="container max-w-screen-xl mx-auto py-6 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 mr-4">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Article Summary</h1>
            <p className="text-gray-600">AI-powered insights from scientific research</p>
          </div>
        </div>
        
        {/* Remove the Save Summary button - articles are saved automatically */}
      </div>

      {/* Loading Overlay */}
      <LoadingOverlay 
        isVisible={showLoadingOverlay} 
        currentStep={currentStep}
        completedSteps={completedSteps}
        keywords={extractedKeywords}
      />
      
      <div className="flex justify-between items-start">
        <div>
          {/* Original article title */}
          {!isLoading && (
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {articleTitle || "Article Summary"}
            </h1>
          )}
          
          {/* AI Summary title */}
          {!isLoading && result && (
            <div className="text-blue-700 text-base font-medium">
              AI Summary: <span className="font-normal">{result.title}</span>
            </div>
          )}
        </div>
        
        {/* Action buttons - moved up */}
        {!isLoading && result && (
          <div className="flex space-x-2">
            {/* Removed the Save button since articles are automatically saved */}
            <Button id="share-button" variant="outline" size="sm" className="h-9 px-3 border-gray-200">
              <Share2Icon className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button id="print-button" variant="outline" size="sm" className="h-9 px-3 border-gray-200">
              <PrinterIcon className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button id="export-button" variant="outline" size="sm" className="h-9 px-3 border-gray-200">
              <DownloadIcon className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="space-y-6">
        {/* Rest of the component remains unchanged */}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <div className="bg-white py-8">
              <div className="flex flex-col items-center justify-center space-y-6 px-4">
                <div className="space-y-5 w-full max-w-md">
                  {/* Loading spinner */}
                  <div className="flex items-center justify-center">
                    <div className="w-12 h-12 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
                  </div>
                  <p className="text-center text-gray-600">
                    Loading article summary...
                  </p>
                </div>
                
                <div className="text-sm text-gray-500 text-center mt-4">
                  This may take up to a minute depending on the article length
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error display */}
        {!isLoading && error && (
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <div className="bg-white py-4 px-6">
              <h3 className="text-lg font-medium text-red-600">Error</h3>
            </div>
            <div className="bg-white px-6 py-5">
              <p>{error}</p>
              
              {(error.includes('paywall') || error.includes('403') || error.includes('Forbidden') || error.includes('subscription') || error.includes('access')) && (
                <div className="mt-4 bg-blue-50 p-4 rounded-md border border-blue-200">
                  <h4 className="font-medium text-blue-700 mb-2">Suggestions to access this article:</h4>
                  <ul className="list-disc pl-5 text-gray-700 space-y-2">
                    <li>Try accessing through your institutional library website</li>
                    <li>Search for an open access version on <a href={`https://scholar.google.com/scholar?q=${encodeURIComponent(articleTitle || url)}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Scholar</a></li>
                    <li>Check if available on <a href={`https://www.researchgate.net/search?q=${encodeURIComponent(articleTitle || url)}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">ResearchGate</a></li>
                    <li>Look for a preprint on <a href={`https://www.semanticscholar.org/search?q=${encodeURIComponent(articleTitle || url)}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Semantic Scholar</a></li>
                  </ul>
                </div>
              )}
              
              <div className="mt-4">
                <Button onClick={() => router.push('/dashboard')}>
                  Return to Dashboard
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Results display */}
        {!isLoading && result && (
          <div className="space-y-6">
            {/* Key findings */}
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <div className="bg-white py-4 px-6">
                <h3 className="text-lg font-medium text-blue-900">Key Findings</h3>
                <p className="text-sm text-gray-500">
                  The most important discoveries from this research
                </p>
              </div>
              <div className="bg-white px-6 py-5">
                {renderVisualSummary()}
              </div>
            </div>

            {/* Keywords */}
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <div className="bg-white py-4 px-6">
                <h3 className="text-lg font-medium text-blue-900">Keywords</h3>
                <p className="text-sm text-gray-500">
                  Important topics and terminology from the article
                </p>
              </div>
              <div className="bg-white px-6 py-5">
                {renderKeywords()}
              </div>
            </div>

            {/* Related Research */}
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <div className="bg-white py-4 px-6">
                <h3 className="text-lg font-medium text-blue-900">Related Research</h3>
                <p className="text-sm text-gray-500">
                  Articles with supporting or contradicting findings
                </p>
              </div>
              <div className="bg-white px-6 py-5">
                {renderRelatedResearch()}
              </div>
            </div>

            {/* Cohort Analysis */}
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <div className="bg-white py-4 px-6">
                <h3 className="text-lg font-medium text-blue-900">Cohort Analysis</h3>
                <p className="text-sm text-gray-500">
                  Details about the research participants and study design
                </p>
              </div>
              <div className="bg-white px-6 py-5">
                {renderCohortAnalysis()}
              </div>
            </div>
          </div>
        )}

        {/* Display raw text if there's streamed text but no parsed result */}
        {!isLoading && !result && streamedText && (
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <div className="bg-white py-4 px-6">
              <h3 className="text-lg font-medium text-blue-900">Summary</h3>
              <p className="text-sm text-gray-500">
                {parseError ? "We couldn't parse the AI response as structured data, but you can still read it below" : "Raw summary text"}
              </p>
            </div>
            <div className="bg-white px-6 py-5">
              {parseError && (
                <div className="mb-4 bg-amber-50 text-amber-700 p-4 rounded-md border border-amber-200">
                  <p className="font-medium mb-1">Note:</p>
                  <p>{parseError}</p>
                </div>
              )}
              
              <div className="prose prose-blue max-w-none">
                {streamedText.split('###').map((section, index) => {
                  if (index === 0) return null;
                  
                  const lines = section.trim().split('\n');
                  const heading = lines[0];
                  const content = lines.slice(1).join('\n');
                  
                  return (
                    <div key={index} className="mb-6">
                      <h3 className="text-lg font-medium text-blue-800 mb-2">
                        {heading}
                      </h3>
                      <div className="whitespace-pre-wrap text-gray-700">
                        {content}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 