import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { traceAICall } from '@/utils/ai-config';

// Schema for article summary structure
const summarizedArticleSchema = z.object({
  title: z.string(),
  visualSummary: z.array(z.object({
    emoji: z.string(),
    point: z.string()
  })),
  keywords: z.array(z.string()),
  cohortAnalysis: z.object({
    studyType: z.string().optional(),
    duration: z.string().optional(),
    dateRange: z.string().optional(),
    cohortSize: z.number().optional(),
    demographics: z.object({
      gender: z.object({
        male: z.number().optional(),
        female: z.number().optional(),
        other: z.number().optional(),
      }).optional(),
      ageRanges: z.array(z.object({
        range: z.string(),
        percentage: z.number()
      })).optional(),
    }).optional(),
    notes: z.array(z.string()).optional()
  })
});

// Include the type for the result
type SummaryResult = z.infer<typeof summarizedArticleSchema>;

/**
 * Generate a summary from article content
 * @param content The article content to summarize
 * @returns The generated summary or an error
 */
export async function generateSummary(content: string) {
  try {
    console.log(`Generating summary for content of length: ${content.length}`);
    
    // Truncate content if it's too long
    const truncatedContent = content.length > 15000 
      ? content.substring(0, 15000) + "... [content truncated due to length]"
      : content;
    
    // System prompt for the AI
    const systemPrompt = `You are an AI research assistant that helps summarize scientific articles.
    Extract key information and provide a concise summary of the scientific article.
    Structure your output in the desired format with sections for Visual Summary, Keywords, and Methodology details.
    Be objective and accurate in your analysis.`;

    // Generate the summary using the AI
    const result = await traceAICall({
      name: 'generate-article-summary',
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Please analyze and summarize this scientific article content:\n\n${truncatedContent}` }
      ]
    }, () => 
      generateObject({
        model: openai('gpt-4'),
        schema: summarizedArticleSchema,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please analyze and summarize this scientific article content:\n\n${truncatedContent}` }
        ],
        temperature: 0.5,
        maxTokens: 2000,
      })
    );
    
    console.log('Summary generated successfully');
    
    // Use type assertion to access the properties
    const summaryData = result as unknown as SummaryResult;

    return {
      summary: summaryData,
      keywords: summaryData.keywords
    };
  } catch (error: any) {
    console.error('Error generating summary:', error);
    return {
      error: error.message || 'Failed to generate summary'
    };
  }
} 