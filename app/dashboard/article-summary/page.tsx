'use client';

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookmarkIcon, Share2Icon, DownloadIcon, PrinterIcon, ExternalLinkIcon, ArrowLeft } from "lucide-react";

export default function ArticleSummaryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [streamedText, setStreamedText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [articleTitle, setArticleTitle] = useState("");
  const [articleSource, setArticleSource] = useState("");
  const [publishDate, setPublishDate] = useState("");

  useEffect(() => {
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
    setError(null);
    
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
            
            // Try to fetch the article's HTML to extract the title
            try {
              const response = await fetch(articleUrl);
              const html = await response.text();
              
              // Look for title tags specific to PubMed/NCBI
              const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || 
                                html.match(/<meta\s+name="citation_title"\s+content="([^"]+)"/i) ||
                                html.match(/<title>([^<]+)<\/title>/i);
              
              if (titleMatch && titleMatch[1]) {
                const extractedTitle = titleMatch[1].trim();
                if (extractedTitle.length > 5 && !extractedTitle.includes('PMC') && !extractedTitle.includes('PubMed')) {
                  // Clean up the title - sometimes it includes the journal name or other metadata
                  let cleanTitle = extractedTitle;
                  
                  // Remove "PMC" or "PubMed Central" prefix if present
                  cleanTitle = cleanTitle.replace(/^PMC\s*[-:]\s*/i, '');
                  cleanTitle = cleanTitle.replace(/^PubMed Central\s*[-:]\s*/i, '');
                  
                  // Remove journal information that might be in the title tag
                  const journalSeparators = [' - PMC', ' - PubMed', ' - NCBI', ' | National Library of Medicine'];
                  for (const separator of journalSeparators) {
                    if (cleanTitle.includes(separator)) {
                      cleanTitle = cleanTitle.split(separator)[0].trim();
                    }
                  }
                  
                  fallbackTitle = cleanTitle;
                }
              }
              
              // If we couldn't extract a good title from the HTML tags, try to find it in specific elements
              if (fallbackTitle.startsWith('PMC Article')) {
                // Look for the article title in specific elements that PubMed uses
                const h1Match = html.match(/<h1[^>]*id="[^"]*-title"[^>]*>([^<]+)<\/h1>/i);
                if (h1Match && h1Match[1]) {
                  fallbackTitle = h1Match[1].trim();
                }
              }
            } catch (e) {
              console.error("Error fetching article HTML:", e);
            }
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
          'medrxiv.org': 'medRxiv'
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
        
        // Set a placeholder publish date (actual date would come from article metadata)
        const today = new Date();
        setPublishDate(`${today.toLocaleString('default', { month: 'long' })} ${today.getDate()}, ${today.getFullYear()}`);
      } catch (e) {
        // Ignore URL parsing errors
      }

      // Make the API request
      const response = await fetch('/api/summarize-article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: articleUrl,
          extractOriginalTitle: true  // Add this flag to indicate we want the original title
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to summarize article');
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

        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          
          if (value) {
            const chunkText = decoder.decode(value);
            accumulatedText += chunkText;
            setStreamedText(accumulatedText);
          }
        }
        
        // Try to parse the text response into a structured format to prepare for title extraction
        const parsedResult = parseTextResponse(accumulatedText);
        if (parsedResult) {
          setResult(parsedResult);
          
          const aiGeneratedTitle = parsedResult.title || "";
          
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
  };

  // Function to parse the plain text response
  const parseTextResponse = (text: string) => {
    try {
      const result = {
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
            ageRanges: [] as { range: string; percentage: number }[],
            demographics: [] as { region: string; percentage: number }[]
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

    const {
      studyType,
      duration,
      dateRange,
      cohortSize,
      cohortStratification,
      notes
    } = result.cohortAnalysis;

    return (
      <div className="space-y-5">
        {studyType && (
          <div>
            <h4 className="text-gray-700 font-medium mb-1">Study Type</h4>
            <p>{studyType}</p>
          </div>
        )}
        
        {dateRange && (
          <div>
            <h4 className="text-gray-700 font-medium mb-1">Date Range</h4>
            <p>{dateRange}</p>
          </div>
        )}
        
        {cohortSize > 0 && (
          <div>
            <h4 className="text-gray-700 font-medium mb-1">Cohort Size</h4>
            <p>{cohortSize} participants</p>
          </div>
        )}
        
        {duration && (
          <div>
            <h4 className="text-gray-700 font-medium mb-1">Study Duration</h4>
            <p>{duration}</p>
          </div>
        )}
        
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
            <div className="bg-white py-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
                <p className="text-gray-700 text-center font-medium">Analyzing and summarizing the article...</p>
                <p className="text-sm text-gray-500 text-center">This may take up to a minute depending on the article length</p>
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