import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { traceAICall } from '@/utils/ai-config';

// Define a schema for search results
const searchResultSchema = z.object({
  results: z.array(z.object({
    title: z.string(),
    url: z.string(),
    journal: z.string().optional(),
    year: z.number().optional(),
    finding: z.string().optional(),
  }))
});

// Type for search result
type SearchResult = z.infer<typeof searchResultSchema>;

/**
 * Search for related research based on keywords
 * @param keywords Array of keywords to search for
 * @returns The search results or an error
 */
export async function searchRelatedResearch(keywords: string[]) {
  try {
    console.log(`Searching for related research with keywords: ${keywords.join(', ')}`);
    
    // For demonstration, this is a simplified implementation without real search
    // In a production environment, this would call an actual search API
    
    // Simulate a search query based on keywords
    const searchQuery = keywords.join(' OR ');
    
    // Use AI to generate simulated search results
    const result = await traceAICall({
      name: 'semantic-scholar-search',
      model: 'gpt-4',
      prompt: `Generate simulated research article search results for: ${searchQuery}`
    }, () => 
      generateObject({
        model: openai('gpt-4'),
        schema: searchResultSchema,
        messages: [
          { 
            role: 'system', 
            content: `You are a scientific research assistant that helps find related research articles.
            Given a set of keywords, generate a list of simulated research articles that would be relevant.
            Create titles, journal names, years (between 2010-2023), and a brief finding for each article.
            Make these articles realistic, diverse, and relevant to the provided keywords.
            Generate 3-7 articles for the query.` 
          },
          { 
            role: 'user', 
            content: `Find related research articles for these keywords: ${keywords.join(', ')}`
          }
        ],
        temperature: 0.7,
        maxTokens: 1500,
      })
    );
    
    // Use type assertion to access the properties
    const searchData = result as unknown as SearchResult;
    
    console.log(`Found ${searchData.results.length} related research articles`);
    
    return {
      results: searchData.results,
      keywords
    };
  } catch (error: any) {
    console.error('Error searching for related research:', error);
    return {
      error: error.message || 'Failed to search for related research',
      keywords
    };
  }
} 