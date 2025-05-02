import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
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

// Re-added Helper to extract title from HTML
function extractTitle(document: Document): string | null {
  const titleElement = document.querySelector('title');
  return titleElement ? titleElement.textContent?.trim() || null : null;
}

// Re-added Helper to extract readable content from HTML DOM
function extractReadableContent(document: Document): string {
  // Remove script, style, nav, header, footer, aside elements
  ['script', 'style', 'nav', 'header', 'footer', 'aside', 'noscript', '.advertisement', '.ad', '[class*="ad-"]', '[id*="ad-"]'].forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => el.parentNode?.removeChild(el));
  });
  
  // Try to find the article content in common article containers
  const possibleContentSelectors = [
    'article',
    '.article-body',
    '.article__body',
    '.article-content',
    '.article',
    'main[role="main"]',
    'main',
    '.main-content',
    '.content',
    '.post-content',
    '#article-content',
    '#content',
    '.entry-content',
    '.post',
    // PubMed specific (example)
    '#abstract',
    '#full-text-body'
  ];
  
  let contentElement: Element | null = null;
  
  for (const selector of possibleContentSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      // Find the element with the most direct text content length
      let largestElement = elements[0];
      let maxTextLength = 0;
      elements.forEach(el => {
          const directTextLength = Array.from(el.childNodes)
                                     .filter(node => node.nodeType === Node.TEXT_NODE)
                                     .map(node => node.textContent?.trim().length || 0)
                                     .reduce((a, b) => a + b, 0);
          if (directTextLength > maxTextLength) {
              maxTextLength = directTextLength;
              largestElement = el;
          }
      });

      // Fallback to total text length if no direct text found
      if (maxTextLength === 0) {
        elements.forEach(el => {
          const textLength = el.textContent?.length || 0;
        if (textLength > maxTextLength) {
          maxTextLength = textLength;
            largestElement = el;
        }
        });
      }
      
      contentElement = largestElement;
      console.log(`Found potential content container using selector: ${selector}`);
      break;
    }
  }
  
  // If no specific container found, fall back to body, but try to be smarter
  if (!contentElement) {
    contentElement = document.body;
    console.log('No specific content container found, using document.body as fallback.');
  }
  
  let content = '';
  const acceptableTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'PRE', 'TD', 'TH'];

  // Function to recursively extract text from acceptable nodes
  function extractTextNodes(element: Element) {
    if (element.nodeType === Node.ELEMENT_NODE) {
      // Check if tag is acceptable
      if (acceptableTags.includes(element.tagName)) {
        const text = element.textContent?.trim();
        // Basic filtering (ignore short paragraphs, code snippets often in 'pre')
        if (text && (element.tagName === 'PRE' || text.length > 25 || element.tagName.startsWith('H'))) {
          if (element.tagName.startsWith('H')) {
            content += `\n## ${text}\n\n`;
          } else if (element.tagName === 'LI') {
             content += `* ${text}\n`;
          } else {
      content += `${text}\n\n`;
    }
  }
      } else {
        // Recursively process children even if parent tag is not directly acceptable (e.g., DIV wrapping P tags)
        element.childNodes.forEach(child => {
          if (child.nodeType === Node.ELEMENT_NODE) {
            extractTextNodes(child as Element);
          }
        });
      }
    }
  }

  extractTextNodes(contentElement);

  // Final cleanup: remove excessive newlines
  content = content.replace(/\n{3,}/g, '\n\n').trim();

  // If extraction yielded very little, return body text as last resort
  if (content.length < 200) {
      console.warn('Specific content extraction yielded minimal text, falling back to full body text content.');
      return document.body.textContent?.replace(/\s{2,}/g, ' ').trim() || '';
  }

  return content;
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
    
    console.log('Article URL received:', url);

    // Input validation
    if (!url) {
      console.error('No URL provided');
      return new Response(JSON.stringify({ error: 'URL is required' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // --- Fetch and parse article content using ZenRows (JS Render only) ---
    const zenRowsApiKey = process.env.ZENROWS_API_KEY;
    if (!zenRowsApiKey) {
      console.error('ZenRows API key is missing. Please set ZENROWS_API_KEY environment variable.');
      return new Response(JSON.stringify({ error: 'Server configuration error: Missing API key.' }), {
        status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

    // Construct the ZenRows URL with js_render only (removed autoparse)
    const zenRowsUrl = `https://api.zenrows.com/v1/?apikey=${zenRowsApiKey}&url=${encodeURIComponent(url)}&js_render=true`;

    console.log(`Fetching article HTML via ZenRows (JS Render Enabled): ${url}`);
    let articleData: { title: string; content: string; url: string }; // Define structure

    try {
      const zenResponse = await fetch(zenRowsUrl, {
        // Removed 'Accept': 'application/json' as we expect HTML now
      });

      if (!zenResponse.ok) {
        // Attempt to read error response from ZenRows
        let errorBody = 'Unknown ZenRows error';
        try {
          errorBody = await zenResponse.text(); // Get error text
        } catch (_) { /* ignore */ }
        console.error(`ZenRows API error: ${zenResponse.status} ${zenResponse.statusText}`, errorBody);
        // Check for specific error suggesting autoparse again (shouldn't happen now, but good practice)
        if (errorBody.includes('autoparse')) {
            throw new Error(`ZenRows failed (${zenResponse.status}): Suggests using autoparse, but it failed previously. URL: ${url}`);
        } else {
            throw new Error(`Failed to fetch article HTML via ZenRows: ${zenResponse.status} - Check server logs.`);
        }
      }

      const htmlText = await zenResponse.text(); // Get the HTML text
      console.log(`Received HTML from ZenRows, length: ${htmlText.length}`);

      // Parse the HTML using JSDOM
      const dom = new JSDOM(htmlText);
      const document = dom.window.document;

      // Extract title and content using our helper functions
      const title = extractTitle(document) || url; // Use extracted title or fallback to URL
      const content = extractReadableContent(document);

      if (!content || content.length < 100) { // Check if content extraction failed or yielded too little
         console.warn(`Custom content extraction failed or yielded minimal text for ${url}.`);
         // Throw an error if extraction is unsatisfactory
         throw new Error(`Failed to extract sufficient readable content from the article HTML.`);
      }

      articleData = {
        title: title,
        content: content,
        url: url // Use the original requested URL
      };

      console.log('Article title (extracted):', articleData.title);
      console.log('Content length (extracted):', articleData.content.length);

    } catch (error: any) {
      console.error('Error fetching or processing article via ZenRows/JSDOM:', error);
          return new Response(JSON.stringify({ 
        error: `Failed to process article: ${error.message}`,
            url: url 
          }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' }
          });
        }
    // --- End Fetch/Parse ---

    // --- Prepare prompt for OpenAI ---
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
      console.log('Generating summary as JSON using extracted content...');

      // Construct prompt using data extracted by our functions
      let promptText = `Please summarize this scientific article from the URL: ${url}.`;
      promptText += ` Make sure to correctly identify and extract the original title of the article exactly as it appears in the source, using the title provided below as a reference if needed.`;
      promptText += `

      The extracted content from the article is provided below:
      
      Title (extracted from source): ${articleData.title}
      URL: ${articleData.url}
      
      Article Content:
      ${articleData.content.substring(0, 25000)}`; // Use content extracted by JSDOM
      
      console.log('Preparing to send AI request for article summary...');
      
      // --- Use generateText to get the full response --- 
      const { text: aiResponseText } = await traceAICall(
        {
          name: 'summarize-article-zenrows-jsdom', // Updated trace name again
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: promptText }
          ],
          temperature: 0.2,
          extraParams: { url }
        },
        async () => {
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
      if (url && parsedResponse) {
        console.log("Automatically storing article summary in database");
          
        (async () => {
          try {
            const dataToStore = {
              url,
              title: parsedResponse.originalArticleTitle || articleData.title || "", // Uses extracted title
              summarized_title: parsedResponse.summarizedTitle || "",
              source: getSourceFromUrl(url),
              publish_date: null, 
              summary: parsedResponse.visualSummary?.map((item: any) => item.point).join(' ') || "",
              visual_summary: parsedResponse.visualSummary || [],
              keywords: parsedResponse.keywords || [],
              study_metadata: {
                studyType: parsedResponse.cohortAnalysis?.typeOfStudy || parsedResponse.cohortAnalysis?.studyType || "",
                cohortSize: parsedResponse.cohortAnalysis?.cohortSize || 0,
                notes: parsedResponse.cohortAnalysis?.notes || []
              },
              age_demographics: { 
                distribution_raw: parsedResponse.cohortAnalysis?.ageDistribution 
              },
              gender_demographics: { 
                male: parsedResponse.cohortAnalysis?.gender?.male,
                female: parsedResponse.cohortAnalysis?.gender?.female,
                other: parsedResponse.cohortAnalysis?.gender?.other,
                geographicDistribution: parsedResponse.cohortAnalysis?.geographicDistribution
              },
              related_research: {
                supporting: [],
                contradictory: [],
                totalFound: 0,
                searchKeywords: parsedResponse.keywords || []
              },
              raw_content: articleData.content // Store the content extracted by JSDOM
            };
            
            // Make internal API call to store the article
            const storeResponse = await fetch(new URL('/api/store-article-summary', req.url).toString(), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
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
            console.error("Error processing AI response for storage:", processingError);
          }
        })();
      }
        
      // --- Return the PARSED JSON response to the client --- 
      return new Response(JSON.stringify(parsedResponse), {
          status: 200,
          headers: headers
      });

    } catch (error: any) {
      console.error('Error during AI processing:', error);
      return new Response(JSON.stringify({ error: `AI processing error: ${error.message}` }), {
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

  } catch (error: any) {
    console.error('Unhandled error in POST /api/summarize-article:', error);
    return new Response(JSON.stringify({ error: `Unexpected server error: ${error.message}` }), {
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
} 