// Tavily Search API Integration
import { NextResponse } from 'next/server';

// Use Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TavilySearchResponse = {
  results: {
    url: string;
    content: string;
    title: string;
  }[];
  query: string;
};

/**
 * Custom fallback search for when Tavily API is not available
 * This uses hardcoded mappings for specific article titles to sources 
 * that we know are scrapable.
 */
function getKnownScrapableSources(query: string): Array<{ url: string, title: string, content: string }> {
  // Create a map of article titles to known scrapable sources
  const knownSources: Record<string, { url: string, title: string }> = {
    "Origin of the Palos Verdes Restraining Bend and Its Implications for the 3D Geometry of the Fault and Earthquake Hazards in Los Angeles, California": {
      url: "https://ui.adsabs.harvard.edu/abs/2022BuSSA.112.2689W/abstract",
      title: "Origin of the Palos Verdes Restraining Bend and Its Implications for the 3D Geometry of the Fault..."
    },
    // Add more known mappings as needed
  };

  // Check for exact matches first
  for (const [title, source] of Object.entries(knownSources)) {
    if (query.toLowerCase() === title.toLowerCase() || 
        title.toLowerCase().includes(query.toLowerCase()) || 
        query.toLowerCase().includes(title.toLowerCase())) {
      return [{
        url: source.url,
        title: source.title,
        content: "This is a curated alternative source for the article."
      }];
    }
  }

  // If no exact match, check for partial matches (for titles that might be truncated)
  const results = [];
  for (const [title, source] of Object.entries(knownSources)) {
    // Check if at least 70% of the words in the query appear in the title
    const queryWords = query.toLowerCase().split(/\s+/);
    const titleWords = title.toLowerCase().split(/\s+/);
    let matchCount = 0;
    
    for (const word of queryWords) {
      if (word.length > 3 && titleWords.some(titleWord => titleWord.includes(word))) {
        matchCount++;
      }
    }
    
    if (matchCount / queryWords.length > 0.7) {
      results.push({
        url: source.url,
        title: source.title,
        content: "This is a partial match for the requested article."
      });
    }
  }

  return results;
}

/**
 * Helper to convert DOI / academic identifiers to likely hosts
 */
