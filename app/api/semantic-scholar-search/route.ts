import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { traceAICall } from '@/utils/ai-config';

// Use Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Define type for PubMed ESummary result item
// (Structure based on common ESummary JSON format)
type PubMedArticleSummary = {
  uid: string; // PMID
  pubdate: string;
  epubdate: string;
  source: string; // Journal
  authors: { name: string }[];
  lastauthor: string;
  title: string;
  sorttitle: string;
  volume: string;
  issue: string;
  pages: string;
  lang: string[];
  issn: string;
  essn: string;
  pubtype: string[];
  recordstatus: string;
  pubstatus: string;
  articleids: { idtype: string; idtypen: number; value: string }[];
  history: { pubstatus: string; date: string }[];
  references: any[];
  attributes: string[];
  pmcrefcount: number;
  fulljournalname: string;
  elocationid: string;
  doctype: string;
  srccontriblist: any[];
  booktitle: string;
  medium: string;
  edition: string;
  publisherlocation: string;
  publishername: string;
  srcdate: string;
  reportnumber: string;
  availablefromurl: string;
  locationlabel: string;
  doccontriblist: any[];
  docdate: string;
  bookname: string;
  chapter: string;
  sortpubdate: string;
  sortfirstauthor: string;
  vernaculartitle: string;
  // Abstract might not be directly in summary, depends on request/availability
  // We will primarily use Title for classification prompt
};

// Define the structure for classified articles (adapted for PubMed)
const ClassifiedArticleSchema = z.object({
  pmid: z.string(), // Changed from paperId
  title: z.string(),
  url: z.string().optional().nullable(), // PubMed URL
  authors: z.array(z.string()).optional().nullable(), // Store author names
  journal: z.string().optional().nullable(), // Store journal source
  pubDate: z.string().optional().nullable(), // Store publication date
  classification: z.enum(['Supporting', 'Contradictory', 'Neutral']),
  classificationReason: z.string(),
  // Removed: abstract, tldr, publicationTypes (less reliable from ESummary)
});

// Schema for the bulk classification response from OpenAI
const BulkClassificationSchema = z.object({
  supporting: z.array(ClassifiedArticleSchema),
  contradictory: z.array(ClassifiedArticleSchema),
  neutral: z.array(ClassifiedArticleSchema),
});

// Define the type based on the schema
type ClassifiedArticle = z.infer<typeof ClassifiedArticleSchema>;

const NCBI_API_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const NCBI_API_KEY = process.env.NCBI_API_KEY; // Optional API key

