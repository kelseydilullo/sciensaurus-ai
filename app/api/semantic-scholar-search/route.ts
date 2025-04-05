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
    // Parse request data
    const body = await req.json();
    const { keywords, url, articleTitle } = body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: 'Keywords are required for finding related articles' },
        { status: 400 }
      );
    }

    // Try a specific keyword approach
    // Search for both main keywords and also add "limitations" or "risks" to find contradictory research
    let query = keywords[0];
    if (keywords.length > 1) {
      // If multiple keywords provided, use primary keyword
      query = keywords[0];
    }
    
    const limit = 20; // Limit to fewer articles for faster processing
    
    // Build Semantic Scholar API URL
    const apiUrl = `https://api.semanticscholar.org/graph/v1/paper/search`;
    const fields = 'title,url,abstract,venue,year,citationCount,openAccessPdf';
    const fullUrl = `${apiUrl}?query=${encodeURIComponent(query)}&limit=${limit}&fields=${fields}`;
    
    console.log(`Searching Semantic Scholar with query: ${query}`);
    
    // Call Semantic Scholar API
    const response = await fetch(fullUrl, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Semantic Scholar API error: ${response.status} - ${errorText}`);
    }

    const data: SemanticScholarResponse = await response.json();
    
    if (!data.data || data.data.length === 0) {
      console.log('No articles found from Semantic Scholar API');
      return NextResponse.json({
        totalFound: 0,
        supporting: [],
        contradictory: [],
        error: "No articles found from Semantic Scholar"
      });
    }

    console.log(`Found ${data.data.length} articles from Semantic Scholar`);
    
    // Filter for valid articles with abstracts
    let validArticles = data.data.filter(article => 
      article.title && 
      article.title.trim() !== '' && 
      article.url &&
      article.abstract &&
      article.abstract.trim().length >= 50 // Ensure abstract has meaningful content
    );
    
    console.log(`After basic filtering: ${validArticles.length} articles remain`);
    
    // Only filter out exact URL matches
    if (url) {
      validArticles = validArticles.filter(article => article.url !== url);
    }
    
    // Less strict title filtering - only filter out perfect matches
    if (articleTitle) {
      validArticles = validArticles.filter(article => 
        article.title.toLowerCase() !== articleTitle.toLowerCase()
      );
    }
    
    if (validArticles.length === 0) {
      console.log('No valid articles after filtering');
      return NextResponse.json({
        totalFound: 0,
        supporting: [],
        contradictory: [],
        error: "No valid articles found after filtering"
      });
    }

    // Process results to classify as supporting or contradictory
    console.log(`Starting classification of ${validArticles.length} articles`);
    
    try {
      // First, use a simple heuristic to identify potential contradictory articles
      const contradictoryKeywords = ['limitation', 'limitations', 'risk', 'risks', 'adverse', 
        'concern', 'concerns', 'contradict', 'contradicts', 'contrary', 'cautioned',
        'cautious', 'side effect', 'side effects', 'critique', 'criticized', 'negative',
        'drawback', 'drawbacks', 'restrict', 'restriction', 'restricted', 'failed',
        'harm', 'harmful', 'danger', 'dangerous'];
        
      // Separate articles that likely contain contradictory information based on title/abstract
      const potentialContradictory = validArticles.filter(article => {
        const textToSearch = `${article.title.toLowerCase()} ${article.abstract?.toLowerCase() || ''}`;
        return contradictoryKeywords.some(keyword => textToSearch.includes(keyword));
      });
      
      const potentialSupportive = validArticles.filter(article => {
        const textToSearch = `${article.title.toLowerCase()} ${article.abstract?.toLowerCase() || ''}`;
        return !contradictoryKeywords.some(keyword => textToSearch.includes(keyword));
      });
      
      console.log(`Heuristic identified ${potentialContradictory.length} potentially contradictory articles`);
      
      // Use AI to classify the rest
      const classifiedArticles = await classifyArticlesWithRetry([...potentialSupportive.slice(0, 10)], keywords, articleTitle);
      
      // Process potentially contradictory articles
      const contradictoryArticles = potentialContradictory.map(article => ({
        title: article.title,
        url: article.url || `https://www.semanticscholar.org/paper/${article.paperId}`,
        abstract: article.abstract,
        finding: "This research may highlight limitations or challenges related to the topic."
      }));
      
      // Combine results, ensuring we have both supporting and contradictory articles
      const finalResults = {
        supporting: classifiedArticles.supporting,
        contradictory: [...contradictoryArticles, ...classifiedArticles.contradictory].slice(0, 10)
      };
      
      console.log(`Final results: ${finalResults.supporting.length} supporting, ${finalResults.contradictory.length} contradictory`);
      
      return NextResponse.json({
        totalFound: data.total,
        ...finalResults,
      });
    } catch (error) {
      console.error('Classification failed, returning unclassified results:', error);
      
      // Fallback: use simple heuristic classification
      const supporting: Array<{title: string, url: string, abstract?: string, finding?: string}> = [];
      const contradictory: Array<{title: string, url: string, abstract?: string, finding?: string}> = [];
      
      const contradictoryKeywords = ['limitation', 'limitations', 'risk', 'risks', 'adverse', 
        'concern', 'concerns', 'contradict', 'contradicts', 'contrary', 'cautioned',
        'cautious', 'side effect', 'side effects', 'critique', 'criticized', 'negative',
        'drawback', 'drawbacks', 'restrict', 'restriction', 'restricted', 'failed',
        'harm', 'harmful', 'danger', 'dangerous'];
      
      validArticles.forEach(article => {
        const textToSearch = `${article.title.toLowerCase()} ${article.abstract?.toLowerCase() || ''}`;
        const isContradictory = contradictoryKeywords.some(keyword => textToSearch.includes(keyword));
        
        const item = {
          title: article.title,
          url: article.url || `https://www.semanticscholar.org/paper/${article.paperId}`,
          abstract: article.abstract,
          finding: isContradictory ? 
            "This research may highlight limitations or challenges related to the topic." : 
            "This article appears to be related to the research topic."
        };
        
        if (isContradictory) {
          contradictory.push(item);
        } else {
          supporting.push(item);
        }
      });
      
      return NextResponse.json({
        totalFound: data.total,
        supporting: supporting.slice(0, 10),
        contradictory: contradictory.slice(0, 10)
      });
    }
  } catch (error: unknown) {
    console.error('Error finding related articles:', error);
    
    return NextResponse.json({ 
      error: `Failed to fetch related articles: ${error instanceof Error ? error.message : 'Unknown error'}`,
      supporting: [],
      contradictory: [],
      totalFound: 0
    }, { status: 500 });
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
  const supporting: Array<{title: string, url: string, abstract?: string, finding?: string}> = [];
  const contradictory: Array<{title: string, url: string, abstract?: string, finding?: string}> = [];
  
  // For each article, classify using AI
  for (const article of articles) {
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
            Main topic: "${mainTopic}"
            ${mainArticleTitle ? `Main article title: "${mainArticleTitle}"` : ''}
            
            Related article title: "${article.title}"
            Related article abstract:
            "${abstract.substring(0, 1000)}"
            
            Based on the title and abstract, determine if this related article has findings that are:
            
            1. SUPPORTIVE of the main topic (expanding on it, confirming it, or providing additional evidence that aligns with the main topic)
            2. CONTRADICTORY to the main topic (challenging it, presenting opposite findings, or highlighting limitations or contrary evidence)
            
            Be critical and look for actual contradictions in methodology, findings, or conclusions.
            An article that merely discusses the topic without contradicting it should NOT automatically be classified as supportive.
            Only classify as supportive if it actually provides evidence or findings that support/align with the main topic.
            Similarly, only classify as contradictory if it provides evidence or findings that oppose/challenge the main topic.
            
            Look for phrases like "in contrast to", "challenges the notion", "contrary to", "fails to support", "did not find", "no significant effect", etc.

            For example, if the main topic is about benefits of intermittent fasting, and the article finds no benefits or negative effects, it should be classified as contradictory.
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
        classification = {
          isSupportive: true, // Default to supportive
          confidence: 0.5,
          explanation: "This article appears to be related to the research topic."
        };
      }
      
      // Extract first sentence for finding
      let finding = classification.explanation;
      if (finding && finding.includes('.')) {
        finding = finding.split('.')[0] + '.';
      }
      
      const articleData = {
        title: article.title,
        url: article.url || `https://www.semanticscholar.org/paper/${article.paperId}`,
        abstract: article.abstract,
        finding: finding
      };
      
      if (classification.isSupportive) {
        supporting.push(articleData);
      } else {
        contradictory.push(articleData);
      }
    } catch (error) {
      console.error(`Error processing article "${article?.title || 'unknown'}":`, error);
      // Skip problematic articles
      continue;
    }
  }
  
  console.log(`Final classification results: ${supporting.length} supporting, ${contradictory.length} contradictory`);
  
  return {
    supporting,
    contradictory
  };
} 