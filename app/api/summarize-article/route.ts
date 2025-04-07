import { openai } from '@ai-sdk/openai';
import { generateText, generateObject, streamText, tool } from 'ai';
import { z } from 'zod';
import { JSDOM } from 'jsdom';

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
    let systemPrompt = `You are a powerful research assistant with a skill for reading scientific research articles, and understanding what the key findings are from each article. You know how to read an article and provide a human with a TLDR that does not miss any pertinent results from the article. But you provide enough context in your summary that a human can quickly understand the scope and purpose of the study, as well as a clear report of the results/key findings.

    Take the URL provided, and summarize the content providing the following EXACTLY in this format:`;

    // Add original title section if requested
    if (extractOriginalTitle) {
      systemPrompt += `

    ### Original Article Title:
    [The exact original title of the article. Look for <h1> tags, metadata, or the most prominent heading. For scientific articles, make sure to capture the complete title.]`;
    }

    systemPrompt += `

    ### Summarized Title:
    [A concise, informative title that captures the main discovery or conclusion of the article. This will be displayed as the "AI Summary" on the page, so make it clear and impactful.]

    ### Visual Summary: 3-10 key points from the article (each starting with a relevant emoji that represents the content of that point). If there are percentages provided in the results or abstract section of the literature, make sure to include them in the summary. The first bullet point should describe what was studied. Make it easy to understand for non-experts.

    EXAMPLE ::: (do not use these emojis, use your own, and only use each emoji once):
    🧬 Novel mRNA-1273.351 vaccine candidate demonstrated 96.4% efficacy against the Beta variant in phase 3 clinical trials.
    🛡️ Neutralizing antibody titers were 4.3-fold higher against the Delta variant compared to the original vaccine formulation.
    ⏱️ Protection lasted at least 8 months post-vaccination with minimal waning of immunity observed.
    🔬 T-cell responses showed cross-reactivity against all tested variants, including Beta, Delta, and Omicron.
    💉 Side effect profile was similar to the original mRNA vaccines with no new safety concerns identified.
    🦠 Breakthrough infections were 76% less common with the new vaccine candidate compared to the original formulation.
    👵 Efficacy in adults over 65 years was 91.3%, showing strong protection in vulnerable populations.
    [Add more findings with relevant emojis as needed. Do not default to the same emoji for each key point. Do not use the same emoji for multiple key points.
    IMPORTANT: Each key point MUST start with a relevant emoji that represents the content of that point.
    Strike a balance between including scientific jargon and providing a summary that is easy to understand for non-experts. ]

    ### Keywords:
    [Generate 5-7 specific keywords that accurately represent the research interests of the article. These keywords will be used to find similar articles, so they must be specifically relevant to the research field, methods, or concepts.
    
    GUIDELINES FOR GOOD KEYWORDS:
    - Use specific scientific terms rather than generic ones
    - Include specialized research areas, techniques, or biological processes
    - Prefer multi-word technical terms that would be used by researchers in the field
    - Include specific gene names, diseases, or organisms that are central to the research
    - Include methodologies that are significant to the findings
    
    GOOD KEYWORD EXAMPLES:
    ✓ "intervertebral disc degeneration" (specific condition)
    ✓ "gut microbiome dysbiosis" (specific area of study)
    ✓ "CRISPR-Cas9" (specific technique)
    ✓ "ACE2 receptor" (specific biological component)
    ✓ "mesenchymal stem cells" (specific cell type)
    ✓ "chronic systemic inflammation" (specific physiological process)
    
    BAD KEYWORD EXAMPLES:
    ✗ "therapy" (too generic - specify what kind of therapy)
    ✗ "medical" (too vague)
    ✗ "research" (too vague)
    ✗ "health" (too broad)
    ✗ "study" (describes format, not content)
    ✗ "treatment" (too generic - what specific treatment?)
    
    Present keywords as a comma-separated list of specific, research-relevant terms. Each keyword should be precise enough that clicking on it would return meaningfully related articles.]
    
    ### Cohort Analysis:
    Type of study: [literature review, experiment, etc.]
    Duration: [duration of study if applicable]
    Date range: [date range of articles if literature review]
    Cohort size: [number of participants if applicable - use EXACT number from the article, do not estimate]
    
    Age Distribution:
    [IMPORTANT: Only provide age distribution if EXPLICITLY stated in the article. Use the same age ranges as in the article. DO NOT invent or guess percentages. If the article states exact numbers of participants in each age group, calculate the percentages accurately. If only some age information is provided (e.g., "11 out of 14 participants were over 60 years old"), use exactly that age grouping (e.g., "Under 60: 21.4%, 60+: 78.6%").]
    
    Gender:
    Male: [percentage - ONLY if explicitly stated in the article]%
    Female: [percentage - ONLY if explicitly stated in the article]%
    
    Geographic Distribution:
    [IMPORTANT: Only include regions explicitly mentioned in the article with their specific percentages. DO NOT invent regions or percentages.]
    
    Notes:
    - [Include any specific statements about participant demographics exactly as they appear in the article]
    - [Another important note if applicable]

    Make sure to include ALL the sections in the format above, even if some fields have limited or no information (indicate with "Not specified" or "Not applicable").
    Use semantic emojis at the start of each visual summary point that represent the content of that finding. Never use the same emoji twice.
    For keywords, focus on specific scientific topics, methodologies, or biological processes relevant to the article. Assess the quality of each keyword to ensure it would be valuable for finding similar research articles.
    
    IMPORTANT GUIDANCE ON DEMOGRAPHIC DATA:
    1. For the Cohort Analysis section, ONLY provide demographic information that is EXPLICITLY stated in the article.
    2. DO NOT make up, guess, or estimate demographic percentages if they are not clearly provided.
    3. If exact counts are given (e.g., "11 out of 14 participants"), convert to percentages accurately.
    4. If only qualitative descriptions are provided (e.g., "majority were female"), note this in text form exactly as stated.
    5. For age data, use the same age ranges as mentioned in the article - do not fit data into predefined ranges.
    6. If specific demographic statements exist but don't fit the structured format, include them verbatim in the Notes section.`;

    try {
      console.log('Generating summary as plain text...');
      
      let promptText = `Please summarize this scientific article`;
      
      if (usedAlternativeSource) {
        promptText += ` (note: we're using an alternative source of the same article since the original URL wasn't accessible)`;
      }
      
      promptText += ` from the URL: ${usedAlternativeSource ? alternativeSourceUrl : url}.`;
      
      if (extractOriginalTitle) {
        promptText += ` Make sure to correctly identify and extract the original title of the article exactly as it appears in the source.`;
      }
      
      promptText += `
      The extracted content from the article is provided below:
      
      Title: ${articleData.title}
      URL: ${usedAlternativeSource ? alternativeSourceUrl : url}
      
      Article Content:
      ${articleData.content.substring(0, 25000)}`;
      
      // Use streamText to generate a plain text response instead of structured object
      const response = streamText({
        model: openai('gpt-4o'),
        system: systemPrompt,
        prompt: promptText,
        temperature: 0.2,
      });
  
      console.log('Streaming response to client');
  
      // Return the response as a text stream with info about alternative source if used
      const headers = {
        'Content-Type': 'text/plain; charset=utf-8'
      };

      // Add automatic storage after streaming the response
      try {
        // Check if we have the necessary data to store
        if (url) {
          console.log("Automatically storing article summary in database");
          
          // We'll use a buffer to capture and parse the AI response
          // before sending to the storage API
          const responseBuffer = new TransformStream();
          const responseReader = responseBuffer.readable.getReader();
          
          // Clone the response to create a buffered copy we can read from
          // while still streaming the original to the client
          const responseBodyStream = response.toTextStreamResponse({ headers }).body;
          if (!responseBodyStream) {
            // Handle the case where response body is null
            console.error("Response body stream is null");
            return new Response("Error: No response body", { status: 500 });
          }
          
          const [responseForClient, responseForProcessing] = responseBodyStream.tee();
          
          // Pipe the response to our buffer for processing
          responseForProcessing.pipeTo(responseBuffer.writable).catch(error => {
            console.error('Error buffering response:', error);
          });
          
          // Process the response in the background to extract structured data
          // This won't block the stream to the client
          (async () => {
            try {
              let accumulatedText = '';
              const decoder = new TextDecoder();
              
              // Read chunks until stream is done
              while (true) {
                const { done, value } = await responseReader.read();
                if (done) break;
                
                accumulatedText += decoder.decode(value, { stream: true });
              }
              
              // Ensure final decoding
              accumulatedText += decoder.decode();
              
              console.log("Captured AI response, length:", accumulatedText.length);
              console.log("First 100 chars:", accumulatedText.substring(0, 100));
              
              // Extract structured data from the AI response text
              // Extract title
              let parsedTitle = '';
              const titleMatch = accumulatedText.match(/### Summarized Title:\s*([\s\S]*?)(?=###|$)/);
              if (titleMatch && titleMatch[1]) {
                parsedTitle = titleMatch[1].trim();
                console.log("Extracted title:", parsedTitle);
              }
              
              // Extract original title if available
              let originalTitle = '';
              const originalTitleMatch = accumulatedText.match(/### Original Article Title:\s*([\s\S]*?)(?=###|$)/);
              if (originalTitleMatch && originalTitleMatch[1]) {
                originalTitle = originalTitleMatch[1].trim();
                console.log("Extracted original title:", originalTitle);
              }
              
              // Use original title if available, otherwise use the parsed title or fall back to DB title
              const titleToStore = originalTitle || parsedTitle || articleData.title || url;
              
              // Extract visual summary points
              const visualSummaryPoints: Array<{emoji: string; point: string}> = [];
              const visualSummarySection = accumulatedText.match(/### Visual Summary:\s*([\s\S]*?)(?=###|$)/);
              if (visualSummarySection && visualSummarySection[1]) {
                const summaryText = visualSummarySection[1].trim();
                const points = summaryText
                  .split('\n')
                  .map(line => line.trim())
                  .filter(line => line && line !== '' && !line.startsWith('EXAMPLE') && !line.includes('[Add more findings'));
                
                for (const point of points) {
                  // Look for emoji + text format
                  const emojiMatch = point.match(/^(\p{Emoji})\s+(.+)$/u);
                  if (emojiMatch) {
                    visualSummaryPoints.push({
                      emoji: emojiMatch[1],
                      point: emojiMatch[2]
                    });
                  }
                }
                console.log(`Extracted ${visualSummaryPoints.length} visual summary points`);
              }
              
              // Extract keywords
              let keywords: string[] = [];
              const keywordsSection = accumulatedText.match(/### Keywords:\s*([\s\S]*?)(?=###|$)/);
              if (keywordsSection && keywordsSection[1]) {
                keywords = keywordsSection[1]
                  .split(',')
                  .map(keyword => keyword.trim())
                  .filter(keyword => 
                    keyword && 
                    keyword !== '' && 
                    !keyword.includes('GUIDELINES FOR GOOD KEYWORDS') &&
                    !keyword.includes('GOOD KEYWORD EXAMPLES') &&
                    !keyword.includes('BAD KEYWORD EXAMPLES') &&
                    !keyword.startsWith('✓') &&
                    !keyword.startsWith('✗')
                  );
                console.log(`Extracted ${keywords.length} keywords:`, keywords);
              }
              
              // Extract cohort analysis
              let studyMetadata = null;
              const cohortSection = accumulatedText.match(/### Cohort Analysis:\s*([\s\S]*?)(?=###|$)/);
              if (cohortSection && cohortSection[1]) {
                const cohortText = cohortSection[1].trim();
                
                // Extract structured cohort data
                const studyTypeMatch = cohortText.match(/Type of study:\s*([^\n]+)/);
                const durationMatch = cohortText.match(/Duration:\s*([^\n]+)/);
                const dateRangeMatch = cohortText.match(/Date range:\s*([^\n]+)/);
                const cohortSizeMatch = cohortText.match(/Cohort size:\s*([^\n]+)/);
                
                // Extract gender distribution
                const maleMatch = cohortText.match(/Male:\s*([0-9.]+)%/);
                const femaleMatch = cohortText.match(/Female:\s*([0-9.]+)%/);
                
                // Extract notes
                const notesMatches = [...cohortText.matchAll(/- ([^\n]+)/g)];
                const notes = notesMatches.map(match => match[1].trim());
                
                // Build study metadata object
                studyMetadata = {
                  studyType: studyTypeMatch ? studyTypeMatch[1].trim() : '',
                  duration: durationMatch ? durationMatch[1].trim() : '',
                  dateRange: dateRangeMatch ? dateRangeMatch[1].trim() : '',
                  cohortSize: cohortSizeMatch ? parseInt(cohortSizeMatch[1].trim(), 10) || 0 : 0,
                  cohortStratification: {
                    gender: {
                      male: maleMatch ? parseFloat(maleMatch[1]) : 0,
                      female: femaleMatch ? parseFloat(femaleMatch[1]) : 0,
                      other: 0 // Default to 0
                    },
                    ageRanges: [], // We'd need more complex parsing for this
                    demographics: [] // We'd need more complex parsing for this
                  },
                  notes: notes
                };
                console.log("Extracted study metadata");
              }
              
              // Create a summary from the visual summary points if available
              let parsedSummary = '';
              if (visualSummaryPoints.length > 0) {
                parsedSummary = visualSummaryPoints.map(item => item.point).join(' ');
              } else {
                // If we couldn't extract visual summary points, use the first part of the article content
                parsedSummary = articleData.content.substring(0, 1000);
              }
              
              // Get source based on URL
              let sourceToStore = '';
              try {
                const urlObj = new URL(url);
                sourceToStore = urlObj.hostname.replace('www.', '');
                
                // Make source more human-readable
                if (sourceToStore.includes('pubmed') || sourceToStore.includes('ncbi.nlm.nih.gov')) {
                  sourceToStore = 'PubMed';
                } else if (sourceToStore.includes('nature.com')) {
                  sourceToStore = 'Nature';
                } else if (sourceToStore.includes('sciencedirect')) {
                  sourceToStore = 'ScienceDirect';
                } else {
                  // Capitalize first letter of domain
                  sourceToStore = sourceToStore.split('.')[0];
                  sourceToStore = sourceToStore.charAt(0).toUpperCase() + sourceToStore.slice(1);
                }
              } catch (urlError) {
                console.warn("Error parsing URL for source:", urlError);
              }
              
              // Try to extract publish date if available
              let publishDate = null;
              try {
                // Use type assertion to access potential properties not in the type definition
                const anyArticleData = articleData as any;
                
                // Check if articleData has a direct publish date
                if (anyArticleData.publishDate || anyArticleData.publish_date) {
                  publishDate = anyArticleData.publishDate || anyArticleData.publish_date;
                } 
                // Special handling for PubMed/PMC articles which have a consistent citation format
                else if (url.includes('ncbi.nlm.nih.gov') || url.includes('pubmed') || url.includes('pmc')) {
                  console.log('Detected PubMed/PMC article, looking for citation with date format');
                  
                  // Look for the common publication citation format: Journal. YYYY Month DD
                  const pubmedCitationPattern = /Published in final edited form as:.*?(\d{4})[\s\.]+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\.]+(\d{1,2})/i;
                  const pubmedMatch = articleData.content.match(pubmedCitationPattern);
                  
                  if (pubmedMatch) {
                    const year = pubmedMatch[1];
                    let month = pubmedMatch[2];
                    const day = pubmedMatch[3];
                    
                    // Convert month name to number (Jan -> 0, Feb -> 1, etc.)
                    const monthMap: Record<string, number> = {
                      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
                      'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
                    };
                    
                    const monthNum = monthMap[month.toLowerCase().substring(0, 3)];
                    if (monthNum !== undefined) {
                      console.log(`Extracted publication date: ${year}-${monthNum+1}-${day}`);
                      publishDate = new Date(parseInt(year), monthNum, parseInt(day)).toISOString();
                    }
                  }
                  
                  // Alternative PMC citation format
                  if (!publishDate) {
                    const pmcCitationPattern = /Lancet\.\s+(\d{4})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})/i;
                    const pmcMatch = articleData.content.match(pmcCitationPattern);
                    
                    if (pmcMatch) {
                      const year = pmcMatch[1];
                      let month = pmcMatch[2];
                      const day = pmcMatch[3];
                      
                      // Convert month name to number
                      const monthMap: Record<string, number> = {
                        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
                        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
                      };
                      
                      const monthNum = monthMap[month.toLowerCase().substring(0, 3)];
                      if (monthNum !== undefined) {
                        console.log(`Extracted publication date from citation: ${year}-${monthNum+1}-${day}`);
                        publishDate = new Date(parseInt(year), monthNum, parseInt(day)).toISOString();
                      }
                    }
                  }
                }
                // Look for date in title or metadata
                if (!publishDate && articleData.content) {
                  // Common date patterns in scientific articles
                  const datePatterns = [
                    /Published(?:\s+online)?(?:\s*):?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
                    /Posted(?:\s+online)?(?:\s*):?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
                    /Date(?:\s*):?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
                    /(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
                    /([A-Za-z]+\s+\d{4})/i,
                    /(\d{4}-\d{2}-\d{2})/i,
                    /(\d{2}\/\d{2}\/\d{4})/i
                  ];
                  
                  // Try each pattern until we find a match
                  for (const pattern of datePatterns) {
                    const match = articleData.content.match(pattern);
                    if (match && match[1]) {
                      publishDate = match[1];
                      break;
                    }
                  }
                }
                
                // If we found a date, try to normalize it to ISO format
                if (publishDate) {
                  // If it's already a Date object, convert to ISO string
                  if (publishDate instanceof Date) {
                    // Check if date is in the future
                    const now = new Date();
                    if (publishDate > now) {
                      console.warn("Detected future date, setting to current date:", publishDate);
                      publishDate = new Date().toISOString();
                    } else {
                      publishDate = publishDate.toISOString();
                    }
                  } 
                  // If it's a string, try to parse it
                  else if (typeof publishDate === 'string') {
                    const parsedDate = new Date(publishDate);
                    // Check if it's a valid date and not in the future
                    if (!isNaN(parsedDate.getTime())) {
                      const now = new Date();
                      if (parsedDate > now) {
                        console.warn("Detected future date from string, setting to current date:", publishDate);
                        publishDate = new Date().toISOString();
                      } else {
                        publishDate = parsedDate.toISOString();
                      }
                    } else {
                      console.warn("Unparseable date format:", publishDate);
                      // Try to extract year and create a more reliable date
                      const yearMatch = publishDate.match(/\b(19|20)\d{2}\b/);
                      if (yearMatch) {
                        const year = parseInt(yearMatch[0]);
                        // Ensure year is not in the future
                        const currentYear = new Date().getFullYear();
                        if (year > currentYear) {
                          console.warn("Future year detected:", year);
                          publishDate = new Date(currentYear, 0, 1).toISOString();
                        } else {
                          publishDate = new Date(year, 0, 1).toISOString();
                        }
                      } else {
                        // If we can't parse it, default to null
                        publishDate = null;
                      }
                    }
                  }
                }
              } catch (dateError) {
                console.warn("Error extracting publish date:", dateError);
                publishDate = null;
              }
              
              // Prepare data for storage with parsed values
              const dataToStore = {
                url,
                title: titleToStore,
                source: sourceToStore,
                publish_date: publishDate,
                summary: parsedSummary,
                keywords: keywords,
                visual_summary: visualSummaryPoints,
                study_metadata: studyMetadata,
                // Leave related_research empty - will be populated by semantic-scholar-search
                related_research: {
                  supporting: [],
                  contradictory: [],
                  totalFound: 0,
                  searchKeywords: keywords
                },
                raw_content: articleData.content  // Store the full article content for reference
              };
              
              console.log("Prepared data to store:", {
                url: dataToStore.url,
                title: dataToStore.title,
                source: dataToStore.source,
                hasPublishDate: !!dataToStore.publish_date,
                summaryLength: dataToStore.summary.length,
                keywordsCount: dataToStore.keywords.length,
                visualSummaryCount: dataToStore.visual_summary.length,
                hasStudyMetadata: !!dataToStore.study_metadata
              });
              
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
              }
              
            } catch (processingError) {
              console.error("Error processing AI response:", processingError);
              
              // Fall back to storing just the article content if parsing fails
              try {
                const fallbackData = {
                  url,
                  title: articleData.title || url,
                  source: url.includes('pubmed') ? 'PubMed' : new URL(url).hostname.replace('www.', ''),
                  publish_date: null,
                  summary: articleData.content.substring(0, 1000),
                  keywords: [] as string[],
                  visual_summary: [] as any[],
                  study_metadata: null,
                  related_research: {
                    supporting: [],
                    contradictory: [],
                    totalFound: 0,
                    searchKeywords: []
                  },
                  raw_content: articleData.content
                };
                
                console.log("Falling back to storing basic article data");
                
                const fallbackResponse = await fetch(new URL('/api/store-article-summary', req.url).toString(), {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Cookie': req.headers.get('cookie') || ''
                  },
                  body: JSON.stringify(fallbackData)
                });
                
                if (fallbackResponse.ok) {
                  console.log("Fallback storage successful");
                } else {
                  console.error("Fallback storage failed:", await fallbackResponse.text());
                }
              } catch (fallbackError) {
                console.error("Even fallback storage failed:", fallbackError);
              }
            }
          })();
          
          // Return the original response to the client without waiting
          // for the background processing to complete
          return new Response(responseForClient, { headers });
        } else {
          console.warn("Missing required data for article storage");
          return response.toTextStreamResponse({ headers });
        }
      } catch (storageError) {
        console.error("Error in automatic article storage:", storageError);
        // Non-critical, don't throw error - we've already sent the response to the client
        return response.toTextStreamResponse({ headers });
      }
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