import { openai } from '@ai-sdk/openai';
import { generateText, generateObject, streamText, tool } from 'ai';
import { z } from 'zod';
import { JSDOM } from 'jsdom';
import { traceAICall } from '@/utils/ai-config';
import { createClient } from '@/utils/supabase/client';

// Use Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Schema for article summary structure
const summarizedArticleSchema = z.object({
  title: z.string(),
  visualSummary: z.array(z.object({
    emoji: z.string(),
    point: z.string()
  })),
  keywords: z.array(z.string()),
  cohortAnalysis: z.object({
    studyType: z.string(),
    duration: z.string().optional(),
    dateRange: z.string().optional(),
    cohortSize: z.number().optional(),
    cohortStratification: z.object({
      gender: z.object({
        male: z.number().optional(),
        female: z.number().optional(),
        other: z.number().optional(),
      }).optional(),
      ageRanges: z.array(z.object({
        range: z.string(),
        percentage: z.number()
      })).optional(),
      demographics: z.array(z.object({
        region: z.string(),
        percentage: z.number()
      })).optional(),
    }).optional(),
    notes: z.array(z.string()).optional()
  })
});

// Tool for fetching article content
const fetchArticleContent = async (url: string) => {
  try {
    console.log(`Fetching article content from: ${url}`);
    
    // Special handling for JAMA URLs
    if (url.includes('jamanetwork.com')) {
      console.log('Detected JAMA article, using specialized handling');
      
      try {
        // Try to extract the DOI from the URL
        const doiMatch = url.match(/\/(\d+\.\d+\/[a-zA-Z0-9.]+)\/?/);
        let doi = null;
        if (doiMatch && doiMatch[1]) {
          doi = doiMatch[1];
          console.log(`Extracted DOI from JAMA URL: ${doi}`);
        }
        
        // Add special headers for JAMA articles
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': 'https://jamanetwork.com/',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Cache-Control': 'max-age=0',
          }
        });
        
        if (!response.ok) {
          throw new Error(`JAMA article fetch failed: HTTP ${response.status} - ${response.statusText}`);
        }
        
        const htmlText = await response.text();
        console.log(`Successfully fetched JAMA article, length: ${htmlText.length} characters`);
        
        // Extract readable text content
        const dom = new JSDOM(htmlText);
        
        // Try to find the article content in JAMA-specific selectors
        const jamaSelectors = [
          '.article-full-text',
          '.article-content',
          '#BodyContent',
          '.content_wrapper',
          '.content-container'
        ];
        
        let articleContent = '';
        for (const selector of jamaSelectors) {
          const element = dom.window.document.querySelector(selector);
          if (element) {
            articleContent = element.textContent || '';
            console.log(`Found content using JAMA selector: ${selector}`);
            break;
          }
        }
        
        // If none of the JAMA selectors worked, fall back to default extraction
        if (!articleContent) {
          articleContent = extractReadableContent(dom.window.document);
        }
        
        // If we still don't have content, extract just the abstract
        if (!articleContent || articleContent.length < 100) {
          const abstractElement = dom.window.document.querySelector('.abstract') 
                               || dom.window.document.querySelector('[class*="abstract"]');
          if (abstractElement) {
            articleContent = abstractElement.textContent || '';
            console.log('Extracted abstract content only');
          }
        }
        
        // If we couldn't extract content or encountered an error, try alternative sources if we have a DOI
        if ((!articleContent || articleContent.length < 500) && doi) {
          console.log('Attempting to fetch JAMA article from alternative source using DOI');
          
          // Try Unpaywall or similar open access API
          try {
            const unpaywallUrl = `https://api.unpaywall.org/v2/${doi}?email=app@example.com`;
            const unpaywallResponse = await fetch(unpaywallUrl);
            
            if (unpaywallResponse.ok) {
              const data = await unpaywallResponse.json();
              if (data.best_oa_location && data.best_oa_location.url) {
                console.log(`Found alternative URL via Unpaywall: ${data.best_oa_location.url}`);
                const altResponse = await fetch(data.best_oa_location.url);
                if (altResponse.ok) {
                  const altHtml = await altResponse.text();
                  const altDom = new JSDOM(altHtml);
                  const altContent = extractReadableContent(altDom.window.document);
                  
                  if (altContent && altContent.length > articleContent.length) {
                    console.log('Found better content from alternative source');
                    articleContent = altContent;
                  }
                }
              }
            }
          } catch (altError: any) {
            console.warn('Error fetching from alternative source:', altError.message);
          }
        }
        
        // If we still couldn't extract meaningful content, inform the user
        if (!articleContent || articleContent.length < 100) {
          console.warn('Could not extract meaningful content from JAMA article');
          articleContent = "This article appears to be behind a paywall. Only limited content could be extracted. The summary may be incomplete or based only on the abstract.";
        }
        
        return {
          title: extractTitle(htmlText) || url,
          content: articleContent,
          url,
          rawHtml: htmlText
        };
      } catch (error: any) {
        console.error('Error fetching JAMA article:', error);
        throw new Error(`Failed to fetch JAMA article: ${error.message}`);
      }
    }
    
    // Special handling for PubMed URLs to get more complete content
    if (url.includes('pubmed.ncbi.nlm.nih.gov')) {
      // Try to extract the PMID
      const pmidMatch = url.match(/\/(\d+)\/?$/);
      if (pmidMatch && pmidMatch[1]) {
        const pmid = pmidMatch[1];
        console.log(`Detected PubMed article with PMID: ${pmid}`);
        
        // First, try to fetch from PubMed Central which has full text
        try {
          const pmcUrl = `https://www.ncbi.nlm.nih.gov/pmc/articles/pmid/${pmid}/`;
          console.log(`Attempting to fetch full text from PMC: ${pmcUrl}`);
          
          const pmcResponse = await fetch(pmcUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
          if (pmcResponse.ok) {
            const pmcText = await pmcResponse.text();
            console.log(`Successfully fetched PMC content, length: ${pmcText.length} characters`);
            
            // Extract readable text content
            const dom = new JSDOM(pmcText);
            const articleContent = extractReadableContent(dom.window.document);
            
            return {
              title: extractTitle(pmcText) || url,
              content: articleContent,
              url: pmcUrl,
              rawHtml: pmcText
            };
          }
        } catch (error) {
          console.warn('Error fetching from PMC, falling back to PubMed abstract:', error);
        }
        
        // If PMC fails, try the EFetch API to get structured data
        try {
          const efetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&retmode=xml`;
          console.log(`Fetching structured data via EFetch: ${efetchUrl}`);
          
          const efetchResponse = await fetch(efetchUrl);
          if (efetchResponse.ok) {
            const xmlData = await efetchResponse.text();
            console.log(`Successfully fetched EFetch XML data, length: ${xmlData.length} characters`);
            
            // Include both the XML data and the original HTML for more context
            const originalResponse = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            });
            
            if (originalResponse.ok) {
              const htmlData = await originalResponse.text();
              
              // Extract title from either source
              const title = extractTitle(htmlData) || extractXmlTitle(xmlData) || url;
              
              // Combine both data sources
              const combinedContent = `
                <!-- PubMed HTML Content -->
                ${htmlData}
                
                <!-- PubMed XML Structured Data -->
                ${xmlData}
              `;
              
              // Extract readable text content
              const dom = new JSDOM(htmlData);
              const articleContent = extractReadableContent(dom.window.document);
              
              return {
                title,
                content: articleContent,
                url,
                rawHtml: combinedContent
              };
            }
          }
        } catch (error) {
          console.warn('Error fetching from EFetch API:', error);
        }
      }
    }
    
    // Special handling for Geoscience World articles
    if (url.includes('pubs.geoscienceworld.org')) {
      console.log('Detected Geoscience World article, using specialized handling');
      
      try {
        // Try to extract the DOI or article ID from the URL
        const doiMatch = url.match(/\/(\d+\.\d+\/[a-zA-Z0-9.]+)\/?/);
        const articleIdMatch = url.match(/\/(\d+)\/([a-zA-Z0-9-]+)$/);
        
        let doi = null;
        if (doiMatch && doiMatch[1]) {
          doi = doiMatch[1];
          console.log(`Extracted DOI from Geoscience World URL: ${doi}`);
        }
        
        // Try to fetch the public abstract page first
        let abstractUrl = url;
        if (url.includes('article-abstract')) {
          // Already pointing to the abstract page
          abstractUrl = url;
        } else if (articleIdMatch) {
          // Construct the abstract URL
          abstractUrl = `https://pubs.geoscienceworld.org/ssa/bssa/article-abstract/${articleIdMatch[1]}/${articleIdMatch[2]}`;
        }
        
        console.log(`Attempting to fetch abstract from: ${abstractUrl}`);
        
        // First attempt with optimized headers
        const response = await fetch(abstractUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': 'https://pubs.geoscienceworld.org/',
            'Cache-Control': 'max-age=0',
          }
        });
        
        if (!response.ok) {
          if (response.status === 403) {
            // If direct access fails, try to find metadata through alternative sources
            if (doi) {
              console.log(`Attempting to find open access version via DOI: ${doi}`);
              
              try {
                // Try Unpaywall API
                const unpaywallUrl = `https://api.unpaywall.org/v2/${doi}?email=app@example.com`;
                const unpaywallResponse = await fetch(unpaywallUrl);
                
                if (unpaywallResponse.ok) {
                  const data = await unpaywallResponse.json();
                  if (data.best_oa_location && data.best_oa_location.url) {
                    console.log(`Found alternative URL via Unpaywall: ${data.best_oa_location.url}`);
                    const altResponse = await fetch(data.best_oa_location.url);
                    if (altResponse.ok) {
                      const altHtml = await altResponse.text();
                      const altDom = new JSDOM(altHtml);
                      const altContent = extractReadableContent(altDom.window.document);
                      
                      return {
                        title: data.title || extractTitle(altHtml) || url,
                        content: altContent,
                        url: data.best_oa_location.url,
                        rawHtml: altHtml
                      };
                    }
                  }
                }
              } catch (altError: any) {
                console.warn('Error fetching from alternative source:', altError.message);
              }
            }
            
            // If we couldn't get content, provide a specific message
            throw new Error(`Failed to fetch article: HTTP 403 - Forbidden. Geoscience World articles typically require subscription or institutional access.`);
          } else {
            throw new Error(`Failed to fetch article: HTTP ${response.status} - ${response.statusText}`);
          }
        }
        
        const htmlText = await response.text();
        console.log(`Successfully fetched Geoscience World article, length: ${htmlText.length} characters`);
        
        // Extract abstract or any available content
        const dom = new JSDOM(htmlText);
        
        // Try to find the abstract section
        const abstractSelectors = [
          '.abstract',
          '#abstract',
          '.abstractSection',
          '[id*="abstract"]',
          '[class*="abstract"]'
        ];
        
        let articleContent = '';
        for (const selector of abstractSelectors) {
          const element = dom.window.document.querySelector(selector);
          if (element) {
            articleContent = element.textContent || '';
            console.log(`Found abstract using selector: ${selector}`);
            break;
          }
        }
        
        // If we couldn't find an abstract, try to extract any meaningful content
        if (!articleContent || articleContent.length < 100) {
          articleContent = extractReadableContent(dom.window.document);
        }
        
        // If we still couldn't extract meaningful content, inform the user
        if (!articleContent || articleContent.length < 100) {
          articleContent = "This Geoscience World article appears to be behind a paywall. Only limited content could be extracted. The summary may be incomplete or based only on the abstract.";
        }
        
        return {
          title: extractTitle(htmlText) || url,
          content: articleContent,
          url: abstractUrl,
          rawHtml: htmlText
        };
      } catch (error: any) {
        console.error('Error fetching Geoscience World article:', error);
        throw new Error(`Failed to fetch Geoscience World article: ${error.message}`);
      }
    }
    
    // Default handling for all other URLs or if specific methods fail
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'max-age=0',
      }
    });
    
    if (!response.ok) {
      if (response.status === 403) {
        if (url.includes('pubs.geoscienceworld.org')) {
          throw new Error(`Failed to fetch article: HTTP 403 - Forbidden. Geoscience World articles typically require subscription or institutional access.`);
        } else {
          throw new Error(`Failed to fetch article: HTTP 403 - Forbidden. This publisher likely requires subscription or institutional access.`);
        }
      } else {
        throw new Error(`Failed to fetch article: HTTP ${response.status} - ${response.statusText}`);
      }
    }
    
    const htmlText = await response.text();
    console.log(`Successfully fetched article, length: ${htmlText.length} characters`);
    
    // Extract readable text content
    const dom = new JSDOM(htmlText);
    const articleContent = extractReadableContent(dom.window.document);
    
    return {
      title: extractTitle(htmlText) || url,
      content: articleContent,
      url,
      rawHtml: htmlText
    };
  } catch (error: any) {
    console.error('Error fetching article:', error);
    
    // Create more informative error messages
    if (error.message && error.message.includes('fetch')) {
      throw new Error(`Network error fetching article: ${error.message}`);
    } else if (error.message && error.message.includes('JSDOM')) {
      throw new Error(`Error parsing article HTML: ${error.message}`);
    } else {
      throw error;
    }
  }
};

