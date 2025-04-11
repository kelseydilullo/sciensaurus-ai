'use client';

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation"; // Keep useSearchParams
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LucideClipboardCopy, LucideCheck, LucideChevronRight, ArrowLeft, CheckCircle2 } from "lucide-react"; 
import { 
  ResponsiveContainer,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
} from 'recharts';
import { useAuth } from "@/contexts/auth-context"; // Keep useAuth

// --- Ensure ArticleSummary interface is defined --- 
interface ArticleSummary {
  id?: string;
  url: string;
  title: string;
  summarized_title?: string;
  source?: string;
  publish_date?: string;
  summary?: string;
  visual_summary?: Array<{emoji: string; point: string}>;
  visualSummary?: Array<{emoji: string; point: string}>; // Alias often used
  keywords?: string[];
  study_metadata?: any; // Represents the parsed cohort analysis
  related_research?: any; // Represents related research data
  created_at?: string;
  updated_at?: string;
  is_bookmarked?: boolean;
  view_count?: number;
  originalArticleTitle?: string;
  originalTitle?: string;
}

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
    "complete"
  ];

  const stepLabels: Record<string, string> = {
    retrievingContent: "Retrieving article content...",
    generatingSummary: "Generating summary...",
    extractingKeywords: "Extracting relevant keywords...",
    searchingSimilarArticles: "Finding and classifying related research...",
    complete: "Analysis complete!"
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
                  <LucideCheck className="h-6 w-6 text-green-500 flex-shrink-0" />
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

export const dynamic = 'force-dynamic'; // Add dynamic export

// Original component function - DO NOT RENAME
function ArticleSummaryPageContent() {
  const searchParams = useSearchParams();
  const { session } = useAuth(); 
  
  // State variables
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ArticleSummary | null>(null);
  const [streamedText, setStreamedText] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [articleTitle, setArticleTitle] = useState<string>('');
  const [articleSource, setArticleSource] = useState<string>('');
  const [publishDate /*, setPublishDate */] = useState<string>(""); 
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>("retrievingContent");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [extractedKeywords, setExtractedKeywords] = useState<string[]>([]);
  const [relatedResearch, setRelatedResearch] = useState<{
    supporting: any[];
    contradictory: any[];
    neutral: any[];
    totalFound: number;
    searchKeywords: string[];
    error?: string;
  }>({
    supporting: [],
    contradictory: [],
    neutral: [],
    totalFound: 0,
    searchKeywords: []
  });

  // Helper function definitions moved *before* useEffect
  
  const updateLoadingStep = useCallback((step: string, isComplete: boolean = false) => {
    if (isComplete) {
      setCompletedSteps(prev => {
        if (prev.includes(step)) { return prev; }
        return [...prev, step];
      });
      const steps = ["retrievingContent", "generatingSummary", "extractingKeywords", "searchingSimilarArticles", "complete"];
      const currentIndex = steps.indexOf(step);
      if (currentIndex < steps.length - 1) {
        setCurrentStep(steps[currentIndex + 1]);
      } else {
        setTimeout(() => { setShowLoadingOverlay(false); }, 1000); 
      }
    } else {
      setCurrentStep(prevStep => {
        // Avoid reverting to a previous step if already moved forward
        const steps = ["retrievingContent", "generatingSummary", "extractingKeywords", "searchingSimilarArticles", "complete"];
        if (steps.indexOf(prevStep) > steps.indexOf(step)) {
            return prevStep;
        }
        return step;
      });
    }
  }, []); // Dependencies remain empty or specific non-state variables if needed

  const parseTextResponse = (text: string) => {
    // ... implementation of parseTextResponse ...
    // (Assuming this function exists based on previous comments)
    // Example placeholder:
    try {
        const parsedData = JSON.parse(text);
        return parsedData;
    } catch (e) {
        console.error("Failed to parse text response:", e);
        setParseError("Failed to parse the summary data.");
        return null;
    }
  };
  
  const fetchSummaryWithOverlay = useCallback(async (articleUrl: string) => {
    console.log("fetchSummaryWithOverlay called for:", articleUrl);
    setShowLoadingOverlay(true);
    setCurrentStep("retrievingContent");
    setCompletedSteps([]);
    setError(null);
    setParseError(null);
    setStreamedText(''); // Clear previous streamed text
    setResult(null); // Clear previous result
    setLoading(true);

    try {
        const response = await fetch(`/api/summarize?url=${encodeURIComponent(articleUrl)}`, {
            method: 'POST',
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("API Error Response:", errorText);
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        if (!response.body) {
            throw new Error("Response body is null");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = '';
        let fullSummaryData: Partial<ArticleSummary> = {}; // Store parsed data chunks

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            accumulatedText += chunk;

             // Check for step updates within the stream
             if (accumulatedText.includes('\"step\":')) {
                // Find the last complete JSON object potentially containing a step update
                try {
                    const lastCompleteJsonMatch = accumulatedText.match(/(\{[\s\S]*?\})(?!.*\{)/g);
                    if (lastCompleteJsonMatch) {
                         const lastObject = JSON.parse(lastCompleteJsonMatch[lastCompleteJsonMatch.length - 1]);
                         if (lastObject.step) {
                             console.log("Step update received:", lastObject.step);
                             updateLoadingStep(lastObject.step, lastObject.completed ?? false);
                         }
                         if (lastObject.keywords) {
                             console.log("Keywords received:", lastObject.keywords);
                             setExtractedKeywords(lastObject.keywords);
                         }
                         // Merge non-step/keyword data into the main summary object
                         const { step, completed, keywords, ...dataChunk } = lastObject;
                          if (Object.keys(dataChunk).length > 0) {
                              fullSummaryData = { ...fullSummaryData, ...dataChunk };
                          }
                    }
                } catch (e) {
                   // Ignore parsing errors during streaming if it's partial JSON
                   // console.warn("Partial JSON encountered during streaming step check:", e);
                }
            }

            // Update streamed text for visual feedback (optional, could just parse at the end)
            // setStreamedText(accumulatedText); // Less reliable than parsing at the end
        }

         // Ensure the final step is marked complete
         updateLoadingStep('complete', true);

        // Parse the complete accumulated text at the end
        try {
             // Try parsing the whole thing as a single JSON object first
             let finalData: ArticleSummary;
             try {
                  finalData = JSON.parse(accumulatedText) as ArticleSummary;
             } catch (finalParseError) {
                 console.warn("Final accumulated text wasn't a single JSON object, attempting merge:", finalParseError);
                 // If parsing the whole thing fails, use the merged object (assuming chunks were valid)
                 // Ensure required fields have defaults if missing after merge
                 finalData = {
                     url: articleUrl,
                     title: fullSummaryData.title || 'Title not found', // Provide default
                     ...fullSummaryData, // Spread merged data
                 } as ArticleSummary; // Assert type carefully

                 if (!finalData.summary && !finalData.visual_summary) {
                    console.error("Final merged data is incomplete:", finalData);
                    throw new Error("Failed to obtain complete summary data from the stream.");
                 }
             }


            console.log("Final Summary Data Parsed:", finalData);
            setResult(finalData);
            if (finalData.title) setArticleTitle(finalData.title);
            if (finalData.source) setArticleSource(finalData.source);
             if (finalData.keywords) setExtractedKeywords(finalData.keywords);
            // Trigger related research fetch *after* summary is complete and keywords are potentially available
             if (finalData.keywords && finalData.keywords.length > 0) {
                 fetchRelatedResearch(articleUrl, finalData.keywords);
             } else {
                console.warn("No keywords found in final data, skipping related research fetch.");
             }

        } catch (e) {
            console.error("Error parsing final summary JSON:", e, "\nRaw Text:", accumulatedText);
            setError("Failed to parse the final summary data.");
        }

    } catch (err: any) {
        console.error("Error fetching or processing summary:", err);
        setError(err.message || 'An unexpected error occurred while summarizing the article.');
         updateLoadingStep('complete', true); // Mark as complete even on error to hide overlay
         setTimeout(() => { setShowLoadingOverlay(false); }, 1000); // Ensure overlay hides on error
    } finally {
        setLoading(false);
        // setShowLoadingOverlay(false); // Overlay is hidden via setTimeout in updateLoadingStep('complete')
    }
  }, [updateLoadingStep]); // Add dependencies like updateLoadingStep

 const fetchRelatedResearch = useCallback(async (originalUrl: string, keywords: string[]) => {
    console.log("fetchRelatedResearch called with keywords:", keywords);
    updateLoadingStep("searchingSimilarArticles"); // Update step for UI

    try {
      const response = await fetch(`/api/related-research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original_article_url: originalUrl, keywords }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error fetching related research:", errorText);
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Related research data received:", data);

      setRelatedResearch({
         supporting: data.supporting || [],
         contradictory: data.contradictory || [],
         neutral: data.neutral || [],
         totalFound: data.totalFound || 0,
         searchKeywords: data.searchKeywords || keywords, // Use returned keywords if available
         error: data.error // Capture potential errors reported by the API
      });
      updateLoadingStep("searchingSimilarArticles", true); // Mark step as complete

    } catch (err: any) {
      console.error("Error fetching related research:", err);
      // Update state to show error within the component
      setRelatedResearch(prev => ({
          ...prev,
          error: err.message || 'Failed to fetch related research.',
          supporting: [],
          contradictory: [],
          neutral: []
      }));
      updateLoadingStep("searchingSimilarArticles", true); // Still mark step as complete to move on
    }
  }, [updateLoadingStep]);


  // useEffect hook - Now defined *after* helper functions
  useEffect(() => {
    const storedUrl = typeof window !== 'undefined' ? sessionStorage.getItem('articleUrl') : null;
    const isPreprocessed = typeof window !== 'undefined' && sessionStorage.getItem('articlePreprocessed') === 'true';
    const articleUrl = url || searchParams?.get('url') || storedUrl || ''; 
    setUrl(articleUrl);

    if (articleUrl && !result && !streamedText && !loading) { // Add !loading check to prevent re-fetch during fetch
      console.log("useEffect trigger: Processing article URL:", articleUrl, "isPreprocessed:", isPreprocessed);
      setLoading(true); // Set loading true before async operations start
      setError(null); // Clear previous errors
      setResult(null); // Clear previous results
      setExtractedKeywords([]); // Clear keywords
      setRelatedResearch({ supporting: [], contradictory: [], neutral: [], totalFound: 0, searchKeywords: [], error: undefined }); // Clear related

      if (!isPreprocessed) {
        fetch(`/api/get-article-summary?url=${encodeURIComponent(articleUrl)}`)
          .then(async response => { // Make callback async to await text() on error
            if (response.ok) { return response.json(); }
            const errorText = await response.text();
            console.log("Article not found in DB response:", response.status, errorText);
            throw new Error(`Article not found in database (status: ${response.status})`);
          })
          .then(data => {
            if (data.found && data.articleSummary) {
              console.log("Found article in database, using stored data:", data.articleSummary);
              setResult(data.articleSummary);
              if (data.articleSummary.title) { setArticleTitle(data.articleSummary.title); }
              if (data.articleSummary.source) { setArticleSource(data.articleSummary.source); }
              if (data.articleSummary.keywords && data.articleSummary.keywords.length > 0) {
                setExtractedKeywords(data.articleSummary.keywords);
              }
              // Use optional chaining for safety
              const related = data.articleSummary.related_research;
              setRelatedResearch({
                supporting: related?.supporting || [],
                contradictory: related?.contradictory || [],
                neutral: related?.neutral || [],
                totalFound: related?.totalFound || 0,
                searchKeywords: related?.searchKeywords || []
              });
              setLoading(false); // Loading finished
            } else {
              // This case shouldn't be reached if response wasn't ok, but handle defensively
              console.log("Article lookup returned 'found: false' or missing articleSummary");
              throw new Error('Article not found in database');
            }
          })
          .catch(error => {
             // Only fetch summary if it's a 'not found' error, otherwise show DB error
             if (error.message.includes('Article not found')) {
                console.log("Article not in DB, fetching from source:", articleUrl);
                fetchSummaryWithOverlay(articleUrl); // Fetch if not in DB
             } else {
                 console.error("Error checking database:", error);
                 setError(`Error checking database: ${error.message}`);
                 setLoading(false); // Stop loading on DB check error
             }
          });
      } else {
        // If preprocessed, fetch the summary directly
        console.log("Preprocessed article, fetching summary...", articleUrl);
        fetchSummaryWithOverlay(articleUrl);
        // Remove the flag after use
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('articlePreprocessed');
        }
      }
    } else if (!articleUrl && !loading) {
        // Handle case where there's no URL provided
        console.log("useEffect trigger: No URL provided.");
        setLoading(false); // Not loading if no URL
        setError("No article URL provided. Please enter a URL above.");
    } else {
       // Log why the fetch isn't happening
       console.log("useEffect trigger: Conditions not met for fetch.", { hasUrl: !!articleUrl, hasResult: !!result, hasStreamedText: !!streamedText, isLoading: loading });
       // If loading is already true, don't set it to false here unless URL disappears
       if (!articleUrl && loading) {
           setLoading(false);
       }
    }
    // Add loading to dependencies to re-evaluate when loading finishes
  }, [searchParams, url, result, streamedText, updateLoadingStep, fetchSummaryWithOverlay, fetchRelatedResearch, loading]); 


  // Placeholder for other function definitions that might exist
  // (renderVisualSummary, renderKeywords, renderCohortAnalysis, manuallyFetchRelatedResearch, renderRelatedResearch, handleAnalyzeSubmit)
  // These should ideally also be defined before the return statement, potentially using useCallback if they depend on state/props.

  // Return the main JSX for the page content
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header, Loading Overlay, and main content structure */} 
      {/* ... (Keep the existing JSX structure from the original component) ... */}
      <main className="flex-grow container mx-auto px-4 py-8">
         {/* Loading overlay */} 
         <LoadingOverlay 
           isVisible={showLoadingOverlay} 
           currentStep={currentStep} 
           completedSteps={completedSteps}
           keywords={extractedKeywords}
         />

         {/* Back button */} 
         <div className="mb-4">
           <Link href="/dashboard">
             <Button variant="ghost" className="text-gray-600">
               <ArrowLeft className="mr-2 h-4 w-4" />
               Back to Dashboard
             </Button>
           </Link>
         </div>

         {/* Error message */} 
         {error && (
           <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
             <strong className="font-bold">Error:</strong>
             <span className="block sm:inline"> {error}</span>
           </div>
         )}

         {/* Parse error message */} 
         {parseError && (
           <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-6" role="alert">
             <strong className="font-bold">Parsing Issue:</strong>
             <span className="block sm:inline"> {parseError}</span>
             <p className="text-sm mt-2">Displaying raw text content below.</p>
           </div>
         )}

         {/* Main content area */} 
         {loading && !error && !parseError && (
           <div className="text-center py-10">
             <p>Loading article summary...</p>
           </div>
         )}

         {!loading && (result || streamedText) && (
           <div className="bg-white p-6 shadow-md rounded-lg space-y-6">
             <h1 className="text-2xl font-bold text-gray-800">{result?.title || articleTitle || 'Article Summary'}</h1>
             
             <div className="flex items-center space-x-4 text-sm text-gray-500">
               <span>Source: {result?.source || articleSource || 'N/A'}</span>
               <span>Published: {result?.publish_date || publishDate || 'N/A'}</span>
               <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                 Original Article <LucideChevronRight className="inline h-4 w-4" />
               </a>
             </div>

             {/* Render different sections */} 
             {/* {renderVisualSummary()} 
             {renderKeywords()} 
             {renderCohortAnalysis()} 
             {renderRelatedResearch()} */} 

             {/* Display raw text if parsing failed */} 
             {parseError && streamedText && (
               <div>
                 <h2 className="text-xl font-semibold mb-2">Raw Content</h2>
                 <pre className="whitespace-pre-wrap bg-gray-100 p-4 rounded text-sm">{streamedText}</pre>
               </div>
             )}
           </div>
         )}
       </main>
    </div>
  );
}

// --- Wrapper Component ---
export default function ArticleSummaryPage() {
  return (
    <Suspense fallback={<div>Loading search parameters...</div>}>
      <ArticleSummaryPageContent />
    </Suspense>
  );
} 