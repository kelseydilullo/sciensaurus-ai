import axios from 'axios';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';
import { stopwords } from './stopwords';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the structure of our summary object
type ArticleSummary = {
  title: string;
  originalTitle?: string;
  keyPoints: string[];
  keywords: string[];
  searchProgress?: {
    stage: string;
    message: string;
    totalFound?: number;
  };
  relatedArticles: {
    supporting: Array<{
      title: string;
      url: string;
      abstract?: string;
    }>;
    contradictory: Array<{
      title: string;
      url: string;
      abstract?: string;
    }>;
  };
};

// Define Semantic Scholar API response types
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

export async function POST(req: Request) {
  try {
    // Get the data from the request body - read it once
    const requestData = await req.json();
    const { prompt: url, phase, keywords, title, keyPoints, originalTitle } = requestData;

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Phase 1: Extract keywords only
    if (phase === "keywords") {
    // Fetch the article content
      const { content: articleContent, originalTitle: fetchedTitle } = await fetchArticleContent(url);

    if (!articleContent) {
      return new Response(JSON.stringify({ error: 'Failed to fetch article content' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

      // First get the article summary and key points
      const summarizedArticle = await summarizeArticle(articleContent);
      
      if (!summarizedArticle) {
        return new Response(JSON.stringify({ error: 'Failed to summarize article' }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Extract keywords from the summary and key points
      const extractedKeywords = extractKeywords(summarizedArticle.title, summarizedArticle.keyPoints);
      
      // Add keywords to the summary and return
      const summaryWithKeywords = {
        ...summarizedArticle,
        originalTitle: fetchedTitle,
        keywords: extractedKeywords,
        searchProgress: {
          stage: 'extracting',
          message: 'Retrieving similar articles from Semantic Scholar API using the following keywords:',
        },
        relatedArticles: {
          supporting: [],
          contradictory: []
        }
      };
      
      return new Response(JSON.stringify(summaryWithKeywords), { 
        headers: { 'Content-Type': 'application/json' }
      });
    }
    // Phase 2: Complete with related articles
    else {
      // Keywords must be provided for phase 2
      if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
        return new Response(JSON.stringify({ error: 'Keywords are required for finding related articles' }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Find related articles
      const { supporting, contradictory, totalFound } = await findRelatedArticles(keywords);
      
      // Return the final response with related articles
      const fullResponse = {
        title,
        originalTitle,
        keyPoints,
        keywords,
        searchProgress: {
          stage: 'complete',
          message: `${totalFound} articles found in Semantic Scholar`,
          totalFound
        },
        relatedArticles: {
          supporting,
          contradictory
        }
      };
      
      return new Response(JSON.stringify(fullResponse), { 
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error generating summary:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate summary' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Function to summarize the article using OpenAI
async function summarizeArticle(articleContent: string): Promise<any> {
  const systemPrompt = `
    You are a visual summarizer for scientific articles. Given the following article content, create a visual summary that includes:
    1. A title that captures the essence of the article
    2. 3-5 key points from the article (each starting with a relevant emoji that represents the content of that point)

    Return your response as a valid JSON object with the following structure:
    {
      "title": "Article title",
      "keyPoints": ["📌 Point 1", "🔍 Point 2", "💡 Point 3"]
    }

    Make sure your response is a valid JSON object and nothing else.
    IMPORTANT: Each key point MUST start with a relevant emoji that represents the content of that point.
    Make your key points specific and detailed to capture the scientific findings accurately.
  `;

  try {
    // Use the OpenAI API to generate a completion
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Article content: ${articleContent}` }
      ],
      temperature: 0.7,
      stream: false,
    });

    // Extract the completion text
    const completion = response.choices[0]?.message?.content || '';
    
    try {
      // Validate that the completion is valid JSON
      return JSON.parse(completion);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      
      // Return an error instead of fallback response
      throw new Error('Failed to parse AI response as valid JSON. Please try again.');
    }
  } catch (openaiError) {
    console.error('OpenAI API error:', openaiError);
    
    // Return a specific error rather than mock data
    throw new Error(`OpenAI API error: ${openaiError.message || 'Unknown error'}`);
  }
}

// Extract meaningful keywords from title and key points
function extractKeywords(title: string, keyPoints: string[]): string[] {
  // Extract text from key points (remove emojis)
  const keyPointsText = keyPoints.map(point => 
    point.replace(/^[\u{1F300}-\u{1F6FF}]\s*/u, '').trim()
  );
  
  // Combine title and key points
  const allText = [title, ...keyPointsText].join(' ');
  
  // Tokenize and filter out common words, short words, and stopwords
  const words = allText.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(word => 
      word.length > 3 && // Longer than 3 chars
      !stopwords.includes(word) && // Not a stopword
      isNaN(Number(word)) // Not a number
    );
  
  // Get unique words
  const uniqueWords = [...new Set(words)];
  
  // Extract 2-3 word phrases that might be good search terms
  const phrases = [];
  for (let i = 0; i < keyPointsText.length; i++) {
    const text = keyPointsText[i].toLowerCase();
    // Find noun phrases (approximated by looking for 2-3 words without stopwords)
    const words = text.split(/\s+/);
    for (let j = 0; j < words.length - 1; j++) {
      if (!stopwords.includes(words[j]) && !stopwords.includes(words[j+1])) {
        phrases.push(`${words[j]} ${words[j+1]}`);
      }
      if (j < words.length - 2 && !stopwords.includes(words[j]) && 
          !stopwords.includes(words[j+1]) && !stopwords.includes(words[j+2])) {
        phrases.push(`${words[j]} ${words[j+1]} ${words[j+2]}`);
      }
    }
  }
  
  // Combine single keywords and phrases
  let keywords = [...uniqueWords.slice(0, 10), ...phrases.slice(0, 5)];
  
  // Ensure we don't have more than 10 keywords
  keywords = keywords.slice(0, 10);
  
  // Return array of keywords
  return keywords;
}

// Function to find related articles from Semantic Scholar
async function findRelatedArticles(keywords: string[]): Promise<{
  supporting: any[],
  contradictory: any[],
  totalFound: number
}> {
  try {
    // Combine keywords into search query for Semantic Scholar
    const query = keywords.slice(0, 5).join(' OR ');
    const limit = 100; // Limit results to 100 articles
    
    // Build Semantic Scholar API URL
    const apiUrl = `https://api.semanticscholar.org/graph/v1/paper/search/bulk`;
    const fields = 'title,url,abstract,venue,year,citationCount,openAccessPdf';
    const fullUrl = `${apiUrl}?query=${encodeURIComponent(query)}&limit=${limit}&fields=${fields}`;
    
    // Call Semantic Scholar API
    const response = await axios.get(fullUrl, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    const data: SemanticScholarResponse = response.data;
    
    // Calculate the total number of articles found (may be limited by API)
    const totalFound = Math.min(data.total, limit);
    
    // Process results to classify as supporting or contradictory
    const results = await classifyArticles(data.data, keywords);
    
    return {
      ...results,
      totalFound
    };
  } catch (error) {
    console.error('Error finding related articles:', error);
    
    // Return the actual error instead of fallback data
    throw new Error(`Failed to fetch related articles: ${error.message || 'Unknown error'}`);
  }
}

// Function to classify articles as supporting or contradictory
async function classifyArticles(articles: SemanticScholarPaper[], keywords: string[]): Promise<{
  supporting: any[],
  contradictory: any[]
}> {
  try {
    // Filter out articles with no title or URL
    const validArticles = articles.filter(article => article.title && article.url);
    
    if (validArticles.length === 0) {
      throw new Error('No valid articles found from search results');
    }
    
    // For now, we'll use a simple keyword-based approach to classify
    // In a real production app, you would use an AI model to better classify
    const supporting: Array<{title: string, url: string, abstract?: string}> = [];
    const contradictory: Array<{title: string, url: string, abstract?: string}> = [];
    
    // Extract a few articles for each category
    const maxArticles = 3; // Max articles per category
    let supportingCount = 0;
    let contradictoryCount = 0;
    
    // Shuffle array to get different results each time
    shuffleArray(validArticles);
    
    // Assign articles to categories
    for (const article of validArticles) {
      if (supporting.length >= maxArticles && contradictory.length >= maxArticles) {
        break; // We have enough articles for both categories
      }
      
      // Simplified classification logic
      // Alternate between categories for demonstration purposes
      if (supportingCount < maxArticles && (supporting.length <= contradictory.length)) {
        supporting.push({
          title: article.title,
          url: article.url || `https://www.semanticscholar.org/paper/${article.paperId}`,
          abstract: article.abstract
        });
        supportingCount++;
      } else if (contradictoryCount < maxArticles) {
        contradictory.push({
          title: article.title,
          url: article.url || `https://www.semanticscholar.org/paper/${article.paperId}`,
          abstract: article.abstract
        });
        contradictoryCount++;
      }
    }
    
    return {
      supporting,
      contradictory
    };
  } catch (error) {
    console.error('Error classifying articles:', error);
    throw new Error(`Failed to classify articles: ${error.message || 'Unknown error'}`);
  }
}

// Function to get article title from URL
async function getArticleTitle(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SciensaurusBot/1.0; +https://example.com/bot)'
      }
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    const title = $('title').text() || $('h1').first().text();
    
    return title || extractTitleFromUrl(url);
  } catch (error) {
    console.error(`Error fetching title for ${url}:`, error);
    return extractTitleFromUrl(url);
  }
}

// Generate search queries based on title and key points
function generateSearchQueries(title: string, keyPoints: string[]): string[] {
  const queries = [title];
  
  // Add each key point as a query
  keyPoints.forEach(point => {
    if (point && point.length > 10) {
      queries.push(point);
    }
  });
  
  return queries;
}

// Helper function to shuffle an array
function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Helper function to fetch and extract article content
async function fetchArticleContent(url: string): Promise<{content: string | null, originalTitle: string}> {
  try {
    // Attempt to fetch the article content
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SciensaurusBot/1.0; +https://example.com/bot)'
      }
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Remove script and style elements
    $('script, style, nav, header, footer, aside, .navigation, .menu, .sidebar, .comments').remove();
    
    // Extract the title
    const title = $('title').text() || $('h1').first().text() || '';
    
    // Try to get the main content using common selectors for article content
    const articleSelectors = [
      'article',
      '.article-content', 
      '.content',
      '#content',
      '.post-content',
      '.entry-content',
      '.main-content',
      'main'
    ];

    let content = '';
    // Try each selector to find the article content
    for (const selector of articleSelectors) {
      const selectedContent = $(selector).text();
      if (selectedContent && selectedContent.length > content.length) {
        content = selectedContent;
      }
    }
    
    // If no content was found with specific selectors, fallback to body
    if (!content || content.length < 100) {
      content = $('body').text();
    }
    
    // Clean up content (remove extra whitespace)
    content = content.replace(/\s+/g, ' ').trim();
    
    // Limit content length
    const maxLength = 8000;
    if (content.length > maxLength) {
      content = content.substring(0, maxLength) + '...';
    }
    
    // Only return content if we have enough to work with
    if (content.length < 100) {
      throw new Error('Could not extract sufficient content from the provided URL');
    }
    
    return { 
      content, 
      originalTitle: title
    };
  } catch (error) {
    console.error('Error fetching article content:', error);
    throw new Error(`Failed to fetch article content: ${error.message || 'Unknown error'}`);
  }
}

// Helper function to extract a readable title from a URL
function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Get the last part of the path
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      // Replace dashes and underscores with spaces and capitalize words
      return pathParts[pathParts.length - 1]
        .replace(/[-_]/g, ' ')
        .replace(/\.(html|php|aspx?)$/, '')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    // If no path parts, use the hostname
    return urlObj.hostname.replace('www.', '');
  } catch (e) {
    // If URL parsing fails, return a generic title
    return "Scientific Article";
  }
} 