function getCommonAcademicHosts(query: string): Array<string> {
  // Add common academic article repositories to search
  const academicHosts = [
    'ncbi.nlm.nih.gov',
    'pmc.ncbi.nlm.nih.gov',
    'pubmed.ncbi.nlm.nih.gov',
    'sciencedirect.com',
    'springer.com',
    'wiley.com',
    'nature.com',
    'science.org',
    'cell.com',
    'thelancet.com',
    'nejm.org',
    'adsabs.harvard.edu',
    'ui.adsabs.harvard.edu',
    'nasa.gov',
    'biorxiv.org',
    'medrxiv.org',
    'researchgate.net',
    'academia.edu',
    'semanticscholar.org',
    'arxiv.org',
    'journals.plos.org',
    'ssrn.com',
    'agu.org',
    'frontiersin.org',
    'hindawi.com',
    'mdpi.com',
    'sage.com',
    'tand.com',
    'oxford.com',
    'cambridge.org'
  ];
  
  // If the query contains a DOI, add some DOI resolvers
  if (query.includes('DOI:') || query.includes('doi:') || query.match(/10\.\d{4,5}\//)) {
    return [
      ...academicHosts,
      'doi.org',
      'dx.doi.org',
      'crossref.org'
    ];
  }
  
  return academicHosts;
}

/**
 * Tavily API endpoint for searching the web for alternative article sources
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { query, isExactTitle = false } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    console.log('Searching for alternative sources for:', query);
    console.log('Is exact title search:', isExactTitle);

    // Check for known scrapable sources first
    if (isExactTitle) {
      const knownSources = getKnownScrapableSources(query);
      if (knownSources.length > 0) {
        console.log('Found known scrapable sources:', knownSources.length);
        return NextResponse.json({
          query,
          results: knownSources
        });
      }
    }

    // Get the Tavily API key
    const tavilyApiKey = process.env.TAVILY_API_KEY;
    
    // If Tavily API key is not available, use mock data with our known mappings
    if (!tavilyApiKey) {
      console.log('TAVILY_API_KEY not configured, using fallback search');
      
      // First try our curated mappings
      let fallbackResults = getKnownScrapableSources(query);
      
      // If no results from curated mappings, generate some plausible results
      if (fallbackResults.length === 0) {
        console.log('No known sources, generating plausible alternatives');
        
        // For academic URLs, try to make an educated guess about alternative sources
        if (query.includes('PMC') || query.includes('DOI:') || query.includes('doi:')) {
          // Special case for PMC IDs - provide a link to the PubMed Central version
          if (query.match(/PMC\d+/i)) {
            const pmcId = query.match(/PMC\d+/i)?.[0];
            fallbackResults.push({
              url: `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcId}/`,
              title: `PubMed Central article ${pmcId}`,
              content: "This is a direct link to the article in PubMed Central."
            });
          }
          
          // For DOI queries, provide a DOI resolver link
          if (query.match(/10\.\d{4,5}\/[a-zA-Z0-9.]+/)) {
            const doi = query.match(/10\.\d{4,5}\/[a-zA-Z0-9.]+/)?.[0];
            fallbackResults.push({
              url: `https://doi.org/${doi}`,
              title: `DOI: ${doi}`,
              content: "This is a direct link to the DOI resolver for this article."
            });
          }
        }
        
        // Generate a general placeholder result based on the query
        if (fallbackResults.length === 0) {
          fallbackResults = [
            {
              url: query.startsWith('http') ? query : `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`,
              title: "Original query or Google Scholar search",
              content: "No specific alternative source was found, but you can try searching Google Scholar for this article."
            }
          ];
        }
      }
      
      return NextResponse.json({
        query,
        results: fallbackResults
      });
    }

    // Call the Tavily API with the proper API key
    console.log('Calling Tavily API with query:', query);
    const includeDomains = getCommonAcademicHosts(query);
    
    const apiQueryParams = {
      query: isExactTitle 
        ? `"${query}"` // Use quotes for exact title search
        : query,
      search_depth: "advanced",
      include_domains: includeDomains,
      max_results: 5,
      include_answer: false,
      include_raw_content: false
    };
    
    console.log('Tavily API parameters:', JSON.stringify(apiQueryParams, null, 2));
    
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': tavilyApiKey
      },
      body: JSON.stringify(apiQueryParams)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Tavily API error:', errorText);
      
      // Fall back to mock data if Tavily API fails
      console.log('Tavily API failed, using fallback search');
      const fallbackResults = getKnownScrapableSources(query);
      
      return NextResponse.json({
        query,
        results: fallbackResults.length > 0 ? fallbackResults : [
          {
            url: query.startsWith('http') ? query : `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`,
            title: "Fallback to original query",
            content: "Tavily API error - fallback to original source or Google Scholar"
          }
        ]
      });
    }

    const tavilyResults = await response.json();
    
    // Process and return Tavily results in our expected format
    return NextResponse.json({
      query,
      results: tavilyResults.results.map((result: any) => ({
        url: result.url,
        title: result.title,
        content: result.content
      }))
    });
  } catch (error: any) {
    console.error('Error in Tavily search API:', error);
    
    // Get the body safely in the catch block
    let reqBody = { query: "" };
    try {
      reqBody = await req.clone().json();
    } catch (e) {
      console.error('Could not parse request body in error handler:', e);
    }
    
    // Even if there's an error, try to return some results
    const fallbackResults = getKnownScrapableSources(reqBody?.query || "");
    
    return NextResponse.json({
      query: reqBody?.query || "",
      results: fallbackResults.length > 0 ? fallbackResults : [
        {
          url: reqBody?.query?.startsWith('http') ? reqBody.query : `https://scholar.google.com/scholar?q=${encodeURIComponent(reqBody?.query || "")}`,
          title: "Error fallback to original query",
          content: `Error in search API: ${error.message}`
        }
      ]
    }, { status: error.status || 500 });
  }
} 