// Helper to extract title from HTML
function extractTitle(html: string): string | null {
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : null;
}

// Helper to extract title from XML
function extractXmlTitle(xml: string): string | null {
  const titleMatch = xml.match(/<ArticleTitle>(.*?)<\/ArticleTitle>/);
  return titleMatch ? titleMatch[1].trim() : null;
}

// Helper to extract readable content from HTML DOM
function extractReadableContent(document: Document): string {
  // Remove script, style, and nav elements
  ['script', 'style', 'nav', 'header', 'footer', 'aside'].forEach(tag => {
    const elements = document.getElementsByTagName(tag);
    for (let i = elements.length - 1; i >= 0; i--) {
      elements[i].parentNode?.removeChild(elements[i]);
    }
  });
  
  // Try to find the article content in common article containers
  const possibleContentSelectors = [
    'article',
    'main',
    '.article-content',
    '.article',
    '.content',
    '.post-content',
    '#article-content',
    '#content',
    '.entry-content',
    '.post'
  ];
  
  let contentElement = null;
  
  for (const selector of possibleContentSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      // Find the largest content container
      let largestElement = elements[0];
      let maxTextLength = elements[0].textContent?.length || 0;
      
      for (let i = 1; i < elements.length; i++) {
        const textLength = elements[i].textContent?.length || 0;
        if (textLength > maxTextLength) {
          maxTextLength = textLength;
          largestElement = elements[i];
        }
      }
      
      contentElement = largestElement;
      break;
    }
  }
  
  // If no content container found, use body
  if (!contentElement) {
    contentElement = document.body;
  }
  
  let content = '';
  
  // Extract headlines
  const headlines = contentElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
  for (const headline of headlines) {
    content += `\n## ${headline.textContent?.trim()}\n\n`;
  }
  
  // Extract paragraphs
  const paragraphs = contentElement.querySelectorAll('p');
  for (const paragraph of paragraphs) {
    const text = paragraph.textContent?.trim();
    if (text && text.length > 20) { // Ignore short paragraphs that may be captions or notes
      content += `${text}\n\n`;
    }
  }
  
  // Extract lists
  const lists = contentElement.querySelectorAll('ul, ol');
  for (const list of lists) {
    const items = list.querySelectorAll('li');
    for (const item of items) {
      content += `- ${item.textContent?.trim()}\n`;
    }
    content += '\n';
  }
  
  // Extract tables
  const tables = contentElement.querySelectorAll('table');
  for (const table of tables) {
    content += '\nTABLE:\n';
    const rows = table.querySelectorAll('tr');
    for (const row of rows) {
      const cells = row.querySelectorAll('th, td');
      let rowContent = '';
      for (const cell of cells) {
        rowContent += `${cell.textContent?.trim()} | `;
      }
      content += `${rowContent.slice(0, -3)}\n`;
    }
    content += '\n';
  }
  
  return content || document.body.textContent || '';
}

