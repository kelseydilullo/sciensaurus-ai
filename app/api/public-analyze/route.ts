import { NextResponse } from 'next/server';
import { extractContent } from '@/app/api/analyze-article/extract-content';
import { generateSummary } from '@/app/api/summarize-article/generate-summary';
import { searchRelatedResearch } from '@/app/api/semantic-scholar-search/search';
import { determineCurrentStep } from '@/utils/analysis-steps';
import { tracer } from '@/utils/tracing/config';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const trace = tracer.startTrace('public-analyze');
  
  try {
    trace.addEvent('request-received');
    const { url, step } = await req.json();
    
    if (!url) {
      trace.end({ error: 'Missing URL parameter' });
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    trace.addEvent('processing', { url, step });
    
    // Determine current step or default to first step
    const currentStep = step || 'retrievingContent';
    const currentStepIndex = determineCurrentStep(currentStep);
    
    // Based on the current step, perform the operation
    let response: any = { currentStep };
    
    if (currentStepIndex <= 1) { // retrievingContent
      trace.addEvent('extract-content-started');
      const extractionResult = await extractContent(url);
      trace.addEvent('extract-content-completed', { success: !!extractionResult.content });
      
      if (extractionResult.error) {
        trace.end({ error: extractionResult.error });
        return NextResponse.json({ error: extractionResult.error }, { status: 500 });
      }
      
      response = {
        ...response,
        title: extractionResult.title,
        content: extractionResult.content,
        currentStep: 'generatingSummary',
      };
    }
    
    if (currentStepIndex <= 2 && response.content) { // generatingSummary
      trace.addEvent('generate-summary-started');
      const summaryResult = await generateSummary(response.content);
      trace.addEvent('generate-summary-completed', { success: !!summaryResult.summary });
      
      if (summaryResult.error) {
        trace.end({ error: summaryResult.error });
        return NextResponse.json({ error: summaryResult.error }, { status: 500 });
      }
      
      response = {
        ...response,
        summary: summaryResult.summary,
        keywords: summaryResult.keywords || [],
        currentStep: 'extractingKeywords',
      };
    }
    
    if (currentStepIndex <= 3 && response.keywords) { // extractingKeywords
      // This step is just a transition since keywords are already extracted in the previous step
      response.currentStep = 'searchingSimilarArticles';
    }
    
    if (currentStepIndex <= 4 && response.keywords && response.keywords.length > 0) { // searchingSimilarArticles
      trace.addEvent('search-related-research-started');
      const searchResult = await searchRelatedResearch(response.keywords);
      trace.addEvent('search-related-research-completed', { 
        success: !!searchResult.results,
        totalFound: searchResult.results?.length || 0 
      });
      
      if (searchResult.error) {
        trace.end({ error: searchResult.error });
        return NextResponse.json({
          ...response,
          relatedResearch: {
            error: searchResult.error,
            searchKeywords: response.keywords,
          },
          currentStep: 'complete'
        });
      }
      
      // Process and categorize the results
      const supporting: any[] = [];
      const contradictory: any[] = [];
      
      // In public mode, we only populate supporting research
      if (searchResult.results && searchResult.results.length > 0) {
        // Include all results as supporting for public users
        searchResult.results.forEach((article: any) => {
          if (article.title && article.url) {
            supporting.push({
              title: article.title,
              url: article.url,
              journal: article.journal || 'Unknown Journal',
              year: article.year,
              finding: article.finding || 'Provides related evidence or context to this research.',
            });
          }
        });
      }
      
      response = {
        ...response,
        relatedResearch: {
          supporting,
          contradictory, // Empty array for public users
          totalFound: supporting.length + contradictory.length,
          searchKeywords: response.keywords,
        },
        currentStep: 'assessingResearch',
      };
    }
    
    if (currentStepIndex <= 5) { // assessingResearch
      // This is the final step, mark as complete
      response.currentStep = 'complete';
    }
    
    trace.end({ success: true });
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('Public analyze error:', error);
    trace.end({ error: error.message || 'Unknown error' });
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
} 