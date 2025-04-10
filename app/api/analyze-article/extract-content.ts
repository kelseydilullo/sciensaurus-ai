import { JSDOM } from 'jsdom';

/**
 * Extracts article content from a URL
 * @param url The URL of the article to extract
 * @returns The extracted article data
 */
export async function extractContent(url: string) {
  try {
    console.log(`Extracting content from URL: ${url}`);
    
    // Fetch the article content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch article: ${response.status} ${response.statusText}`);
    }
    
    const htmlText = await response.text();
    console.log(`Successfully fetched article, length: ${htmlText.length} characters`);
    
    // Parse the HTML
    const dom = new JSDOM(htmlText);
    const document = dom.window.document;
    
    // Extract the title
    const title = extractTitle(htmlText) || url;
    
    // Extract the content
    const content = extractReadableContent(document);
    
    return {
      title,
      content,
      url
    };
  } catch (error: any) {
    console.error('Error extracting content:', error);
    return {
      error: error.message || 'Failed to extract content',
      url
    };
  }
}

/**
 * Extract the title from HTML
 * @param html The HTML content
 * @returns The extracted title or null
 */
function extractTitle(html: string): string | null {
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : null;
}

/**
 * Extract readable content from a document
 * @param document The DOM document
 * @returns The extracted readable content
 */
function extractReadableContent(document: Document): string {
  // Try to find common article content selectors
  const contentSelectors = [
    'article',
    '.article-content',
    '.article-body',
    '.post-content',
    '.entry-content',
    '.content',
    'main',
    '#main',
    '#content'
  ];
  
  // Try each selector
  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent && element.textContent.length > 200) {
      return element.textContent;
    }
  }
  
  // If no selectors matched, extract from the body
  return document.body.textContent || '';
} 