// Helper function to get a human-readable source from URL
const getSourceFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    let source = urlObj.hostname.replace('www.', '');
    
    // Make source more human-readable
    if (source.includes('pubmed') || source.includes('ncbi.nlm.nih.gov')) {
      return 'PubMed';
    } else if (source.includes('nature.com')) {
      return 'Nature';
    } else if (source.includes('sciencedirect')) {
      return 'ScienceDirect';
    } else {
      // Capitalize first letter of domain
      source = source.split('.')[0];
      return source.charAt(0).toUpperCase() + source.slice(1);
    }
  } catch (urlError) {
    console.warn("Error parsing URL for source:", urlError);
    return 'Unknown Source';
  }
};

// Execute the summarization agent
export async function POST(req: Request) {
  try {
    console.log('Received article summarization request');
    const body = await req.json();
    const url = body.url;
    const extractOriginalTitle = body.extractOriginalTitle === true;
    const fetchMetadata = body.fetchMetadata === true;
    const findAlternativeSources = body.findAlternativeSources === true;
    
    console.log('Article URL received:', url);
    console.log('Extract original title flag:', extractOriginalTitle);
    console.log('Fetch metadata flag:', fetchMetadata);
    console.log('Find alternative sources flag:', findAlternativeSources);

    // Input validation
    if (!url) {
      console.error('No URL provided');
      return new Response(JSON.stringify({ error: 'URL is required' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Fetch the article content
    let articleData;
    let usedAlternativeSource = false;
    let alternativeSourceUrl = '';
    
    try {
      articleData = await fetchArticleContent(url);
      console.log('Article title:', articleData.title);
      console.log('Content length:', articleData.content.length);
      
      // If client just wants metadata without summarization
      if (fetchMetadata && !extractOriginalTitle) {
        return new Response(JSON.stringify({
          title: articleData.title,
          url: url
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (error: any) {
      console.error('Error fetching article:', error);
      
      // If we're configured to find alternative sources and the error suggests access issues
      if (findAlternativeSources && 
          (error.message.includes('403') || 
           error.message.includes('Forbidden') || 
           error.message.includes('paywall') || 
           error.message.includes('access') || 
           error.message.includes('subscription'))) {
        
        console.log('Attempting to find an alternative source for the article');
        
        try {
          // Get article title from URL or error context
          let searchQuery = url;
          let isExactTitle = false;
          
          // First attempt to extract title from HTML if available in the error response
          if (error.message.includes('title:')) {
            const titleMatch = error.message.match(/title:\s*"([^"]+)"/);
            if (titleMatch && titleMatch[1]) {
              searchQuery = titleMatch[1];
              isExactTitle = true;
              console.log('Extracted article title from error message:', searchQuery);
            }
          }
          
          // If no title was found, try to extract from URL
          if (!isExactTitle) {
            try {
              const urlObj = new URL(url);
              const pathParts = urlObj.pathname.split('/').filter(Boolean);
              if (pathParts.length > 0) {
                const lastPathPart = pathParts[pathParts.length - 1]
                  .replace(/[-_]/g, ' ')
                  .replace(/\.html$|\.php$|\.aspx$/, '')
                  .replace(/[0-9]+$/, '');
                  
                if (lastPathPart && lastPathPart.length > 3) {
                  searchQuery = lastPathPart;
                  console.log('Extracted potential title from URL path:', searchQuery);
                }
              }
            } catch (e) {
              // Ignore URL parsing errors
            }
          }
          
          // For academic articles, look for DOI or article IDs in the URL
          const doiMatch = url.match(/\/(\d+\.\d+\/[a-zA-Z0-9.]+)\/?/);
          if (doiMatch && doiMatch[1] && !isExactTitle) {
            const doiQuery = `DOI: ${doiMatch[1]}`;
            // If we have a DOI, use it as an additional search term
            searchQuery = isExactTitle ? `${searchQuery} ${doiQuery}` : doiQuery;
            console.log('Added DOI to search query:', doiQuery);
          }
          
          // For PubMed articles
          const pmcMatch = url.match(/PMC(\d+)/i);
          if (pmcMatch && pmcMatch[1] && !isExactTitle) {
            const pmcId = `PMC${pmcMatch[1]}`;
            searchQuery = isExactTitle ? `${searchQuery} ${pmcId}` : pmcId;
            console.log('Added PMC ID to search query:', pmcId);
          }
          
          // Call our internal Tavily search API to find alternative sources
          console.log('Searching for alternative sources with query:', searchQuery);
          const searchResponse = await fetch('/api/tavily-search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              query: searchQuery,
              isExactTitle: isExactTitle
            })
          });
          
          if (!searchResponse.ok) {
            throw new Error(`Failed to search for alternative sources: ${searchResponse.statusText}`);
          }
          
          const searchResults = await searchResponse.json();
          
          // Filter out the original URL and try alternative sources
          const alternativeSources = searchResults.results.filter((result: { url: string }) => 
            result.url !== url && result.url.includes('http')
          );
          
          if (alternativeSources.length > 0) {
            console.log(`Found ${alternativeSources.length} alternative sources, trying first one:`, alternativeSources[0].url);
            
            // Try to fetch from the alternative source
            try {
              articleData = await fetchArticleContent(alternativeSources[0].url);
              usedAlternativeSource = true;
              alternativeSourceUrl = alternativeSources[0].url;
              console.log('Successfully fetched from alternative source:', alternativeSources[0].url);
              console.log('Alternative source title:', articleData.title);
              console.log('Alternative source content length:', articleData.content.length);
            } catch (altError: any) {
              console.error('Error fetching from alternative source:', altError);
              
              // If the first alternative failed, try others if available
              if (alternativeSources.length > 1) {
                console.log('First alternative source failed, trying next one...');
                try {
                  articleData = await fetchArticleContent(alternativeSources[1].url);
                  usedAlternativeSource = true;
                  alternativeSourceUrl = alternativeSources[1].url;
                  console.log('Successfully fetched from second alternative source:', alternativeSources[1].url);
                  console.log('Alternative source title:', articleData.title);
                  console.log('Alternative source content length:', articleData.content.length);
                } catch (secondAltError: any) {
                  console.error('Error fetching from second alternative source:', secondAltError);
                  throw new Error(`Original source was not accessible and alternative sources failed: ${altError.message}, ${secondAltError.message}`);
                }
              } else {
                throw new Error(`Original source was not accessible and alternative source failed: ${altError.message}`);
              }
            }
          } else {
            throw new Error(`No alternative sources found for the article: ${error.message}`);
          }
        } catch (searchError: any) {
          console.error('Error finding alternative sources:', searchError);
          
          // Provide more specific error messages based on the URL
          let errorMessage = 'Failed to fetch article';
          if (url.includes('jamanetwork.com')) {
            errorMessage = `Failed to fetch JAMA article: ${error.message || 'Access might be restricted'}`;
          } else if (url.includes('pubmed')) {
            errorMessage = `Failed to fetch PubMed article: ${error.message || 'The article might not be publicly accessible'}`;
          } else if (url.includes('geoscienceworld')) {
            errorMessage = `Failed to fetch Geoscience World article: ${error.message || 'The article might require institutional access'}`;
          } else {
            errorMessage = `Failed to fetch article: ${error.message || 'The article might not be accessible'}`;
          }
          
          return new Response(JSON.stringify({ 
            error: errorMessage,
            url: url 
          }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } else {
        // Provide more specific error messages based on the URL
        let errorMessage = 'Failed to fetch article';
        if (url.includes('jamanetwork.com')) {
          errorMessage = `Failed to fetch JAMA article: ${error.message || 'Access might be restricted'}`;
          console.log('JAMA article fetch error details:', error);
        } else if (url.includes('pubmed')) {
          errorMessage = `Failed to fetch PubMed article: ${error.message || 'The article might not be publicly accessible'}`;
        } else {
          errorMessage = `Failed to fetch article: ${error.message || 'The article might not be accessible'}`;
        }
        
        return new Response(JSON.stringify({ 
          error: errorMessage,
          url: url 
        }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Enhance the system prompt to extract original title if requested
    let systemPrompt = `You are a powerful research assistant with a skill for reading scientific research articles, and understanding what the key findings are from each article. You know how to read an article and provide a human with a TLDR that does not miss any pertinent results from the article. But you provide enough context in your summary that a human can quickly understand the scope and purpose of the study, as well as a clear report of the results/key findings. You include statistics related to key findings, where they are included in the article. You provide important statistics as mentioned in the article, if they are found in reference to a key finding. You do not invent statistics.

    Take the URL provided, and summarize the content providing the following in a structured JSON format with these exact fields:

    {
      "originalArticleTitle": "The exact original title of the article",
      "summarizedTitle": "A concise, informative title that captures the main discovery or conclusion",
      "visualSummary": [
        {
          "emoji": "🧬",
          "point": "First key finding or important point from the article"
        },
        {
          "emoji": "🔬",
          "point": "Second key finding or important point from the article"
        },
        // Additional points as needed
      ],
      "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
      "cohortAnalysis": {
        "typeOfStudy": "The type of study (experiment, observation, etc.)",
        "duration": "Duration of the study if applicable",
        "dateRange": "Date range of the study if applicable",
        "cohortSize": 0, // Number of participants as an integer
        "ageDistribution": "Age range and distribution information exactly as stated in the article",
        "gender": {
          "male": 0, // Percentage as a number
          "female": 0 // Percentage as a number
        },
        "geographicDistribution": "Geographic information exactly as stated in the article",
        "notes": [
          "Important note 1 about the study methodology",
          "Important note 2 about the study methodology"
        ]
      }
    }

    Guidelines for creating the JSON:
    
    1. For the original article title, capture the exact title as it appears in the article.
    2. For the summarized title, create a concise, informative title that captures the main discovery or conclusion.
    3. For visual summary, provide 3-10 key points from the article, each with a relevant emoji that represents the content. The first point should describe what was studied. Make each point easy to understand for non-experts.
    4. For keywords, provide 5-7 specific scientific terms that accurately represent the research interests. Focus on specific technical terms used in the field.
    5. For cohort analysis:
      - Only include demographic information that is EXPLICITLY stated in the article
      - Do not make up or estimate demographic percentages if not provided
      - For age data, provide it exactly as mentioned in the article
      - Include specific demographic statements verbatim in the notes section if they don't fit elsewhere
    
    Ensure all JSON fields have values - use empty strings, arrays, or zeros for missing data, but include all fields.
    
    All emojis in the visualSummary should be unique - never use the same emoji twice.`;

    try {
      console.log('Generating summary as JSON...');
      
      let promptText = `Please summarize this scientific article`;
      
      if (usedAlternativeSource) {
        promptText += ` (note: we're using an alternative source of the same article since the original URL wasn't accessible)`;
      }
      
      promptText += ` from the URL: ${usedAlternativeSource ? alternativeSourceUrl : url}.`;
      
      promptText += ` Make sure to correctly identify and extract the original title of the article exactly as it appears in the source.`;
      
      promptText += `
      The extracted content from the article is provided below:
      
      Title: ${articleData.title}
      URL: ${usedAlternativeSource ? alternativeSourceUrl : url}
      
      Article Content:
      ${articleData.content.substring(0, 25000)}`;
      
      console.log('Preparing to send AI request for article summary...');
      
      // --- Use generateText to get the full response --- 
      const { text: aiResponseText } = await traceAICall(
        {
          name: 'summarize-article',
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: promptText }
          ],
          temperature: 0.2,
          extraParams: { url }
        },
        async () => {
          // --- Use generateText --- 
          return generateText({
            model: openai('gpt-4o'),
            system: systemPrompt,
            prompt: promptText,
            temperature: 0.2,
          });
        }
      );
  
      console.log('Received full AI response, length:', aiResponseText.length);
      console.log("First 100 chars:", aiResponseText.substring(0, 100));
  
      const headers = {
          'Content-Type': 'application/json; charset=utf-8'
      };

      // --- Parse the full AI response --- 
      let parsedResponse = null;
      try {
        const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
          console.log("Successfully parsed JSON from AI response");
        } else {
          throw new Error("Could not find JSON structure in AI response");
        }
      } catch (jsonError: unknown) {
        const errorMessage = jsonError instanceof Error ? jsonError.message : 'Unknown parsing error';
        console.error("Error parsing JSON from AI response:", jsonError);
        console.log("AI response format:", aiResponseText.substring(0, 500));
        // Return an error response to the client if parsing fails
        return new Response(JSON.stringify({ 
          error: `Failed to parse AI response as JSON: ${errorMessage}`,
          rawResponse: aiResponseText.substring(0, 1000) // Include snippet for debugging
        }), { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }

      if (!parsedResponse) {
        // Should ideally be caught above, but as a safeguard
        return new Response(JSON.stringify({ 
          error: "Unable to extract structured data from AI response (parsedResponse is null)",
          rawResponse: aiResponseText.substring(0, 1000)
        }), { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }

      // --- Store summary in background (using parsedResponse) --- 
      // Check if we have the necessary data to store
      if (url && parsedResponse) { // Check for parsedResponse as well
        console.log("Automatically storing article summary in database");
          
        // Process the response in the background to extract structured data
        // This won't block the stream to the client
        (async () => {
          try {
            // Map the response to our database schema according to the specified mapping
            const dataToStore = {
              url,
              title: parsedResponse.originalArticleTitle || parsedResponse.title || "",
              summarized_title: parsedResponse.summarizedTitle || "",
              source: getSourceFromUrl(url),
              publish_date: null, 
              summary: parsedResponse.visualSummary?.map((item: any) => item.point).join(' ') || "",
              visual_summary: parsedResponse.visualSummary || [],
              keywords: parsedResponse.keywords || [],
              // Keep study_metadata minimal for now
              study_metadata: {
                studyType: parsedResponse.cohortAnalysis?.typeOfStudy || parsedResponse.cohortAnalysis?.studyType || "",
                cohortSize: parsedResponse.cohortAnalysis?.cohortSize || 0,
                notes: parsedResponse.cohortAnalysis?.notes || []
                // Consider adding duration, dateRange if needed later
              },
              // Add top-level demographic fields matching DB columns
              age_demographics: { 
                distribution_raw: parsedResponse.cohortAnalysis?.ageDistribution 
                // TODO: Could add parsed ranges here if needed
              },
              gender_demographics: { 
                male: parsedResponse.cohortAnalysis?.gender?.male,
                female: parsedResponse.cohortAnalysis?.gender?.female,
                other: parsedResponse.cohortAnalysis?.gender?.other,
                // Keep geo separate or nest if needed by frontend
                geographicDistribution: parsedResponse.cohortAnalysis?.geographicDistribution
              },
              related_research: {
                supporting: [],
                contradictory: [],
                totalFound: 0,
                searchKeywords: parsedResponse.keywords || []
              },
              raw_content: articleData.content 
            };
            
            // Make internal API call to store the article
            const storeResponse = await fetch(new URL('/api/store-article-summary', req.url).toString(), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                // Forward the auth cookie for user identification
                'Cookie': req.headers.get('cookie') || ''
              },
              body: JSON.stringify(dataToStore)
            });
            
            if (storeResponse.ok) {
              const storeResult = await storeResponse.json();
              console.log("Article summary stored successfully:", storeResult);
            } else {
              const errorText = await storeResponse.text();
              console.error("Failed to store article summary:", storeResponse.status, errorText);
              // Don't throw error here, just log it, as client response already sent
            }
            
          } catch (processingError) {
            console.error("Error processing AI response for storage:", processingError);
            // Log the error for server-side debugging
          }
        })(); // Immediately invoke the async function for background processing
      }
        
      // --- Return the PARSED JSON response to the client --- 
      // This happens regardless of whether background storage was initiated or successful
      return new Response(JSON.stringify(parsedResponse), { headers }); 

    } catch (error) {
      console.error('Error generating summary:', error);
      return new Response(JSON.stringify({ error: 'Failed to summarize article' }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
  } catch (error) {
    console.error('Error in API route:', error);
    return new Response(JSON.stringify({ error: 'Failed to summarize article' }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
} 