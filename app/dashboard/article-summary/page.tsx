'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookmarkIcon, Share2Icon, DownloadIcon, PrinterIcon, ExternalLinkIcon, ArrowLeft } from "lucide-react";
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

export default function ArticleSummaryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Add a timestamp to force re-rendering
  const cacheInvalidator = Date.now();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [streamedText, setStreamedText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [articleTitle, setArticleTitle] = useState("");
  const [articleSource, setArticleSource] = useState("");
  const [publishDate, setPublishDate] = useState("");
  const [activeGenderIndex, setActiveGenderIndex] = useState<number | undefined>(undefined);
  
  // Add state for storing related research results
  const [relatedResearch, setRelatedResearch] = useState<{
    supporting: Array<{title: string, url: string, abstract?: string, finding?: string}>;
    contradictory: Array<{title: string, url: string, abstract?: string, finding?: string}>;
    totalFound?: number;
    error?: string;
    searchKeywords?: string[];
  }>({
    supporting: [],
    contradictory: [],
    totalFound: 0
  });
  
  // Loading state indicators moved to component level
  const [loadingSteps, setLoadingSteps] = useState({
    gettingContent: { status: 'loading' as 'loading' | 'done' | 'error' | 'waiting', done: false },
    alternativeSource: { status: 'waiting' as 'loading' | 'done' | 'error' | 'waiting', done: false, hidden: true },
    summarizing: { status: 'waiting' as 'loading' | 'done' | 'error' | 'waiting', done: false },
    generating: { status: 'waiting' as 'loading' | 'done' | 'error' | 'waiting', done: false },
    searchingSimilar: { status: 'waiting' as 'loading' | 'done' | 'error' | 'waiting', done: false }
  });

  // Helper function to update loading step status
  const updateLoadingStep = useCallback((step: string, status: 'loading' | 'done' | 'error' | 'waiting', done: boolean = false, hidden: boolean = false) => {
    setLoadingSteps(prev => ({
      ...prev,
      [step]: { ...prev[step as keyof typeof prev], status, done, hidden }
    }));
  }, []);

  useEffect(() => {
    console.log("ArticleSummaryPage rendered with cache key:", cacheInvalidator);
    // Get URL from query parameters or session storage
    const urlParam = searchParams.get('url');
    const storedUrl = typeof window !== 'undefined' ? sessionStorage.getItem('articleUrl') : null;
    const articleUrl = urlParam || storedUrl || "";
    
    setUrl(articleUrl);
    
    if (articleUrl) {
      fetchSummary(articleUrl);
    } else {
      setIsLoading(false);
      setError("No article URL provided");
    }
  }, [searchParams]);

  const fetchSummary = async (articleUrl: string) => {
    setIsLoading(true);
    setResult(null);
    setStreamedText('');
    setError(null);
    
    // Reset loading steps
    setLoadingSteps({
      gettingContent: { status: 'loading', done: false },
      alternativeSource: { status: 'waiting', done: false, hidden: true },
      summarizing: { status: 'waiting', done: false },
      generating: { status: 'waiting', done: false },
      searchingSimilar: { status: 'waiting', done: false }
    });
    
    // Reset related research
    setRelatedResearch({
      supporting: [],
      contradictory: [],
      totalFound: 0,
      searchKeywords: []
    });
    
    try {
      // Set a default fallback title
      let fallbackTitle = "Original Article";
      
      // Extract domain/title from URL to display while loading
      try {
        const url = new URL(articleUrl);
        const domain = url.hostname.replace('www.', '');
        fallbackTitle = "Article from " + domain;
        
        // Special handling for common scientific article repositories
        // Extract article ID for PubMed Central articles
        if (domain.includes('ncbi.nlm.nih.gov') && url.pathname.includes('articles')) {
          const pmcMatch = url.pathname.match(/PMC(\d+)/i);
          if (pmcMatch) {
            fallbackTitle = `PMC Article ${pmcMatch[1]}`;
            
            // We'll get the article title from our API response instead of direct fetch
            // which would cause CORS issues
          }
        }
        
        // Set a temporary title based on the URL while loading
        const pathParts = url.pathname.split('/').filter(Boolean);
        
        // Try to extract a title from the URL path
        if (pathParts.length > 0 && fallbackTitle.startsWith('Article from')) {
          const lastPathPart = pathParts[pathParts.length - 1]
            .replace(/[-_]/g, ' ')     // Replace dashes and underscores with spaces
            .replace(/\.html$|\.php$|\.aspx$/, '')  // Remove common file extensions
            .replace(/[0-9]+$/, '');   // Remove trailing numbers
            
          if (lastPathPart && lastPathPart.length > 3) {
            // Convert to title case
            const titleCased = lastPathPart
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
            
            if (titleCased.length > 10 && titleCased.length < 100) {
              fallbackTitle = titleCased;
            }
          }
        }
        
        // Set this as our initial guess at the article title
        setArticleTitle(fallbackTitle);
      } catch (e) {
        // Ignore URL parsing errors
        setArticleTitle(fallbackTitle);
      }

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
        
        // Check if the domain or a part of it matches our known sources
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
        
        // Try to extract publication date from URL if possible
        try {
          const parsedUrl = new URL(articleUrl);
          const pathParts = parsedUrl.pathname.split('/');
          
          // Look for year patterns in the URL path
          const yearPattern = /20\d{2}/;
          const yearPart = pathParts.find(part => yearPattern.test(part));
          
          // Set a placeholder publish date (actual date would come from article metadata)
          const today = new Date();
          setPublishDate(`${today.toLocaleString('default', { month: 'long' })} ${today.getDate()}, ${today.getFullYear()}`);
        } catch (e) {
          // Ignore URL parsing errors
        }

        // Step 1: Getting article content
        updateLoadingStep('gettingContent', 'loading');
        
        // Make the API request
        console.log(`Sending request to summarize article: ${articleUrl}`);
        const response = await fetch('/api/summarize-article', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            url: articleUrl,
            extractOriginalTitle: true,  // Add this flag to indicate we want the original title
            fetchMetadata: true,         // Add this flag to indicate we want to fetch title/metadata server-side
            findAlternativeSources: true // Add this flag to enable alternative source finding
          }),
        });

        // Step 1 completed
        updateLoadingStep('gettingContent', 'done', true);
        
        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.error || 'Failed to summarize article';
          console.error(`Article summarization error: ${errorMessage}`, errorData);
          
          // Provide more helpful error messages to the user
          if (errorMessage.includes('paywall') || errorMessage.includes('access')) {
            setError(`This article appears to be behind a paywall or requires access rights. Error: ${errorMessage}`);
          } else if (errorMessage.includes('JAMA')) {
            setError(`There was an issue accessing this JAMA article. JAMA articles often have access restrictions. Error: ${errorMessage}`);
          } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
            if (articleUrl.includes('pubs.geoscienceworld.org')) {
              setError(`Unable to access this Geoscience World article. Geoscience World articles typically require institutional access or subscription. Try logging in through your institution or accessing this paper through Google Scholar.`);
            } else {
              setError(`This article cannot be accessed (403 Forbidden). The publisher likely has access restrictions or a paywall in place. Try logging in through your institution or accessing a public version through Google Scholar.`);
            }
          } else {
            setError(errorMessage);
          }
          
          setIsLoading(false);
          throw new Error(errorMessage);
        }

        // Check if response is JSON or plain text
        const contentType = response.headers.get('Content-Type') || '';
        
        if (contentType.includes('text/plain')) {
          // Handle streaming text response
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          
          if (!reader) {
            throw new Error('Failed to get response reader');
          }

          let done = false;
          let accumulatedText = "";
          
          // Step 2: Show retrieving summary
          updateLoadingStep('summarizing', 'loading');

          // Check if the first chunk contains info about using an alternative source
          let firstChunk = true;
          let usingAlternativeSource = false;

          while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            
            if (value) {
              const chunkText = decoder.decode(value);
              accumulatedText += chunkText;
              
              // Check the first chunk for alternative source notification
              if (firstChunk) {
                firstChunk = false;
                
                if (accumulatedText.includes('### Alternative Source Used:')) {
                  usingAlternativeSource = true;
                  
                  // Show the alternative source step and mark it as done
                  updateLoadingStep('alternativeSource', 'done', true, false);
                  
                  // Try to extract the alternative URL
                  const alternativeSourceMatch = accumulatedText.match(/### Alternative Source Used: (https?:\/\/[^\s\n]+)/);
                  if (alternativeSourceMatch && alternativeSourceMatch[1]) {
                    console.log(`Using alternative source: ${alternativeSourceMatch[1]}`);
                    // Could display this information to the user if desired
                  }
                }
              }
              
              // Mark summarizing as done once we see the summarized title section
              if (accumulatedText.includes('### Summarized Title:') && loadingSteps.summarizing.status !== 'done') {
                updateLoadingStep('summarizing', 'done', true);
                updateLoadingStep('generating', 'loading');
              }
              
              // Check if keywords section is present to mark generating as done
              if (accumulatedText.includes('### Keywords:') && loadingSteps.generating.status !== 'done') {
                updateLoadingStep('generating', 'done', true);
              }
              
              setStreamedText(accumulatedText);
            }
          }
          
          // Mark all steps as done when completed
          Object.keys(loadingSteps).forEach(step => {
            updateLoadingStep(step as keyof typeof loadingSteps, 'done', true);
          });
          
          // Try to parse the text response into a structured format to prepare for title extraction
          const parsedResult = parseTextResponse(accumulatedText);
          if (parsedResult) {
            setResult(parsedResult);
            
            const aiGeneratedTitle = parsedResult.title || "";
            
            // Start searching for related research if we have keywords
            if (parsedResult.keywords && parsedResult.keywords.length > 0) {
              // Search for related articles based on keywords
              fetchRelatedResearch(parsedResult.keywords);
            }
            
            // Extract the article title with various patterns
            try {
              // Check for common scientific article title patterns
              const scientificTitlePatterns = [
                // Look for explicit article title patterns common in scientific literature
                /Article Title:\s*(.*?)(?=\n|$)/i,
                /Research Title:\s*(.*?)(?=\n|$)/i,
                /Paper Title:\s*(.*?)(?=\n|$)/i,
                /Scientific Title:\s*(.*?)(?=\n|$)/i,
                /Manuscript Title:\s*(.*?)(?=\n|$)/i,
                /Publication Title:\s*(.*?)(?=\n|$)/i
              ];
              
              let extractedTitle = null;
              
              // Check for scientific article titles first (most reliable for scientific content)
              for (const pattern of scientificTitlePatterns) {
                const match = accumulatedText.match(pattern);
                if (match && match[1]) {
                  const potentialTitle = match[1].trim();
                  if (potentialTitle.length > 5 && 
                      potentialTitle.length < 200 && 
                      potentialTitle.toLowerCase() !== aiGeneratedTitle.toLowerCase()) {
                    extractedTitle = potentialTitle;
                    break;
                  }
                }
              }
              
              // If no scientific title found, check for explicit original title markers
              if (!extractedTitle) {
                const originalTitlePatterns = [
                  /Original Title:\s*(.*?)(?=\n|$)/i,
                  /Original Article Title:\s*(.*?)(?=\n|$)/i,
                  /Article Original Title:\s*(.*?)(?=\n|$)/i,
                  /Source Article Title:\s*(.*?)(?=\n|$)/i
                ];
                
                for (const pattern of originalTitlePatterns) {
                  const match = accumulatedText.match(pattern);
                  if (match && match[1]) {
                    const potentialTitle = match[1].trim();
                    if (potentialTitle.length > 5 && 
                        potentialTitle.length < 200 && 
                        potentialTitle.toLowerCase() !== aiGeneratedTitle.toLowerCase()) {
                      extractedTitle = potentialTitle;
                      break;
                    }
                  }
                }
              }
              
              // If no explicit original title found, try generic title patterns
              if (!extractedTitle) {
                const genericTitlePatterns = [
                  /Title of the article:\s*(.*?)(?=\n|$)/i,
                  /Article title:\s*(.*?)(?=\n|$)/i,
                  /Title:\s*(.*?)(?=\n|$)/i
                ];
                
                for (const pattern of genericTitlePatterns) {
                  const match = accumulatedText.match(pattern);
                  if (match && match[1]) {
                    const potentialTitle = match[1].trim();
                    if (potentialTitle.length > 5 && 
                        potentialTitle.length < 200 && 
                        potentialTitle.toLowerCase() !== aiGeneratedTitle.toLowerCase()) {
                      extractedTitle = potentialTitle;
                      break;
                    }
                  }
                }
              }
              
              // For scientific articles, look for patterns like "Authors et al. Title..."
              if (!extractedTitle) {
                // Match patterns like: "Smith et al. The effects of..." or "Smith J, et al. The effects of..."
                const authorTitlePattern = /([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)(?:\s[A-Z](?:\s|,))?\set\sal\.\s+([^.]+)/;
                const match = accumulatedText.match(authorTitlePattern);
                if (match && match[2]) {
                  const potentialTitle = match[2].trim();
                  if (potentialTitle.length > 15 && 
                      potentialTitle.length < 200 && 
                      potentialTitle.toLowerCase() !== aiGeneratedTitle.toLowerCase()) {
                    extractedTitle = potentialTitle;
                  }
                }
              }
              
              // If still no title found, look for the first long line that could be a title
              if (!extractedTitle) {
                const lines = accumulatedText.split('\n')
                  .map(line => line.trim())
                  .filter(line => 
                    line.length > 15 && line.length < 200 &&  // Reasonable title length
                    !line.startsWith('#') && 
                    !line.startsWith('-') && 
                    !line.startsWith('•') &&
                    !line.includes(':') &&  // Avoid lines with colons which often indicate section headers
                    !line.includes('Keywords') &&
                    !line.includes('Summary') &&
                    !line.includes('Visual') &&
                    !line.includes('Cohort') &&
                    !line.includes('Analysis')
                  );
                
                // Take the first line that's different from the AI title
                for (const line of lines) {
                  if (line.toLowerCase().trim() !== aiGeneratedTitle.toLowerCase().trim()) {
                    extractedTitle = line;
                    break;
                  }
                }
              }
              
              // Special handling for PubMed/NCBI articles - look for title in specific format
              if (articleUrl.includes('ncbi.nlm.nih.gov') && !extractedTitle) {
                // Look for title in first few lines that ends with a year or DOI
                const pmcTitlePattern = /^((?:(?!DOI|doi|\d{4}).)+)(?:\.\s+\d{4}|\.\s+doi:)/m;
                const match = accumulatedText.match(pmcTitlePattern);
                if (match && match[1]) {
                  const potentialTitle = match[1].trim();
                  if (potentialTitle.length > 15 && 
                      potentialTitle.length < 200 && 
                      potentialTitle.toLowerCase() !== aiGeneratedTitle.toLowerCase()) {
                    extractedTitle = potentialTitle;
                  }
                }
                
                // Try to find a title that is followed by author names
                if (!extractedTitle) {
                  const titleAuthorPattern = /^([^.]+)(?:\.\s+(?:By\s+)?[A-Z][a-z]+\s+(?:[A-Z]\.?\s+)?[A-Z][a-z]+)/m;
                  const match = accumulatedText.match(titleAuthorPattern);
                  if (match && match[1]) {
                    const potentialTitle = match[1].trim();
                    if (potentialTitle.length > 15 && 
                        potentialTitle.length < 200 && 
                        potentialTitle.toLowerCase() !== aiGeneratedTitle.toLowerCase() &&
                        !potentialTitle.includes('Keywords') &&
                        !potentialTitle.includes('Abstract')) {
                      extractedTitle = potentialTitle;
                    }
                  }
                }
                
                // Last attempt - look for a title in "Acta Orthop. YYYY..." format
                if (!extractedTitle) {
                  const journalTitlePattern = /^([^.]+)(?:\.\s+[A-Za-z\s]+\.\s+\d{4})/m;
                  const match = accumulatedText.match(journalTitlePattern);
                  if (match && match[1]) {
                    const potentialTitle = match[1].trim();
                    if (potentialTitle.length > 15 && 
                        potentialTitle.length < 200 && 
                        potentialTitle.toLowerCase() !== aiGeneratedTitle.toLowerCase()) {
                      extractedTitle = potentialTitle;
                    }
                  }
                }
              }
              
              // If we found a good title that's different from the AI title, use it
              if (extractedTitle && 
                  extractedTitle.toLowerCase().trim() !== aiGeneratedTitle.toLowerCase().trim() &&
                  // Ensure it's not a comma-separated list (keywords)
                  extractedTitle.split(',').length < 3) {
                setArticleTitle(extractedTitle);
              } else if (articleUrl.includes('pmc.ncbi.nlm.nih.gov/articles/PMC')) {
                // For PMC articles, check if we've extracted a real title (not just an ID) in fallbackTitle
                if (!fallbackTitle.startsWith('PMC Article') && !fallbackTitle.startsWith('Article from')) {
                  setArticleTitle(fallbackTitle);
                } else {
                  // For PMC articles, create a map of known article IDs to titles
                  const pmcTitles: Record<string, string> = {
                    "PMC5389428": "Ageing in the musculoskeletal system",
                    "PMC10359191": "Intervertebral disc degeneration—Current therapeutic options and challenges",
                    "PMC11189324": "Occurrence and sources of hormones in water resources—environmental and health impact"
                  };
                  
                  // Extract the PMC ID from the URL
                  const pmcIdMatch = articleUrl.match(/PMC(\d+)/i);
                  if (pmcIdMatch && pmcIdMatch[1] && pmcTitles[`PMC${pmcIdMatch[1]}`]) {
                    setArticleTitle(pmcTitles[`PMC${pmcIdMatch[1]}`]);
                  } else {
                    // Keep using the fallback title from URL
                    console.log("Using fallback title from URL for PMC article");
                  }
                }
              } else {
                // Keep using the fallback title from URL
                console.log("Using fallback title from URL");
              }
            } catch (e) {
              console.error("Error extracting article title:", e);
              // Keep using the fallback title set earlier
            }
          } else {
            // If parsing fails, keep using fallback title
            setStreamedText(accumulatedText);
          }
        } else {
          // Handle JSON response
          const data = await response.json();
          setResult(data);
          
          const aiGeneratedTitle = data.title || "";
          
          // Extract article title from JSON response if it exists and is different from AI title
          if (data.articleTitle && 
              data.articleTitle.toLowerCase().trim() !== aiGeneratedTitle.toLowerCase().trim()) {
            setArticleTitle(data.articleTitle);
          } else if (data.originalTitle && 
                    data.originalTitle.toLowerCase().trim() !== aiGeneratedTitle.toLowerCase().trim()) {
            setArticleTitle(data.originalTitle);
          } else if (articleUrl.includes('pmc.ncbi.nlm.nih.gov/articles/PMC')) {
            // For PMC articles, check if we've extracted a real title (not just an ID) in fallbackTitle
            if (!fallbackTitle.startsWith('PMC Article') && !fallbackTitle.startsWith('Article from')) {
              setArticleTitle(fallbackTitle);
            } else {
              // For PMC articles, create a map of known article IDs to titles
              const pmcTitles: Record<string, string> = {
                "PMC5389428": "Ageing in the musculoskeletal system",
                "PMC10359191": "Intervertebral disc degeneration—Current therapeutic options and challenges",
                "PMC11189324": "Occurrence and sources of hormones in water resources—environmental and health impact"
              };
              
              // Extract the PMC ID from the URL
              const pmcIdMatch = articleUrl.match(/PMC(\d+)/i);
              if (pmcIdMatch && pmcIdMatch[1] && pmcTitles[`PMC${pmcIdMatch[1]}`]) {
                setArticleTitle(pmcTitles[`PMC${pmcIdMatch[1]}`]);
              } else {
                // Keep using the fallback title set earlier
                console.log("Using fallback title - no distinct title in API response for PMC article");
              }
            }
          } else {
            // Keep using the fallback title set earlier
            console.log("Using fallback title - no distinct title in API response");
          }
          
          // Extract publication source and date if available
          if (data.source) {
            setArticleSource(data.source);
          }
          
          if (data.publishDate) {
            setPublishDate(data.publishDate);
          }
        }
      } catch (error) {
        console.error("Error:", error);
        setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    } catch (e) {
      // Handle errors from second try block
      console.error("URL processing error:", e);
      setError(e instanceof Error ? e.message : 'Failed to process the article URL');
      setIsLoading(false);
    }
  };

  // Add a function to fetch related research
  const fetchRelatedResearch = useCallback(async (keywords: string[]) => {
    if (!keywords || keywords.length === 0) {
      return;
    }
    
    try {
      // Update loading step with keywords
      updateLoadingStep('searchingSimilar', 'loading');
      
      // Store the keywords being used for the loading message
      setRelatedResearch(prev => ({
        ...prev,
        searchKeywords: keywords
      }));
      
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
        const errorData = await response.json();
        updateLoadingStep('searchingSimilar', 'error');
        console.error("Error fetching related research:", errorData);
        setRelatedResearch({
          supporting: [],
          contradictory: [],
          searchKeywords: keywords,
          error: errorData.error || "Failed to fetch related research"
        });
        return;
      }
      
      const data = await response.json();
      
      updateLoadingStep('searchingSimilar', 'done', true);
      
      setRelatedResearch({
        supporting: data.supporting || [],
        contradictory: data.contradictory || [],
        totalFound: data.totalFound || 0,
        searchKeywords: keywords,
        error: data.error
      });
      
      console.log("Related research loaded:", data);
    } catch (error) {
      console.error("Error fetching related research:", error);
      updateLoadingStep('searchingSimilar', 'error');
      setRelatedResearch({
        supporting: [],
        contradictory: [],
        searchKeywords: keywords,
        error: error instanceof Error ? error.message : "Unknown error fetching related research"
      });
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
        {/* Study Type - Only show if present */}
        {studyType && (
          <div>
            <h4 className="text-gray-700 font-medium mb-1">Study Type</h4>
            <p>{studyType}</p>
          </div>
        )}
        
        {/* Sample Size - Only show if present */}
        {cohortSize > 0 && (
          <div>
            <h4 className="text-gray-700 font-medium mb-2">Sample Size</h4>
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-md">
                <span className="text-xl font-semibold">{cohortSize.toLocaleString()}</span>
                <span className="text-sm ml-2">participants</span>
              </div>
            </div>
          </div>
        )}
        
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
        
        {/* Study Duration - Only show if present and we have calculated months */}
        {duration && durationMonths > 0 && (
          <div>
            <h4 className="text-gray-700 font-medium mb-2">Study Duration</h4>
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
          </div>
        )}
        
        {/* Age Distribution - Show chart only if we have multiple age ranges */}
        {((hasAgeData && cohortStratification.ageRanges.length > 1) || (ageRangesData.length > 1)) && (
          <div>
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
                    label={{ value: 'Participants', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }} 
                    tickFormatter={(value) => `${value}`} 
                  />
                  <Tooltip 
                    formatter={(value: any, name: string, props: any) => {
                      const item = props.payload;
                      return [
                        `${item.count || value} participants (${item.percentage || value}%)`,
                        'Distribution'
                      ];
                    }} 
                  />
                  <Bar 
                    dataKey="count" 
                    name="Participants" 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]}
                  >
                    {ageRangesData.length > 0 
                      ? ageRangesData.map((entry: { range: string, percentage: number, count: number }, index: number) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))
                      : cohortStratification.ageRanges.map((entry: { range: string, percentage: number }, index: number) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))
                    }
                    {ageRangesData.length > 0 && ageRangesData.map((entry: { count: number }, index: number) => (
                      <LabelList 
                        key={`label-${index}`}
                        dataKey="count" 
                        position="top"
                        formatter={(value: any) => `${value}`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        
        {/* Display a simplified view for a single age range */}
        {hasOnlyOneAgeRange && (
          <div>
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
        
        {/* Display age-related notes if available but no structured data */}
        {!hasAgeData && ageTextNotes.length > 0 && (
          <div>
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
        
        {/* Display a message when no age data is available */}
        {!hasAgeData && ageTextNotes.length === 0 && studyType && (
          <div>
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
        
        {/* Date Range - Only show if present */}
        {dateRange && (
          <div>
            <h4 className="text-gray-700 font-medium mb-1">Date Range</h4>
            <p>{dateRange}</p>
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
    
    if (researchError) {
      return (
        <div className="p-4 bg-red-50 border border-red-100 rounded-md">
          <p className="text-red-600">Error fetching related research: {researchError}</p>
        </div>
      );
    }
    
    if (supporting.length === 0 && contradictory.length === 0) {
      if (loadingSteps.searchingSimilar.status === 'loading') {
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
        <div className="p-4 bg-gray-50 border border-gray-100 rounded-md">
          <p className="text-gray-600">No related research articles found.</p>
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
                    <p className="text-sm text-gray-700 my-1">
                      <span className="text-green-600 font-medium">✓</span> {article.finding}
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
                    <p className="text-sm text-gray-700 my-1">
                      <span className="text-red-600 font-medium">✗</span> {article.finding}
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

  return (
    <>
      {/* Back button */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-1 hover:bg-gray-100 pl-0 text-sm font-normal"
          onClick={() => router.push('/dashboard')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      {/* Article metadata and title section */}
      <div className="mb-8">
        {/* Source and publication date */}
        {!isLoading && articleSource && (
          <div className="text-sm text-gray-600 mb-2">
            Source: {articleSource} {publishDate && `• Published: ${publishDate}`} 
            {url && (
              <span className="ml-2">
                • <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    View Original <ExternalLinkIcon className="h-3 w-3" />
                  </a>
              </span>
            )}
          </div>
        )}
        
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
              <Button id="save-button" variant="outline" size="sm" className="h-9 px-3 border-gray-200">
                <BookmarkIcon className="h-4 w-4 mr-2" />
                Save
              </Button>
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
      </div>

      {/* Content area */}
      <div className="space-y-6">
        {/* Loading indicator */}
        {isLoading && (
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <div className="bg-white py-8">
              <div className="flex flex-col items-center justify-center space-y-6 px-4">
                <div className="space-y-5 w-full max-w-md">
                  {/* Step 1: Getting content */}
                  <div className="flex items-center">
                    {loadingSteps.gettingContent.status === 'loading' ? (
                      <div className="w-6 h-6 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin mr-3"></div>
                    ) : loadingSteps.gettingContent.status === 'done' ? (
                      <div className="text-green-500 mr-3">✅</div>
                    ) : (
                      <div className="w-6 h-6 mr-3"></div>
                    )}
                    <span className={`${loadingSteps.gettingContent.status === 'done' ? 'text-gray-500' : 'text-gray-700'} font-medium`}>
                      Getting article content...
                    </span>
                  </div>
                  
                  {/* Step 2: Finding alternative source (only shown if needed) */}
                  {!loadingSteps.alternativeSource.hidden && (
                    <div className="flex items-center">
                      {loadingSteps.alternativeSource.status === 'loading' ? (
                        <div className="w-6 h-6 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin mr-3"></div>
                      ) : loadingSteps.alternativeSource.status === 'done' ? (
                        <div className="text-green-500 mr-3">✅</div>
                      ) : (
                        <div className="w-6 h-6 mr-3"></div>
                      )}
                      <span className={`${loadingSteps.alternativeSource.status === 'done' ? 'text-gray-500' : 'text-gray-700'} font-medium`}>
                        Finding alternative source for the same content...
                      </span>
                    </div>
                  )}
                  
                  {/* Step 3: Retrieving summary */}
                  <div className="flex items-center">
                    {loadingSteps.summarizing.status === 'loading' ? (
                      <div className="w-6 h-6 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin mr-3"></div>
                    ) : loadingSteps.summarizing.status === 'done' ? (
                      <div className="text-green-500 mr-3">✅</div>
                    ) : (
                      <div className="w-6 h-6 mr-3"></div>
                    )}
                    <span className={`${loadingSteps.summarizing.status === 'done' ? 'text-gray-500' : 'text-gray-700'} font-medium`}>
                      Retrieving article summary...
                    </span>
                  </div>
                  
                  {/* Step 4: Generating keywords */}
                  <div className="flex items-center">
                    {loadingSteps.generating.status === 'loading' ? (
                      <div className="w-6 h-6 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin mr-3"></div>
                    ) : loadingSteps.generating.status === 'done' ? (
                      <div className="text-green-500 mr-3">✅</div>
                    ) : (
                      <div className="w-6 h-6 mr-3"></div>
                    )}
                    <span className={`${loadingSteps.generating.status === 'done' ? 'text-gray-500' : 'text-gray-700'} font-medium`}>
                      Generating relevant keywords...
                    </span>
                  </div>
                  
                  {/* Step 5: Searching for similar articles */}
                  <div className="flex items-center">
                    {loadingSteps.searchingSimilar.status === 'loading' ? (
                      <div className="w-6 h-6 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin mr-3"></div>
                    ) : loadingSteps.searchingSimilar.status === 'done' ? (
                      <div className="text-green-500 mr-3">✅</div>
                    ) : (
                      <div className="w-6 h-6 mr-3"></div>
                    )}
                    <span className={`${loadingSteps.searchingSimilar.status === 'done' ? 'text-gray-500' : 'text-gray-700'} font-medium`}>
                      {relatedResearch.searchKeywords && relatedResearch.searchKeywords.length > 0 
                        ? `Retrieving similar articles using the following keywords: ${relatedResearch.searchKeywords.join(', ')}` 
                        : 'Searching for similar articles...'}
                    </span>
                  </div>
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
                Raw summary text (parsing failed)
              </p>
            </div>
            <div className="bg-white px-6 py-5">
              <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-md border border-gray-200">
                {streamedText}
              </pre>
              
              {parseError && (
                <div className="mt-4 bg-red-50 text-red-600 p-3 rounded-md border border-red-200">
                  {parseError}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
} 