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
    
    // Default handling for all other URLs or if PubMed specific methods fail
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
    
    // Extract readable text content
    const dom = new JSDOM(htmlText);
    const articleContent = extractReadableContent(dom.window.document);
    
    return {
      title: extractTitle(htmlText) || url,
      content: articleContent,
      url,
      rawHtml: htmlText
    };
  } catch (error) {
    console.error('Error fetching article:', error);
    throw error;
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
    
    console.log('Article URL received:', url);
    console.log('Extract original title flag:', extractOriginalTitle);

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
    Cohort size: [number of participants if applicable]
    
    Notes:
    - [Important note or caveat about the study]
    - [Another important note if applicable]

    Make sure to include ALL the sections in the format above, even if some fields have limited or no information (indicate with "Not specified" or "Not applicable").
    Use semantic emojis at the start of each visual summary point that represent the content of that finding. Never use the same emoji twice.
    For keywords, focus on specific scientific topics, methodologies, or biological processes relevant to the article. Assess the quality of each keyword to ensure it would be valuable for finding similar research articles.`;

    try {
      console.log('Generating summary as plain text...');
      
      let promptText = `Please summarize this scientific article from the URL: ${url}.`;
      
      if (extractOriginalTitle) {
        promptText += ` Make sure to correctly identify and extract the original title of the article exactly as it appears in the source.`;
      }
      
      promptText += `
      The extracted content from the article is provided below:
      
      Title: ${articleData.title}
      URL: ${url}
      
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
  
      // Return the response as a text stream
      return response.toTextStreamResponse({
        headers: {
          'Content-Type': 'text/plain; charset=utf-8'
        }
      });
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