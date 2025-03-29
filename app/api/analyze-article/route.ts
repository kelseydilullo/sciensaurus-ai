import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

// Use Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Simple approach to fetch article content with enhanced PubMed support
async function fetchArticleContent(url: string) {
  try {
    console.log(`Fetching article content from: ${url}`);
    
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
            
            return {
              title: extractTitle(pmcText),
              content: pmcText,
              url: pmcUrl
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
              
              return {
                title,
                content: combinedContent,
                url
              };
            }
          }
        } catch (error) {
          console.warn('Error fetching from EFetch API:', error);
        }
      }
    }
    
    // Default handling for all other URLs or if PubMed specific methods fail
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch article: ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    console.log(`Successfully fetched article, length: ${text.length} characters`);
    
    return {
      title: extractTitle(text) || url,
      content: text,
      url
    };
  } catch (error) {
    console.error('Error fetching article:', error);
    throw error;
  }
}

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

export async function POST(req: Request) {
  try {
    console.log('Received article analysis request');
    const body = await req.json();
    const url = body.url;
    
    console.log('Article URL received:', url);

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
    try {
      articleData = await fetchArticleContent(url);
      console.log('Article title:', articleData.title);
      console.log('Content length:', articleData.content.length);
    } catch (error) {
      console.error('Error fetching article:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch article' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // The prompting system for analyzing scientific articles
    const systemPrompt = `You are a scientific research assistant that helps users understand complex scientific papers.
    Given the HTML and/or XML content of a scientific article, extract the relevant information and provide a comprehensive analysis with the following sections:
    1. Summary: A concise overview of the research (5-7 bullet points)
    2. Key Findings: The most important discoveries and conclusions
    3. Methodology: How the research was conducted
    4. Limitations: Any limitations or caveats mentioned in the research
    5. Significance: Why this research matters in the broader scientific context
    
    Make your analysis accessible to a non-specialist with college-level education.
    Use emoji icons where appropriate to highlight important points.
    
    If you cannot extract enough information from the provided content, explain what's missing and suggest what the user might do to find more complete information.`;

    // Use AI SDK's streamText function to handle streaming
    console.log('Preparing to send data to OpenAI');
    
    const userPrompt = `Please analyze this scientific article:
    
    Title: ${articleData.title}
    URL: ${url}
    
    The content from the webpage is provided below. First extract the scientific article's text from the HTML/XML, then analyze it:
    
    ${articleData.content.substring(0, 50000)}`; // Allow larger content for better analysis
    
    console.log('Sending request to OpenAI with prompt length:', userPrompt.length);
    
    // Use streamText for streaming response
    const response = streamText({
      model: openai('gpt-4'),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.5,
      maxTokens: 2000,
    });

    // Return the response as a text stream
    return response.toTextStreamResponse();
  } catch (error) {
    console.error('Error in API route:', error);
    return new Response(JSON.stringify({ error: 'Failed to analyze article' }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
} 