'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { BookmarkIcon, Share2Icon, DownloadIcon, PrinterIcon, ExternalLinkIcon } from "lucide-react";

export default function SummarizePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);

  // Function to try parsing JSON with error handling
  const tryParseJSON = (text: string) => {
    try {
      // Clean the text for potential stream formatting issues
      let cleanedText = text.trim();
      
      // Find the first { and last } to extract a valid JSON object if embedded in other text
      const firstBrace = cleanedText.indexOf('{');
      const lastBrace = cleanedText.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
      }
      
      console.log("Attempting to parse JSON:", cleanedText.substring(0, 100) + "...");
      return JSON.parse(cleanedText);
    } catch (error) {
      console.error("JSON Parse Error:", error);
      setParseError(`Error parsing result: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  };

  // New function to parse the plain text response
  const parseTextResponse = (text: string) => {
    try {
      const result = {
        title: "",
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
            ageRanges: [] as { range: string; percentage: number }[],
            demographics: [] as { region: string; percentage: number }[]
          },
          notes: [] as string[]
        }
      };
      
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
        
        summaryItems.forEach(item => {
          // Simplified emoji detection
          const match = item.match(/^[-\s•⦁*]*\s*(.)(.+)$/);
          if (match) {
            const possibleEmoji = match[1];
            const pointText = match[2].trim();
            
            // Check if it's an emoji or just a bullet point
            const isEmoji = /\p{Emoji}/u.test(possibleEmoji);
            
            if (isEmoji && pointText) {
              result.visualSummary.push({
                emoji: possibleEmoji,
                point: pointText
              });
            } else {
              // If no emoji found, use a default one
              result.visualSummary.push({
                emoji: "🔍",
                point: item.replace(/^[-\s•⦁*]*/, '').trim()
              });
            }
          }
        });
      }
      
      // Parse keywords
      const keywordsSection = text.match(/### Keywords:\s*([\s\S]*?)(?=###|$)/);
      
      if (keywordsSection && keywordsSection[1]) {
        const keywordsText = keywordsSection[1].trim();
        // Split by commas and clean up
        const keywordsList = keywordsText
          .split(/[,\n]/)
          .map(k => k.replace(/^[-\s•⦁*]*/, '').trim())
          .filter(k => k !== '' && k !== 'N/A' && k !== 'Not applicable' && k !== 'None');
        
        result.keywords = keywordsList;
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
          line.startsWith('Size:')
        );
        if (sizeLine) {
          const sizeText = sizeLine
            .replace('Cohort size:', '')
            .replace('Size:', '')
            .trim();
          
          if (sizeText && sizeText !== 'Not specified' && sizeText !== 'N/A' && sizeText !== 'Not applicable') {
            const numberMatch = sizeText.match(/\d+/);
            if (numberMatch) {
              result.cohortAnalysis.cohortSize = parseInt(numberMatch[0], 10);
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
      
      return result;
    } catch (error) {
      console.error("Error parsing text response:", error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Store the URL in session storage for the article-summary page
      sessionStorage.setItem('articleUrl', url);
      
      // Set the flag to indicate we want to process this URL (not preprocessed)
      sessionStorage.removeItem('articlePreprocessed');
      
      // Redirect to the article-summary page
      router.push(`/article-summary?url=${encodeURIComponent(url)}`);
    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      setIsLoading(false);
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

    return (
      <div className="space-y-3">
        {result.visualSummary.map((item: { emoji: string; point: string }, index: number) => (
          <div key={index} className="flex gap-3 items-start">
            <div className="text-2xl">{item.emoji}</div>
            <div className="flex-1">{item.point}</div>
          </div>
        ))}
      </div>
    );
  };

  // Render the keywords as badge components
  const renderKeywords = () => {
    if (!result?.keywords || result.keywords.length === 0) {
      return <div className="text-gray-500 italic">No keywords available</div>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {result.keywords.map((keyword: string, index: number) => (
          <Badge key={index} variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100">
            {keyword}
          </Badge>
        ))}
      </div>
    );
  };

  // Render the cohort analysis section
  const renderCohortAnalysis = () => {
    if (!result?.cohortAnalysis) {
      return <div className="text-gray-500 italic">No cohort analysis available</div>;
    }

    const {
      studyType,
      duration,
      dateRange,
      cohortSize,
      cohortStratification,
      notes
    } = result.cohortAnalysis;

    return (
      <div className="space-y-4">
        {studyType && (
          <div>
            <h4 className="font-medium text-gray-700">Study Type</h4>
            <p>{studyType}</p>
          </div>
        )}
        
        {dateRange && (
          <div>
            <h4 className="font-medium text-gray-700">Date Range</h4>
            <p>{dateRange}</p>
          </div>
        )}
        
        {cohortSize > 0 && (
          <div>
            <h4 className="font-medium text-gray-700">Cohort Size</h4>
            <p>{cohortSize} participants</p>
          </div>
        )}
        
        {duration && (
          <div>
            <h4 className="font-medium text-gray-700">Study Duration</h4>
            <p>{duration}</p>
          </div>
        )}
        
        {cohortStratification?.ageRanges && cohortStratification.ageRanges.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-700">Age Distribution</h4>
            <div className="space-y-2">
              {cohortStratification.ageRanges.map((age: { range: string; percentage: number }, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-24">{age.range}</div>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full" 
                      style={{ width: `${age.percentage}%` }}
                    ></div>
                  </div>
                  <div className="w-12 text-right">{age.percentage}%</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {cohortStratification?.demographics && cohortStratification.demographics.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-700">Geographic Distribution</h4>
            <div className="space-y-2">
              {cohortStratification.demographics.map((demo: { region: string; percentage: number }, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-24">{demo.region}</div>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full" 
                      style={{ width: `${demo.percentage}%` }}
                    ></div>
                  </div>
                  <div className="w-12 text-right">{demo.percentage}%</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {notes && notes.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-700">Notes</h4>
            <ul className="list-disc list-inside space-y-1">
              {notes.map((note: string, index: number) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Article Summarizer</h1>
        <p className="text-gray-600 mt-1">Generate AI-powered summaries of research articles</p>
      </div>
      
      {/* Content area */}
      <div className="space-y-6">
        {/* Summarize form area */}
        <Card className="shadow-sm w-full">
          <CardHeader className="border-b bg-white">
            <CardTitle>Summarize Research Article</CardTitle>
            <CardDescription>
              Enter the URL of a research article to generate an AI-powered summary
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 bg-white">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter article URL (e.g., https://pubmed.ncbi.nlm.nih.gov/...)"
                  required
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button type="submit" disabled={isLoading || !url} className="w-full sm:w-auto">
                  {isLoading ? "Summarizing..." : "Summarize Article"}
                </Button>
              </div>
              
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md border border-red-200">
                  {error}
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Processing indicator */}
        {isProcessing && !result && (
          <Card className="w-full">
            <CardContent className="py-10 bg-white">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
                <p className="text-gray-500 text-center">Analyzing and summarizing the article...</p>
                <p className="text-sm text-gray-400 text-center">This may take up to a minute depending on the article length</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results display */}
        {result && (
          <div className="space-y-6">
            {/* Article info */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm w-full">
              <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-blue-600">AI Summary:</div>
                  <h1 className="text-2xl font-bold text-gray-900">{result.title}</h1>
                </div>
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                  <Button variant="outline" size="sm">
                    <BookmarkIcon className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share2Icon className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button variant="outline" size="sm">
                    <PrinterIcon className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                  <Button variant="outline" size="sm">
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </div>

            {/* Key findings */}
            <Card className="w-full">
              <CardHeader className="border-b bg-white">
                <CardTitle>Key Findings</CardTitle>
                <CardDescription>
                  The most important points from this research
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 bg-white">
                {renderVisualSummary()}
              </CardContent>
            </Card>

            {/* Keywords */}
            <Card className="w-full">
              <CardHeader className="border-b bg-white">
                <CardTitle>Keywords</CardTitle>
                <CardDescription>
                  Important topics and terminology from the article
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 bg-white">
                {renderKeywords()}
              </CardContent>
            </Card>

            {/* Cohort Analysis */}
            <Card className="w-full">
              <CardHeader className="border-b bg-white">
                <CardTitle>Cohort Analysis</CardTitle>
                <CardDescription>
                  Details about the research participants and study design
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 bg-white">
                {renderCohortAnalysis()}
              </CardContent>
            </Card>

            {/* Source link */}
            <div className="flex justify-end w-full">
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
              >
                View original article <ExternalLinkIcon className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}

        {/* Display raw text if there's streamed text but no parsed result */}
        {!result && streamedText && (
          <Card className="w-full">
            <CardHeader className="border-b bg-white">
              <CardTitle>Summary</CardTitle>
              <CardDescription>
                Raw summary text (parsing failed)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 bg-white">
              <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-md border border-gray-200">
                {streamedText}
              </pre>
              
              {parseError && (
                <div className="mt-4 bg-red-50 text-red-600 p-3 rounded-md border border-red-200">
                  {parseError}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
} 