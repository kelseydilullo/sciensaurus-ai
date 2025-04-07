import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';

// Use Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Define types for Semantic Scholar API
type SemanticScholarPaper = {
  paperId: string;
  title: string;
  url: string;
  abstract?: string;
  venue?: string;
  year?: number;
  citationCount?: number;
  openAccessPdf?: {
    url: string;
  };
};

type SemanticScholarResponse = {
  total: number;
  offset: number;
  next?: string;
  data: SemanticScholarPaper[];
};

// Schema for classification response
const ClassificationSchema = z.object({
  isSupportive: z.boolean(),
  confidence: z.number().min(0).max(1),
  explanation: z.string(),
});

export async function POST(req: Request) {
  try {
    // Parse the request body
    const body = await req.json();
    const { keywords, url, articleTitle } = body;
    
    // Validate input
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Keywords are required and must be an array of strings' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('Received search request with keywords:', keywords);
    
    // Build query string from keywords
    // Combine keywords with OR operator for broader results
    // Limit to 10 keywords max to avoid overly complex queries
    const trimmedKeywords = keywords.slice(0, 10).map(k => k.trim());
    const queryString = trimmedKeywords.join(' OR ');
    
    try {
      // First, try to fetch data from Semantic Scholar API
      const searchUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(queryString)}&limit=20&fields=title,abstract,url,year,citationCount,influentialCitationCount,isOpenAccess,authors,journal`;
      
      console.log('Fetching from Semantic Scholar:', searchUrl);
      
      const response = await fetch(searchUrl, {
        headers: {
          'x-api-key': process.env.SEMANTIC_SCHOLAR_API_KEY || ''
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Semantic Scholar API error:', response.status, errorText);
        throw new Error(`Semantic Scholar API error: ${response.status} - ${errorText || response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`Found ${data.total} results. Processing ${data.data?.length || 0} items.`);
      
      // Process the articles
      const articles = data.data || [];
      
      // Sort articles by citation count to get most impactful research first
      articles.sort((a: any, b: any) => (b.citationCount || 0) - (a.citationCount || 0));
      
      // Separate processed articles will be added to these arrays
      const supportingArticles: any[] = [];
      const contradictoryArticles: any[] = [];
      
      // Process articles in batches to avoid overwhelming the OpenAI API
      const batchSize = 4; // Process in batches of 4 articles
      for (let i = 0; i < Math.min(articles.length, 16); i += batchSize) {
        const batch = articles.slice(i, i + batchSize);
        
        // Process each batch concurrently
        const batchResults = await Promise.all(
          batch.map(async (article: any) => {
            try {
              if (!article.abstract) {
                return null; // Skip articles without abstracts
              }
              
              // Create a minimal representation of the article data for classification
              const articleData = {
                title: article.title,
                abstract: article.abstract ? article.abstract.slice(0, 1000) : "",
                year: article.year,
                journal: article.journal || "Unknown Journal",
                url: article.url || "",
                citationCount: article.citationCount || 0
              };
              
              // Classify article using OpenAI
              const classification = await classifySingleArticle(
                {
                  paperId: article.paperId || "",
                  title: article.title,
                  url: article.url || "",
                  abstract: article.abstract,
                  year: article.year,
                  citationCount: article.citationCount
                },
                keywords,
                articleTitle
              );
              
              // Format the result to match what the UI expects
              return {
                ...articleData,
                classification: classification.isSupportive ? 'supporting' : 'contradictory',
                finding: classification.articleData.finding
              };
            } catch (articleError) {
              console.error('Error processing article:', articleError);
              return null;
            }
          })
        );
        
        // Filter out nulls and add to appropriate category
        batchResults.filter(Boolean).forEach((result: any) => {
          if (result.classification === 'supporting') {
            supportingArticles.push(result);
          } else if (result.classification === 'contradictory') {
            contradictoryArticles.push(result);
          }
        });
      }
      
      console.log(`Classified ${supportingArticles.length} supporting and ${contradictoryArticles.length} contradictory articles`);
      
      // Return the results
      return new Response(JSON.stringify({
        supporting: supportingArticles,
        contradictory: contradictoryArticles,
        totalFound: data.total || 0,
        searchKeywords: trimmedKeywords
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (apiError: any) {
      console.error('API request error:', apiError);
      
      // More detailed error handling for connection issues
      let errorMessage = apiError.message || 'An error occurred while searching for related research';
      let statusCode = 500;
      
      // Check for specific network error patterns
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ECONNRESET')) {
        errorMessage = 'Connection to the research database was refused. This might be a temporary issue, please try again later.';
        statusCode = 503; // Service Unavailable
      } else if (errorMessage.includes('ETIMEDOUT')) {
        errorMessage = 'Connection to the research database timed out. This might be due to heavy traffic, please try again later.';
        statusCode = 504; // Gateway Timeout
      } else if (errorMessage.includes('ENOTFOUND')) {
        errorMessage = 'Could not resolve the research database hostname. Please check your network connection.';
        statusCode = 503;
      }
      
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error: any) {
    console.error('General error in semantic-scholar-search route:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to process related research request: ' + (error.message || 'Unknown error') 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Function to classify articles with retry capability
async function classifyArticlesWithRetry(
  articles: SemanticScholarPaper[], 
  keywords: string[],
  mainArticleTitle?: string,
  maxRetries = 2
): Promise<{
  supporting: Array<{title: string, url: string, abstract?: string, finding?: string}>,
  contradictory: Array<{title: string, url: string, abstract?: string, finding?: string}>
}> {
  console.log(`Starting parallel classification of ${articles.length} articles`);
  
  // Process all articles in parallel instead of sequentially
  const classificationPromises = articles.map(article => 
    classifySingleArticle(article, keywords, mainArticleTitle, maxRetries)
  );
  
  // Wait for all classifications to complete
  const classifiedArticles = await Promise.all(classificationPromises);
  
  // Separate into supporting and contradictory
  const supporting: Array<{title: string, url: string, abstract?: string, finding?: string}> = [];
  const contradictory: Array<{title: string, url: string, abstract?: string, finding?: string}> = [];
  
  classifiedArticles.forEach(result => {
    if (result.isSupportive) {
      supporting.push(result.articleData);
    } else {
      contradictory.push(result.articleData);
    }
  });
  
  console.log(`Parallel classification complete: ${supporting.length} supporting, ${contradictory.length} contradictory`);
  
  return {
    supporting,
    contradictory
  };
}

// Helper function to classify a single article
async function classifySingleArticle(
  article: SemanticScholarPaper,
  keywords: string[],
  mainArticleTitle?: string,
  maxRetries = 2
): Promise<{
  isSupportive: boolean;
  articleData: {title: string, url: string, abstract?: string, finding?: string}
}> {
  try {
    // Clean abstract for analysis
    const abstract = article.abstract || '';
    
    console.log(`Classifying article: "${article.title}"`);
    
    // Use a simplified approach for classification with retries
    let classification: { isSupportive: boolean; confidence: number; explanation: string } | null = null;
    let retryCount = 0;
    
    // Try multiple times to get a valid classification
    while (retryCount <= maxRetries && !classification) {
      try {
        const mainTopic = keywords.join(', ');
        
        const result = await generateObject({
          model: openai('gpt-3.5-turbo'),
          schema: ClassificationSchema,
          prompt: `
          I need your help classifying a scientific article in relation to a main research topic.
          
          Main topic: "${mainTopic}"
          ${mainArticleTitle ? `Main article title: "${mainArticleTitle}"` : ''}
          
          Related article title: "${article.title}"
          Related article abstract:
          "${abstract.substring(0, 1000)}"
          
          Your task is to decide if this related article is SUPPORTIVE or CONTRADICTORY to the main topic.
          
          USE THESE EXACT DEFINITIONS:
          - SUPPORTIVE: The article expands on, confirms, or provides additional evidence that aligns with the main topic
          - CONTRADICTORY: The article challenges, presents opposing findings, or highlights limitations/contrary evidence
          
          IMPORTANT: Your output must adhere to this exact format:
          {
            "isSupportive": boolean (true if supportive, false if contradictory),
            "confidence": number between 0 and 1,
            "explanation": string (1-2 sentences describing the specific finding)
          }
          
          Guidelines for your analysis:
          - Be critical and look for actual contradictions in methodology, findings, or conclusions
          - An article that merely discusses the topic without contradicting it is NOT automatically supportive
          - Only classify as supportive if it provides evidence or findings that genuinely support/align with the main topic
          - Only classify as contradictory if it provides evidence or findings that oppose/challenge the main topic
          
          Look for phrases indicating contradiction like:
          - "in contrast to", "challenges the notion", "contrary to", "fails to support"
          - "did not find", "no significant effect", "limitations", "risks", "adverse effects"
          
          For the explanation field:
          - Phrase the finding as a SPECIFIC CLAIM about the main topic 
          - DO NOT use phrases like "This study shows..." or "This research demonstrates..."
          - Instead, write the claim directly, e.g.: "Intermittent fasting improves metabolic health markers in adults with diabetes"
          - Focus on extracting the most relevant claim from the article related to the main topic
          - Keep the explanation to 1-2 sentences maximum
          `,
          temperature: 0.3
        });
        
        // Check if the result has the required properties
        if (result && 
            'isSupportive' in result && 
            'confidence' in result && 
            'explanation' in result &&
            typeof result.isSupportive === 'boolean' && 
            typeof result.confidence === 'number' && 
            typeof result.explanation === 'string') {
          
          classification = {
            isSupportive: result.isSupportive,
            confidence: result.confidence,
            explanation: result.explanation
          };
          
          console.log(`Classification successful for "${article.title}": ${classification.isSupportive ? 'Supportive' : 'Contradictory'} (confidence: ${classification.confidence})`);
        } else {
          console.log(`Invalid classification result on attempt ${retryCount + 1}, retrying...`);
          retryCount++;
        }
      } catch (e) {
        console.error(`Classification error on attempt ${retryCount + 1}:`, e);
        retryCount++;
        
        // Wait briefly before retrying
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // If we couldn't get a valid classification after retries, use a default
    if (!classification) {
      console.log(`Using default classification for "${article.title}"`);
      const defaultFinding = extractKeyFindings(article.title, abstract, keywords, true);
      classification = {
        isSupportive: true, // Default to supportive
        confidence: 0.5,
        explanation: defaultFinding
      };
    }
    
    // Use the full explanation as finding rather than just the first sentence
    // to provide more specific information about the article's relevance
    const articleData = {
      title: article.title,
      url: article.url || `https://www.semanticscholar.org/paper/${article.paperId}`,
      abstract: article.abstract,
      finding: classification.explanation
    };
    
    return {
      isSupportive: classification.isSupportive,
      articleData
    };
  } catch (error) {
    console.error(`Error processing article "${article?.title || 'unknown'}":`, error);
    // Return a default result for problematic articles
    const articleData = {
      title: article.title,
      url: article.url || `https://www.semanticscholar.org/paper/${article.paperId}`,
      abstract: article.abstract,
      finding: "Unable to determine the relationship to the main topic."
    };
    
    return {
      isSupportive: true, // Default to supportive
      articleData
    };
  }
}

/**
 * Extract key findings from article title and abstract when AI classification fails
 */
function extractKeyFindings(title: string, abstract: string, keywords: string[], isSupporting: boolean): string {
  // Clean and normalize text
  const cleanedTitle = title.trim().toLowerCase();
  const cleanedAbstract = abstract.trim().toLowerCase();
  const searchTerms = keywords.map(k => k.toLowerCase());
  
  // Extract sentences with keyword mentions
  const relevantSentences: string[] = [];
  const abstractSentences = cleanedAbstract.split(/[.!?]+/).filter(s => s.trim().length > 15);
  
  // Score sentences based on relevance
  const scoredSentences = abstractSentences.map(sentence => {
    let score = 0;
    // Higher score for sentences with keywords
    searchTerms.forEach(term => {
      if (sentence.includes(term)) score += 3;
    });
    
    // Higher score for sentences with result-related terms
    const resultTerms = ['found', 'showed', 'demonstrated', 'revealed', 'observed', 'concluded', 'suggests', 'indicates'];
    resultTerms.forEach(term => {
      if (sentence.includes(term)) score += 2;
    });
    
    // Higher score for sentences with measurement or comparison terms
    const measurementTerms = ['significant', 'increased', 'decreased', 'reduced', 'improved', 'higher', 'lower', 'greater', 'less'];
    measurementTerms.forEach(term => {
      if (sentence.includes(term)) score += 1;
    });
    
    return { sentence, score };
  });
  
  // Sort by score and get top sentences
  scoredSentences.sort((a, b) => b.score - a.score);
  
  // Get the most relevant sentences
  const topSentences = scoredSentences.filter(s => s.score > 0).slice(0, 2);
  relevantSentences.push(...topSentences.map(s => s.sentence));
  
  const primaryKeyword = searchTerms[0] || 'this topic';
  
  // If we found relevant sentences, use those
  if (relevantSentences.length > 0) {
    // Create a finding that focuses on the claim rather than just the information
    let sentence = relevantSentences[0].charAt(0).toUpperCase() + relevantSentences[0].slice(1);
    if (!sentence.endsWith('.')) sentence += '.';
    
    // Add a relationship phrase depending on whether it's supporting or contradicting
    if (isSupporting) {
      return sentence;
    } else {
      return sentence;
    }
  }
  
  // Default findings based on title if no sentences found
  if (isSupporting) {
    // Extract likely benefit or result from title
    if (cleanedTitle.includes('improve') || cleanedTitle.includes('increases') || 
        cleanedTitle.includes('enhances') || cleanedTitle.includes('benefits')) {
      return `${primaryKeyword} has beneficial effects on ${cleanedTitle.split(' ').slice(-3).join(' ')}.`;
    }
    
    // Check if it's a review article
    if (cleanedTitle.includes('review') || cleanedTitle.includes('meta-analysis') || cleanedTitle.includes('systematic')) {
      return `there is compiled evidence supporting various aspects of ${primaryKeyword}.`;
    }
    
    return `${primaryKeyword} positively affects ${cleanedTitle.split(' ').slice(-4).join(' ')}.`;
  } else {
    // Extract likely limitation from title
    if (cleanedTitle.includes('limitation') || cleanedTitle.includes('challenge') || 
        cleanedTitle.includes('risk') || cleanedTitle.includes('adverse')) {
      return `${primaryKeyword} has potential limitations or challenges in relation to ${cleanedTitle.split(' ').slice(-3).join(' ')}.`;
    }
    
    // Check if it's questioning effectiveness
    if (cleanedTitle.includes('does it') || cleanedTitle.includes('effectiveness') || 
        cleanedTitle.includes('efficacy') || cleanedTitle.includes('?')) {
      return `certain aspects of ${primaryKeyword} may not be as effective as commonly believed.`;
    }
    
    return `common assumptions about ${primaryKeyword} may need to be reconsidered based on new evidence.`;
  }
} 