async function makeNcbiRequest(endpoint: string, params: Record<string, string>) {
  const url = new URL(`${NCBI_API_BASE}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));
  if (NCBI_API_KEY) {
    url.searchParams.append('api_key', NCBI_API_KEY);
  }
  console.log(`Fetching from NCBI E-utilities: ${url.toString()}`);
  const response = await fetch(url.toString());
  if (!response.ok) {
    const errorText = await response.text();
    console.error('NCBI API error:', response.status, errorText);
    throw new Error(`NCBI API error (${endpoint}): ${response.status} - ${errorText || response.statusText}`);
  }
  return response.json();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { keywords, mainArticleTitle, mainArticleFindings } = body;

    // --- Input Validation ---
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ error: 'Keywords are required' }, { status: 400 });
    }
    if (!mainArticleTitle || typeof mainArticleTitle !== 'string') {
      return NextResponse.json({ error: 'Main article title is required' }, { status: 400 });
    }
    if (!mainArticleFindings || !Array.isArray(mainArticleFindings) || mainArticleFindings.length === 0) {
      return NextResponse.json({ error: 'Main article findings are required' }, { status: 400 });
    }

    console.log('Received search request with keywords:', keywords);
    console.log('Main article title:', mainArticleTitle);

    // --- PubMed ESearch API Call ---
    const trimmedKeywords = keywords.slice(0, 10).map(k => k.trim());
    const searchQuery = trimmedKeywords.join(' ');
    let pmids: string[] = [];
    let totalFound = 0;

    try {
      const esearchParams = {
        db: 'pubmed',
        term: searchQuery,
        retmax: '10',
        retmode: 'json',
        usehistory: 'y' // Good practice
      };
      const esearchResult = await makeNcbiRequest('esearch.fcgi', esearchParams);
      
      pmids = esearchResult?.esearchresult?.idlist || [];
      totalFound = parseInt(esearchResult?.esearchresult?.count || '0', 10);
      console.log(`PubMed ESearch: Found ${totalFound} results. Got ${pmids.length} PMIDs.`);

    } catch (apiError: any) {
      console.error('PubMed ESearch request failed:', apiError);
      return NextResponse.json({
          error: `Failed to search PubMed: ${apiError.message || 'Unknown API error'}`,
          supporting: [], contradictory: [], neutral: [], totalFound: 0, searchKeywords: trimmedKeywords
      }, { status: 503 });
    }

    if (pmids.length === 0) {
        console.log('No relevant PMIDs found by PubMed ESearch.');
        return NextResponse.json({
            supporting: [], contradictory: [], neutral: [], totalFound: totalFound, searchKeywords: trimmedKeywords
        }, { status: 200 });
    }

    // --- PubMed ESummary API Call ---
    let articlesData: Record<string, PubMedArticleSummary> = {};
    try {
      const esummaryParams = {
        db: 'pubmed',
        id: pmids.join(','),
        retmode: 'json'
      };
      const esummaryResult = await makeNcbiRequest('esummary.fcgi', esummaryParams);
      articlesData = esummaryResult?.result || {};
      // Filter out the 'uids' entry which is just a list of IDs
      delete articlesData.uids;
      console.log(`PubMed ESummary: Retrieved details for ${Object.keys(articlesData).length} PMIDs.`);

    } catch (apiError: any) {
      console.error('PubMed ESummary request failed:', apiError);
      // Proceed with classification using only titles if summary fails?
      // For now, return error.
      return NextResponse.json({
          error: `Failed to retrieve PubMed summaries: ${apiError.message || 'Unknown API error'}`,
          supporting: [], contradictory: [], neutral: [], totalFound: totalFound, searchKeywords: trimmedKeywords
      }, { status: 503 });
    }

    // --- Prepare Data for OpenAI --- 
    // Map the PubMed summary data
    const articlesForPrompt = Object.values(articlesData).map(article => ({
        pmid: article.uid,
        title: article.title || 'No Title Available',
        // Construct PubMed URL
        url: `https://pubmed.ncbi.nlm.nih.gov/${article.uid}/`,
        authors: article.authors?.map(a => a.name) || [],
        journal: article.source || null,
        pubDate: article.pubdate || null,
        // Abstract is often missing or truncated in ESummary, so we rely on title mostly
    }));

    if (articlesForPrompt.length === 0) {
      console.log('No article details could be prepared for OpenAI prompt.');
       return NextResponse.json({
            supporting: [], contradictory: [], neutral: [], totalFound: totalFound, searchKeywords: trimmedKeywords
        }, { status: 200 });
    }

    // --- OpenAI Bulk Classification --- 
    // Adjust prompt for PubMed data (mainly title, maybe authors/journal)
    const classificationPrompt = `
      You are an expert research assistant. Your task is to classify a list of research papers from PubMed based on whether they support, contradict, or are neutral towards the findings of a main reference article.

      Main Article Title: "${mainArticleTitle}"
      Main Article Key Findings:
      ${mainArticleFindings.map(f => `- ${f}`).join('\n')}

      Research Papers from PubMed to Classify (primarily use Title for classification):
      ${JSON.stringify(articlesForPrompt, null, 2)}

      Instructions:
      1. For each PubMed paper in the list, compare its Title (and other available metadata like authors, journal, pubDate if helpful) to the main article's title and key findings.
      2. Determine if the paper primarily SUPPORTS the main article's findings, CONTRADICTS them, or is NEUTRAL (e.g., related but doesn't directly support or contradict, different focus).
      3. Provide a concise, one-sentence reason for your classification.
      4. Return the results ONLY in the specified JSON format with three arrays: "supporting", "contradictory", and "neutral". Each article object in the arrays must include the fields provided (pmid, title, url, authors, journal, pubDate) plus the "classification" (must be exactly "Supporting", "Contradictory", or "Neutral") and "classificationReason" fields. Do not include any articles that could not be classified.
    `;

    try {
      // Type assertion needed as traceAICall might return unknown
      const { object: classificationResult } = await traceAICall(
        { name: 'pubmed-bulk-classify', model: 'gpt-4o' }, 
        async () => {
          return await generateObject({
            model: openai('gpt-4o'),
            schema: BulkClassificationSchema,
            prompt: classificationPrompt,
            maxTokens: 8192, // Keep increased limit
          });
        }
      ) as { object: z.infer<typeof BulkClassificationSchema> };

      console.log(`OpenAI Classification Complete: ${classificationResult.supporting.length} Supporting, ${classificationResult.contradictory.length} Contradictory, ${classificationResult.neutral.length} Neutral`);

      return NextResponse.json({
        supporting: classificationResult.supporting,
        contradictory: classificationResult.contradictory,
        totalFound: totalFound,
        searchKeywords: trimmedKeywords
      }, { status: 200 });

    } catch (aiError: any) {
      console.error('OpenAI classification error:', aiError);
      return NextResponse.json({
          error: `Failed to classify related research using AI: ${aiError.message || 'Unknown AI error'}`,
          supporting: [], contradictory: [], neutral: [],
          totalFound: totalFound,
          searchKeywords: trimmedKeywords
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('General error in related research route:', error);
    return NextResponse.json({ error: `Failed to process related research request: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}

// --- REMOVE OLD HELPER FUNCTIONS ---
// async function classifySingleArticle(...) { ... }
// function extractKeyFindings(...) { ... } 