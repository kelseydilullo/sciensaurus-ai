"use client";

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LucideAlertCircle, LucideArrowRight, LucideLoader2, LucideSearch, CheckCircle2 } from "lucide-react";

export interface ArticleAnalyzerProps {
  initialUrl?: string;
  previewMode?: boolean;
  transparent?: boolean;
  onAnalysisComplete?: (url: string, data: any) => void;
  resetUrlInputRef?: React.MutableRefObject<() => void>;
}

// The exact same LoadingOverlay as in dashboard
const EnhancedLoadingOverlay = ({ 
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
      <div className="bg-white rounded-lg shadow-md max-w-md w-full mx-4 p-6">
        <div className="space-y-4 py-6 px-6">
          {steps.map((step, index) => {
            // Only show steps that are in progress or completed
            const shouldShow = steps.indexOf(currentStep) >= index || completedSteps.includes(step);
            if (!shouldShow) return null;

            const isCompleted = completedSteps.includes(step);
            const isCurrent = currentStep === step;

            if (isCompleted) {
              return (
                <div key={step} className="flex items-center gap-4 justify-start">
                  <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                  <p className="text-gray-600">{stepLabels[step]}</p>
                </div>
              );
            }

            if (isCurrent) {
              return (
                <div key={step} className="flex items-center gap-4 justify-start">
                  <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin flex-shrink-0"></div>
                  <p className="text-gray-900 font-medium">{stepLabels[step]}</p>
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>
    </div>
  );
};

export function ArticleAnalyzer({ 
  initialUrl = '', 
  previewMode = false, 
  transparent = false,
  onAnalysisComplete,
  resetUrlInputRef
}: ArticleAnalyzerProps) {
  const router = useRouter();
  const [url, setUrl] = useState<string>(initialUrl);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<string>('retrievingContent');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  
  // Set up reset function in ref if provided
  useEffect(() => {
    if (resetUrlInputRef) {
      resetUrlInputRef.current = handleReset;
    }
  }, [resetUrlInputRef]);

  // Helper function to extract visual summary from text
  const extractVisualSummaryFromText = (text: string): any[] => {
    const visualSummary = [];
    const visualSummarySection = text.match(/### Visual Summary:\s*([\s\S]*?)(?=###|$)/);
    
    if (visualSummarySection && visualSummarySection[1]) {
      const points = visualSummarySection[1].trim().split('\n').filter(line => line.trim() !== '');
      
      for (const point of points) {
        const emojiMatch = point.match(/^([\p{Emoji}])\s+(.*)/u);
        if (emojiMatch) {
          visualSummary.push({
            emoji: emojiMatch[1],
            point: emojiMatch[2]
          });
        } else {
          // Fallback if no emoji found
          visualSummary.push({
            emoji: "📝",
            point: point
          });
        }
      }
    }
    
    return visualSummary;
  };

  // Helper function to extract keywords from text
  const extractKeywordsFromText = (text: string): string[] => {
    const keywordsSection = text.match(/### Keywords:\s*([\s\S]*?)(?=###|$)/i);
    if (keywordsSection && keywordsSection[1]) {
      return keywordsSection[1]
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);
    }
    return [];
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url) {
      setError('Please enter a URL');
      return;
    }
    
    // Add protocol if missing
    let processedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      processedUrl = 'https://' + url;
      setUrl(processedUrl);
    }
    
    // Reset states
    setIsLoading(true);
    setCurrentStep('retrievingContent');
    setCompletedSteps([]);
    setError(null);
    setKeywords([]);
    
    try {
      // Use the same endpoint regardless of preview mode
      const endpoint = '/api/summarize-article';
      
      // Make a single request to the summarize-article endpoint
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: processedUrl }),
      });
      
      // Mark retrievingContent as completed and move to generating summary
      setCompletedSteps(prev => [...prev, 'retrievingContent']);
      setCurrentStep("generatingSummary");
      
      if (!response.ok) {
        if (response.headers.get('Content-Type')?.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to analyze article');
        } else {
          throw new Error(`Failed to analyze article: ${response.statusText}`);
        }
      }
      
      // Get the response as text
      const responseText = await response.text();
      console.log(`Received article analysis response, length: ${responseText.length} characters`);
      
      // Mark generatingSummary as completed and move to extracting keywords
      setCompletedSteps(prev => [...prev, 'generatingSummary']);
      setCurrentStep("extractingKeywords");
      
      // Extract useful data from the text response
      let processedResult: any = {
        title: '',
        summary: responseText,
        keywords: [],
        visual_summary: [],
        content: responseText,
        study_metadata: {},
        cohortAnalysis: {},
        relatedResearch: {
          supporting: [],
          contradictory: [],
          totalFound: 0,
          searchKeywords: []
        }
      };
      
      // Extract title
      const titleMatch = responseText.match(/### Summarized Title:\s*([\s\S]*?)(?=###|$)/);
      if (titleMatch && titleMatch[1]) {
        processedResult.title = titleMatch[1].trim();
      }
      
      // Extract original title if available
      const originalTitleMatch = responseText.match(/### Original Article Title:\s*([\s\S]*?)(?=###|$)/);
      if (originalTitleMatch && originalTitleMatch[1]) {
        processedResult.originalTitle = originalTitleMatch[1].trim();
        
        // Prefer original title if available
        if (processedResult.originalTitle) {
          processedResult.title = processedResult.originalTitle;
        }
      }
      
      // Extract visual summary
      processedResult.visual_summary = extractVisualSummaryFromText(responseText);
      
      // Extract keywords
      processedResult.keywords = extractKeywordsFromText(responseText);
      setKeywords(processedResult.keywords || []);
      
      // Mark extractingKeywords as completed and move to searching similar articles
      setCompletedSteps(prev => [...prev, 'extractingKeywords']);
      setCurrentStep("searchingSimilarArticles");
      
      // Extract cohort analysis / study metadata
      const cohortAnalysisMatch = responseText.match(/### Cohort Analysis:\s*([\s\S]*?)(?=###|$)/);
      if (cohortAnalysisMatch && cohortAnalysisMatch[1]) {
        const cohortText = cohortAnalysisMatch[1].trim();
        
        // Create a study metadata object
        const studyMetadata: any = {};
        
        // Extract study type
        const studyTypeMatch = cohortText.match(/Type of study:\s*([^\n]+)/);
        if (studyTypeMatch && studyTypeMatch[1]) {
          studyMetadata.studyType = studyTypeMatch[1].trim();
        }
        
        // Extract duration
        const durationMatch = cohortText.match(/Duration:\s*([^\n]+)/);
        if (durationMatch && durationMatch[1] && !durationMatch[1].includes('Not specified')) {
          studyMetadata.duration = durationMatch[1].trim();
        }
        
        // Extract cohort size
        const cohortSizeMatch = cohortText.match(/Cohort size:\s*(\d+)/);
        if (cohortSizeMatch && cohortSizeMatch[1]) {
          studyMetadata.cohortSize = parseInt(cohortSizeMatch[1], 10);
        }
        
        // Extract notes if available
        const notesSection = cohortText.match(/Notes:\s*([\s\S]*?)(?=$)/);
        if (notesSection && notesSection[1]) {
          const noteLines = notesSection[1].split('\n')
            .map(line => line.trim())
            .filter(line => line.startsWith('-'))
            .map(line => line.substring(1).trim())
            .filter(line => line.length > 0);
          
          if (noteLines.length > 0) {
            studyMetadata.notes = noteLines;
          }
        }
        
        processedResult.study_metadata = studyMetadata;
        processedResult.cohortAnalysis = studyMetadata;
      }
      
      // If visual summary is empty, create a default one
      if (!processedResult.visual_summary || processedResult.visual_summary.length === 0) {
        processedResult.visual_summary = [{
          emoji: "📝",
          point: "This article has been processed by Sciensaurus AI."
        }];
      }
      
      // If keywords are empty, extract from text
      if (!processedResult.keywords || processedResult.keywords.length === 0) {
        // Use the extractKeywordsFromText function we already have
        const extractedKeywords = extractKeywordsFromText(responseText);
        if (extractedKeywords.length > 0) {
          processedResult.keywords = extractedKeywords;
        } else {
          // Fallback to simple word frequency extraction
          const words = responseText.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
          const wordCounts: Record<string, number> = {};
          const commonWords = ['this', 'that', 'these', 'those', 'with', 'from', 'have', 'were', 'what', 'when', 'where'];
          
          for (const word of words) {
            if (!commonWords.includes(word)) {
              wordCounts[word] = (wordCounts[word] || 0) + 1;
            }
          }
          
          processedResult.keywords = Object.entries(wordCounts)
            .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
            .slice(0, 5)
            .map(([word]) => word);
        }
      }
      
      console.log("Processed result:", {
        title: processedResult.title,
        originalTitle: processedResult.originalTitle,
        visualSummaryCount: processedResult.visual_summary ? processedResult.visual_summary.length : 0,
        keywordsCount: processedResult.keywords ? processedResult.keywords.length : 0,
        hasStudyMetadata: !!processedResult.study_metadata && Object.keys(processedResult.study_metadata).length > 0
      });
      
      // Mark searchingSimilarArticles as completed and move to final step
      setCompletedSteps(prev => [...prev, 'searchingSimilarArticles']);
      setCurrentStep("assessingResearch");
      
      // Add a small delay before completing to show the final step
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mark all steps as completed
      setCompletedSteps(['retrievingContent', 'generatingSummary', 'extractingKeywords', 'searchingSimilarArticles', 'assessingResearch']);
      
      // Call onAnalysisComplete if provided
      if (onAnalysisComplete) {
        onAnalysisComplete(processedUrl, processedResult);
      } else {
        // Otherwise redirect
        if (previewMode) {
          router.push(`/preview?url=${encodeURIComponent(processedUrl)}`);
        } else {
          router.push(`/summary?url=${encodeURIComponent(processedUrl)}`);
        }
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Reset the form and error state
  const handleReset = () => {
    setUrl('');
    setError(null);
    setIsLoading(false);
    setCurrentStep('retrievingContent');
    setCompletedSteps([]);
    setKeywords([]);
  };
  
  return (
    <div className={`w-full ${transparent ? 'bg-transparent border-0 shadow-none' : 'bg-white rounded-lg shadow-sm p-6 border border-gray-200'}`}>
      {isLoading && (
        <EnhancedLoadingOverlay
          isVisible={isLoading}
          currentStep={currentStep}
          completedSteps={completedSteps}
          keywords={keywords}
        />
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          {!transparent && (
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
              Article URL
            </label>
          )}
          <div className="relative flex w-full">
            <div className="relative flex-grow">
              <LucideSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 z-10" />
              <Input
                id="url"
                type="text"
                placeholder="Paste article URL here"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className={`pl-10 ${transparent ? 'h-12 text-black rounded-l-md rounded-r-none focus-visible:ring-0 focus-visible:ring-transparent border border-gray-300 border-r-0 w-full text-sm' : 'py-2'}`}
                disabled={isLoading}
              />
            </div>
            <Button 
              type="submit" 
              className="h-12 bg-blue-500 hover:bg-blue-600 px-5 rounded-l-none rounded-r-md flex items-center justify-center whitespace-nowrap"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <LucideLoader2 className="h-4 w-4 animate-spin mr-1.5" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <span>Analyze</span>
                  <LucideArrowRight className="ml-1.5 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
          {!transparent && (
            <p className="mt-1 text-xs text-gray-500">
              Works best with scientific articles, research papers, and academic journals
            </p>
          )}
        </div>
        
        {error && (
          <Alert variant="destructive">
            <LucideAlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex space-x-2 hidden">
          {!transparent && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleReset}
              disabled={isLoading || !url}
            >
              Reset
            </Button>
          )}
        </div>
        
        {previewMode && !transparent && (
          <div className="mt-4 bg-blue-50 rounded-md p-4 text-sm text-blue-800">
            <p className="font-medium">Preview Mode</p>
            <p>Some features will be limited. Create an account to unlock full functionality.</p>
          </div>
        )}
      </form>
    </div>
  );
} 