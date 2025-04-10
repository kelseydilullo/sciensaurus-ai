'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ArticleSummaryContentProps {
  articleData: any;
  relatedResearch: {
    supporting: any[];
    contradictory: any[];
    totalFound: number;
    searchKeywords: string[];
    error?: string;
    isPreview?: boolean;
  };
  url: string;
  retryRelatedResearch: () => void;
  isPreview?: boolean;
  onBack?: () => void;
}

// Locked feature component for preview mode
const LockedFeature = ({ title, description, hideTitle = false }: { title: string; description: string; hideTitle?: boolean }) => {
  return (
    <div className="relative">
      {/* Premium content placeholder - will be blurred */}
      <Card className="bg-white shadow-sm overflow-hidden blur-sm">
        <CardHeader className="border-b border-gray-200 bg-gray-50">
          <CardTitle className="text-[#1e3a6d] text-lg">{title.includes("Study Design") ? "Research Methods" : title}</CardTitle>
          <CardDescription>Full analysis unlocked with premium</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Sample placeholder content that simulates actual data */}
          {title.includes("Contradictory") ? (
            <div className="space-y-4 p-6">
              <div className="border-b border-gray-100 pb-4">
                <h3 className="font-medium text-[#1e3a6d]">Individual Variability in Glycemic Responses to Identical Foods</h3>
                <p className="text-sm text-gray-500 mt-1">Cell • February 2023</p>
                <p className="text-gray-700 mt-2">High inter-individual variability in glucose responses to identical meals</p>
              </div>
              <div className="border-b border-gray-100 pb-4">
                <h3 className="font-medium text-[#1e3a6d]">Cost-Benefit Analysis of Whole Food vs. Processed Food Diets</h3>
                <p className="text-sm text-gray-500 mt-1">Public Health Nutrition • November 2022</p>
                <p className="text-gray-700 mt-2">Socioeconomic barriers limit practical implementation of study findings</p>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500">Study Type</p>
                  <p className="font-medium text-gray-900">Randomized crossover design</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-500">Sample Size</p>
                    <p className="font-medium text-gray-900">248 participants</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-500">Duration</p>
                    <p className="font-medium text-gray-900">12 weeks</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 mb-4">
                <p className="text-sm font-medium text-gray-500 mb-3">Age Distribution</p>
                <div className="h-16 bg-gray-100 rounded-md"></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Premium feature overlay */}
      <div className="absolute inset-0 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-lg bg-white/40">
        <div className="bg-white p-8 rounded-lg shadow-sm text-center max-w-sm border border-gray-100">
          <div className="mb-5 mx-auto w-12 h-12 text-amber-500 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">{title.includes("Study Design") ? "Research Methods" : title}</h3>
          <p className="text-gray-600 mb-6">{description}</p>
          <Link href="/signup">
            <Button className="bg-[#3255A9] hover:bg-[#1e3a6d] w-full font-medium py-2">
              Sign Up Free
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default function ArticleSummaryContent({ 
  articleData, 
  relatedResearch, 
  url,
  retryRelatedResearch,
  isPreview = false,
  onBack
}: ArticleSummaryContentProps) {
  const [articleTitle, setArticleTitle] = useState<string>('');
  const [articleSource, setArticleSource] = useState<string>('');
  const [publishDate, setPublishDate] = useState<string>('');
  // Add new state variables for original and AI titles
  const [originalTitle, setOriginalTitle] = useState<string>('');
  const [aiSummaryTitle, setAiSummaryTitle] = useState<string>('');
  const router = useRouter();
  const [showDebug, setShowDebug] = useState(false);
  
  // Function to parse text response (moved to the top)
  const parseTextResponse = (text: any) => {
    // Define the result type including all possible properties
    interface DemographicsType {
      age: Array<{ range: string; percentage: number }>;
      gender: {
        male: number;
        female: number;
        other: number;
      };
    }
    
    interface CohortAnalysisType {
      studyType: string;
      typeOfStudy: string;
      duration: string;
      dateRange: string;
      cohortSize: number;
      notes: string[];
      ageDistribution?: string; // Optional property for raw age data
      geographicDistribution?: string; // Optional property for geographic data
      gender?: string; // Optional property for raw gender data
      demographics: DemographicsType;
    }
    
    interface ResultType {
      title: string;
      summarizedTitle: string;
      originalTitle: string;
      originalArticleTitle: string;
      visualSummary: Array<{ emoji: string; point: string }>;
      keywords: string[];
      cohortAnalysis: CohortAnalysisType;
    }
    
    // If text is not a string or is empty, return an empty result
    if (!text || typeof text !== 'string') {
      console.warn('parseTextResponse received non-string input:', text);
      return {
        title: "",
        summarizedTitle: "",
        originalTitle: "",
        originalArticleTitle: "",
        visualSummary: [],
        keywords: [],
        cohortAnalysis: {
          studyType: "",
          typeOfStudy: "",
          duration: "",
          dateRange: "",
          cohortSize: 0,
          notes: [],
          ageDistribution: "",
          geographicDistribution: "",
          demographics: {
            age: [],
            gender: {
              male: 0,
              female: 0,
              other: 0
            }
          }
        }
      } as ResultType;
    }

    // Try to parse the response as JSON first
    try {
      // Find a JSON object in the text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonText = jsonMatch[0];
        const jsonData = JSON.parse(jsonText);
        
        console.log("Successfully parsed response as JSON:", jsonData);

        // Log the cohortAnalysis part specifically
        console.log("[parseTextResponse JSON] cohortAnalysis:", jsonData?.cohortAnalysis);

        // Map the JSON structure to our expected result format
        const result: ResultType = {
          title: jsonData.summarizedTitle || "",
          summarizedTitle: jsonData.summarizedTitle || "",
          originalTitle: jsonData.originalArticleTitle || "",
          originalArticleTitle: jsonData.originalArticleTitle || "",
          visualSummary: jsonData.visualSummary || [],
          keywords: jsonData.keywords || [],
          cohortAnalysis: {
            studyType: jsonData.cohortAnalysis?.typeOfStudy || "",
            typeOfStudy: jsonData.cohortAnalysis?.typeOfStudy || "",
            duration: jsonData.cohortAnalysis?.duration || "",
            dateRange: jsonData.cohortAnalysis?.dateRange || "",
            cohortSize: jsonData.cohortAnalysis?.cohortSize || 0,
            notes: jsonData.cohortAnalysis?.notes || [],
            ageDistribution: jsonData.cohortAnalysis?.ageDistribution || "",
            geographicDistribution: jsonData.cohortAnalysis?.geographicDistribution || "",
            demographics: {
              age: [],
              gender: {
                male: jsonData.cohortAnalysis?.gender?.male || 0,
                female: jsonData.cohortAnalysis?.gender?.female || 0,
                other: 0
              }
            }
          }
        };
        
        return result;
      }
    } catch (error) {
      console.error("Failed to parse response as JSON, falling back to text parsing:", error);
    }

    // Log the raw text input if parsing JSON failed
    console.log("[parseTextResponse Text] Input text (first 500 chars):", text.substring(0, 500));

    // Fall back to the original text parsing if JSON parsing fails
    const result: ResultType = {
      title: "",
      summarizedTitle: "",
      originalTitle: "",
      originalArticleTitle: "",
      visualSummary: [],
      keywords: [],
      cohortAnalysis: {
        studyType: "",
        typeOfStudy: "",
        duration: "",
        dateRange: "",
        cohortSize: 0,
        notes: [],
        ageDistribution: "",
        geographicDistribution: "",
        demographics: {
          age: [],
          gender: {
            male: 0,
            female: 0,
            other: 0
          }
        }
      }
    };
    
    // Parse original title if it exists
    const originalTitleSection = text.match(/### Original Article Title:\s*([\s\S]*?)(?=###|$)/);
    if (originalTitleSection && originalTitleSection[1]) {
      result.originalTitle = originalTitleSection[1].trim();
      result.originalArticleTitle = originalTitleSection[1].trim();
    }
    
    // Parse title
    const titleSection = text.match(/### Summarized Title:\s*([\s\S]*?)(?=###|$)/);
    if (titleSection && titleSection[1]) {
      result.title = titleSection[1].trim();
      result.summarizedTitle = titleSection[1].trim();
    }
    
    // Parse visual summary
    const visualSummarySection = text.match(/### Visual Summary:\s*([\s\S]*?)(?=###|$)/);
    if (visualSummarySection && visualSummarySection[1]) {
      const points = visualSummarySection[1].trim().split('\n').filter(line => line.trim() !== '');
      
      points.forEach(point => {
        // Update the regex to match potentially multiple emojis at the start, but only capture the first one
        const emojiMatch = point.match(/^([\p{Emoji}])[\p{Emoji}\s]*\s+(.*)/u);
        if (emojiMatch) {
          result.visualSummary.push({
            emoji: emojiMatch[1], // This will only be the first emoji
            point: emojiMatch[2]
          });
        } else {
          // Fallback if no emoji found
          result.visualSummary.push({
            emoji: "📝",
            point: point
          });
        }
      });
    }
    
    // Parse keywords
    const keywordsSection = text.match(/### Keywords:\s*([\s\S]*?)(?=###|$)/i);
    if (keywordsSection && keywordsSection[1]) {
      result.keywords = keywordsSection[1].split(',')
        .map((k: string) => k.trim())
        .filter((k: string) => k.length > 0);
    }
    
    // Parse cohort analysis
    const cohortSection = text.match(/### (Cohort Analysis|Methodology|Study Design|Research Design):\s*([\s\S]*?)(?=###|$)/i);
    if (cohortSection && cohortSection[2]) {
      const cohortText = cohortSection[2].trim();
      
      // Extract study type
      const studyTypeMatch = cohortText.match(/(Study Type|Research Type|Study Design|Type of Study):\s*(.*?)(?=\n|$)/i);
      if (studyTypeMatch && studyTypeMatch[2]) {
        result.cohortAnalysis.studyType = studyTypeMatch[2].trim();
        result.cohortAnalysis.typeOfStudy = studyTypeMatch[2].trim();
      }
      
      // Extract duration - look for different patterns
      const durationMatch = cohortText.match(/(Duration|Study Duration|Study Period|Follow-up|Length of Study):\s*(.*?)(?=\n|$)/i) || 
                           cohortText.match(/The study (lasted|continued|ran for|spanned|was conducted over) (.*?)(?=\.|,|\n|$)/i);
      
      if (durationMatch) {
        if (durationMatch[1] && durationMatch[1].toLowerCase().match(/(duration|study duration|study period|follow-up|length of study)/i)) {
          result.cohortAnalysis.duration = durationMatch[2].trim();
        } else if (durationMatch[2]) {
          // Handle pattern like "The study lasted X years"
          result.cohortAnalysis.duration = durationMatch[2].trim();
        }
      }
      
      // Extract date range
      const dateRangeMatch = cohortText.match(/(Date Range|Study Dates|Conducted between|Period|Timeframe):\s*(.*?)(?=\n|$)/i) ||
                             cohortText.match(/from\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec).+?to\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec).+?(\d{4})/i);
      
      if (dateRangeMatch) {
        if (dateRangeMatch[1] && dateRangeMatch[1].toLowerCase().match(/(date range|study dates|conducted between|period|timeframe)/i)) {
          result.cohortAnalysis.dateRange = dateRangeMatch[2].trim();
        } else {
          // For matches like "from January to December 2022"
          const dateText = dateRangeMatch[0];
          result.cohortAnalysis.dateRange = dateText.trim();
        }
      }
      
      // Extract cohort size - try multiple patterns including text numbers
      // First try for direct number patterns
      const cohortSizeMatch = cohortText.match(/(Cohort Size|Study Size|Sample Size|Number of Participants|Participants|Subjects|n\s*=)\s*(\d[\d,]*)\s*(?:participants|subjects|people|individuals|patients)?/i) ||
                             cohortText.match(/(\d[\d,]*)\s*(?:participants|subjects|people|individuals|patients)/i) ||
                             cohortText.match(/The study (?:included|enrolled|recruited|analyzed|examined)\s*(\d[\d,]*)/i);
      
      // First check for direct numeric matches with improved comma handling
      if (cohortSizeMatch && cohortSizeMatch[1] && /\d/.test(cohortSizeMatch[1])) {
        // Handle direct numeric match
        const numericPart = cohortSizeMatch[1].match(/\d[\d,]*/);
        if (numericPart) {
          result.cohortAnalysis.cohortSize = parseInt(numericPart[0].replace(/,/g, ''));
        }
      } else if (cohortSizeMatch && cohortSizeMatch[2] && /\d/.test(cohortSizeMatch[2])) {
        // Handle numeric match in group 2
        const numericPart = cohortSizeMatch[2].match(/\d[\d,]*/);
        if (numericPart) {
          result.cohortAnalysis.cohortSize = parseInt(numericPart[0].replace(/,/g, ''));
        }
      }
      
      // Extract age demographics
      const ageDemographicsSection = cohortText.match(/Age Distribution:?\s*([\s\S]*?)(?=(Gender:|Geographic Distribution:|Notes:|$))/i);
      if (ageDemographicsSection && ageDemographicsSection[1]) {
        const ageText = ageDemographicsSection[1].trim();
        result.cohortAnalysis.ageDistribution = ageText;
      }
      
      // Extract gender demographics
      const genderSection = cohortText.match(/Gender:?\s*([\s\S]*?)(?=(Geographic Distribution:|Notes:|$))/i);
      if (genderSection && genderSection[1]) {
        const genderText = genderSection[1].trim();
        // REMOVE result.cohortAnalysis.gender = genderText; // Store the raw text

        // Attempt to parse the genderText into structured data
        try {
          // Try parsing {male: X, female: Y} format
          const objectMatch = genderText.match(/{\s*male:\s*(\d+(?:\.\d+)?)\s*,\s*female:\s*(\d+(?:\.\d+)?)\s*}/i);
          if (objectMatch) {
            result.cohortAnalysis.demographics.gender.male = parseFloat(objectMatch[1]);
            result.cohortAnalysis.demographics.gender.female = parseFloat(objectMatch[2]);
          } else {
            // Try parsing "Male: X%, Female: Y%" format
            const malePercentMatch = genderText.match(/male:\s*(\d+(?:\.\d+)?)%?/i);
            const femalePercentMatch = genderText.match(/female:\s*(\d+(?:\.\d+)?)%?/i);
            if (malePercentMatch && femalePercentMatch) {
              result.cohortAnalysis.demographics.gender.male = parseFloat(malePercentMatch[1]);
              result.cohortAnalysis.demographics.gender.female = parseFloat(femalePercentMatch[1]); 
            }
            // Add more parsing logic here if other formats are expected
          }
        } catch (parseError) {
          console.error("Could not parse gender text:", genderText, parseError);
          // Ensure demographics.gender remains empty/default if parsing fails
          result.cohortAnalysis.demographics.gender = { male: 0, female: 0, other: 0 }; 
        }
      }
      
      // Extract geographic distribution
      const geographicSection = cohortText.match(/Geographic Distribution:?\s*([\s\S]*?)(?=(Notes:|$))/i);
      if (geographicSection && geographicSection[1]) {
        result.cohortAnalysis.geographicDistribution = geographicSection[1].trim();
      }
      
      // Extract notes - any additional lines that aren't the above properties
      const notesSection = cohortText.match(/Notes:?\s*([\s\S]*?)(?=$)/i);
      if (notesSection && notesSection[1]) {
        const notesText = notesSection[1].trim();
        
        // Split notes - they can be separated by bullets, dashes, or be on separate lines
        const noteLines = notesText.split(/\n+/).map(line => line.trim()).filter(line => line);
        
        if (noteLines.length > 0) {
          // Process bullet points or dashes
          result.cohortAnalysis.notes = noteLines.map(line => 
            line.replace(/^[-•*]\s*/, '').trim() // Remove leading bullet points or dashes
          ).filter(note => note && note !== 'Not specified' && note !== 'N/A');
        }
      }
    }
    
    return result;
  };
  
  // Extract parsed result if necessary
  const result = useMemo(() => {
    if (articleData?.rawText && typeof articleData.rawText === 'string') {
      return parseTextResponse(articleData.rawText);
    }
    return articleData;
  }, [articleData]);
    
  // Function to normalize data from the database
  const normalizeDataFromDatabase = () => {
    if (!result) return;
    
    console.log("Normalizing data from database:", {
      resultType: typeof result,
      hasVisualSummary: !!result.visual_summary,
      visualSummaryType: result.visual_summary ? typeof result.visual_summary : 'undefined',
      visualSummaryIsString: result.visual_summary ? typeof result.visual_summary === 'string' : false,
      hasStudyMetadata: !!result.study_metadata,
      studyMetadataType: result.study_metadata ? typeof result.study_metadata : 'undefined'
    });
    
    // Handle visual_summary if it's a string (might be stringified JSON)
    if (result.visual_summary && typeof result.visual_summary === 'string') {
      try {
        // Try to parse the JSON string
        result.visual_summary = JSON.parse(result.visual_summary);
        console.log("Successfully parsed visual_summary from string to object");
      } catch (error) {
        console.error("Failed to parse visual_summary:", error);
        // Set to empty array if parsing fails
        result.visual_summary = [];
      }
    }
    
    // Handle keywords if it's a string (might be stringified JSON)
    if (result.keywords && typeof result.keywords === 'string') {
      try {
        // Try to parse the JSON string
        result.keywords = JSON.parse(result.keywords);
        console.log("Successfully parsed keywords from string to array");
      } catch (error) {
        console.error("Failed to parse keywords:", error);
        // Set to empty array if parsing fails
        result.keywords = [];
      }
    }
    
    // Handle study_metadata (methodology data) if it's a string
    if (result.study_metadata && typeof result.study_metadata === 'string') {
      try {
        // Try to parse the JSON string
        result.study_metadata = JSON.parse(result.study_metadata);
        console.log("Successfully parsed study_metadata from string to object");
      } catch (error) {
        console.error("Failed to parse study_metadata:", error);
        // Set to empty object if parsing fails
        result.study_metadata = {};
      }
    }
    
    // Map study_metadata to cohortAnalysis property for rendering
    if (result.study_metadata && !result.cohortAnalysis) {
      result.cohortAnalysis = result.study_metadata;
      console.log("Mapped study_metadata to cohortAnalysis for rendering");
    }
    
    // Handle related research if it's a string
    if (result.related_research && typeof result.related_research === 'string') {
      try {
        // Try to parse the JSON string
        result.related_research = JSON.parse(result.related_research);
        console.log("Successfully parsed related_research from string to object");
      } catch (error) {
        console.error("Failed to parse related_research:", error);
        // Set to empty object if parsing fails
        result.related_research = { supporting: [], contradictory: [], totalFound: 0 };
      }
    }
  };
  
  // Use useEffect to normalize data on component mount
  useEffect(() => {
    console.log("ArticleSummaryContent received data:", {
      articleDataType: typeof articleData,
      hasRawText: !!articleData?.rawText,
      hasVisualSummary: !!articleData?.visual_summary,
      hasKeywords: !!articleData?.keywords,
      resultType: typeof result
    });
    // --- DEBUG LOG: Check received relatedResearch prop --- 
    console.log('[ContentComponent] Received relatedResearch prop:', relatedResearch);
    
    normalizeDataFromDatabase();
  }, [articleData, relatedResearch]);
  
  // Use useEffect to update title and source when component mounts
  useEffect(() => {
    // Try to extract domain for source
    if (url) {
      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace('www.', '');
        
        // Common domain to source name mappings
        const domainSourceMap: Record<string, string> = {
          'nature.com': 'Nature Medicine',
          'science.org': 'Science',
          'cell.com': 'Cell',
          'nejm.org': 'New England Journal of Medicine',
          'thelancet.com': 'The Lancet',
          'pubmed.ncbi.nlm.nih.gov': 'PubMed',
          'pmc.ncbi.nlm.nih.gov': 'PubMed Central',
          'sciencedirect.com': 'ScienceDirect',
          'springer.com': 'Springer',
          'wiley.com': 'Wiley',
          'nih.gov': 'NIH',
          'cdc.gov': 'CDC',
          'biorxiv.org': 'bioRxiv',
          'medrxiv.org': 'medRxiv',
          'jamanetwork.com': 'JAMA Network'
        };
        
        // Check if domain matches known sources
        const matchedSource = Object.entries(domainSourceMap).find(([key]) => 
          domain.includes(key)
        );
        
        if (matchedSource) {
          setArticleSource(matchedSource[1]);
        } else {
          // Use capitalized domain name as fallback
          const sourceName = domain.split('.')[0];
          setArticleSource(sourceName.charAt(0).toUpperCase() + sourceName.slice(1));
        }
      } catch (e) {
        // Ignore URL parsing errors
        setArticleSource("");
      }
    }
    
    // Set article titles
    if (result) {
      // Set original title if available from the JSON format
      if (result.originalTitle || result.originalArticleTitle) {
        const original = result.originalArticleTitle || result.originalTitle;
        setOriginalTitle(original);
        // Also set as main article title if no title preference is set
        if (!articleTitle) {
          setArticleTitle(original);
        }
      }
      
      // Set AI summary title if available from the JSON format
      if (result.title || result.summarizedTitle) {
        const summary = result.summarizedTitle || result.title;
        setAiSummaryTitle(summary);
        
        // If we don't have an original title, use the AI title as the main title
        if (!(result.originalArticleTitle || result.originalTitle) && !articleTitle) {
          setArticleTitle(summary);
        }
      }
    }
  }, [url, result, articleTitle]);
  
  const renderVisualSummary = () => {
    // Directly use the visualSummary array from the result
    let visualSummaryData = null;
    
    // Use the parsed visualSummary from the JSON
    if (result && result.visualSummary && Array.isArray(result.visualSummary) && result.visualSummary.length > 0) {
      visualSummaryData = result.visualSummary;
      console.log("Using result.visualSummary");
    }
    // Check for snake_case (database format) as fallback
    else if (result && result.visual_summary && Array.isArray(result.visual_summary) && result.visual_summary.length > 0) {
      visualSummaryData = result.visual_summary;
      console.log("Using result.visual_summary");
    }
    // Check original articleData if nothing found in result
    else if (articleData && articleData.visual_summary && Array.isArray(articleData.visual_summary) && articleData.visual_summary.length > 0) {
      visualSummaryData = articleData.visual_summary;
      console.log("Using articleData.visual_summary");
    }
    
    // Ultimate fallback - always have something to display
    if (!visualSummaryData || !Array.isArray(visualSummaryData) || visualSummaryData.length === 0) {
      console.log("Using default visual summary");
      visualSummaryData = [
        { emoji: "📝", point: "This article has been analyzed by Sciensaurus AI." },
        { emoji: "🔍", point: "For more detailed information about this article, sign up for a free account." }
      ];
    }
    
    return (
      <div className="space-y-4">
        {visualSummaryData.map((item: { emoji: string; point: string }, index: number) => (
          <div key={index} className="flex items-start gap-3">
            <div className="text-xl">{item.emoji}</div>
            <div className="flex-1">
              <p className="text-gray-800">{item.point}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  const renderKeywords = () => {
    // Directly use the keywords from the result
    let keywordsData = null;
    
    // Use the parsed keywords from JSON
    if (result && result.keywords && Array.isArray(result.keywords) && result.keywords.length > 0) {
      keywordsData = result.keywords;
      console.log("Using result.keywords");
    }
    // Check original articleData if nothing found in result
    else if (articleData && articleData.keywords && Array.isArray(articleData.keywords) && articleData.keywords.length > 0) {
      keywordsData = articleData.keywords;
      console.log("Using articleData.keywords");
    }
    
    // Ultimate fallback - always have something to display
    if (!keywordsData || !Array.isArray(keywordsData) || keywordsData.length === 0) {
      console.log("Using default keywords");
      keywordsData = ["research", "science", "analysis", "sciensaurus", "summary"];
    }
    
    // Ensure all items are strings
    keywordsData = keywordsData.map((item: any) => item ? item.toString() : "keyword");
    
    return (
      <div className="flex flex-wrap gap-2">
        {keywordsData.map((keyword: string, index: number) => (
          <Badge
            key={index}
            variant="outline"
            className="bg-blue-50 text-blue-800 hover:bg-blue-100"
          >
            {keyword}
          </Badge>
        ))}
      </div>
    );
  };
  
  // Methodology wrapper component to encapsulate and isolate methodology rendering
  const MethodologySection = () => {
    // Extra debugging - Log the raw data to see what we're receiving
    useEffect(() => {
      console.log("PARSING RAW ARTICLE DATA:");
      console.log("rawText:", articleData?.rawText?.substring(0, 300) + "...");
      console.log("Raw gender data in text:", 
        articleData?.rawText?.match(/Gender:?\s*([\s\S]*?)(?=(Geographic Distribution:|Notes:|$))/i)?.[1] || "Not found"
      );
      // Try to parse the gender section manually for debugging
      if (articleData?.rawText) {
        const genderRegex = /Gender:?\s*([\s\S]*?)(?=(Geographic Distribution:|Notes:|$))/i;
        const genderMatch = articleData.rawText.match(genderRegex);
        if (genderMatch && genderMatch[1]) {
          console.log("Gender section manually parsed:", genderMatch[1].trim());
        } else {
          console.log("Gender section not found in raw text");
        }
      }
    }, [articleData]);

    // Extract relevant data for both preview and authenticated modes
    const methodologyData = (result && result.cohortAnalysis) || 
                           (result && result.study_metadata) || 
                           (articleData && articleData.study_metadata) || {};
    
    // Ensure methodologyData is an object
    const methodologyDataObj = (typeof methodologyData === 'object' && methodologyData !== null) 
                               ? methodologyData 
                               : {};

    // DEBUG: Log methodologyDataObj before processing gender
    console.log("[MethodologySection] methodologyDataObj:", methodologyDataObj);

    // New function to extract age data from text
    const extractAgeDataFromText = (text?: string) => {
      if (!text) return null;
      
      // Try to extract mean and standard deviation pattern (e.g., "Mean age: 46.1±10.9 years")
      const meanSDPattern = /mean\s+age:?\s*([\d.]+)\s*(?:±|±|\+\/-|±)\s*([\d.]+)\s*years?/i;
      const meanSDMatch = text.match(meanSDPattern);
      
      // Try to extract age range pattern (e.g., "range, 27 to 68 years")
      const rangePattern = /range,?\s*(\d+)\s*(?:to|-)\s*(\d+)\s*years?/i;
      const rangeMatch = text.match(rangePattern);
      
      // If we have mean/SD, create a normal distribution approximation
      if (meanSDMatch) {
        const mean = parseFloat(meanSDMatch[1]);
        const sd = parseFloat(meanSDMatch[2]);
        
        // Create age ranges based on standard deviations
        const ageData = [
          { range: `<${Math.round(mean-sd)}`, percentage: 16 },
          { range: `${Math.round(mean-sd)}-${Math.round(mean)}`, percentage: 34 },
          { range: `${Math.round(mean)}-${Math.round(mean+sd)}`, percentage: 34 },
          { range: `>${Math.round(mean+sd)}`, percentage: 16 }
        ];
        
        // If we also have a range, adjust the first and last categories
        if (rangeMatch) {
          const minAge = parseInt(rangeMatch[1]);
          const maxAge = parseInt(rangeMatch[2]);
          ageData[0].range = `${minAge}-${Math.round(mean-sd)}`;
          ageData[3].range = `${Math.round(mean+sd)}-${maxAge}`;
        }
        
        return ageData;
      }
      
      // Look for explicit age distribution patterns (e.g., "18-30: 15%, 31-45: 30%")
      const distributionPattern = /(\d+(?:-\d+)?)\s*:?\s*(\d+(?:\.\d+)?)%/g;
      let match;
      const explicitDistribution = [];
      let totalPercentage = 0;
      
      while ((match = distributionPattern.exec(text)) !== null) {
        const range = match[1];
        const percentage = parseFloat(match[2]);
        explicitDistribution.push({ range, percentage });
        totalPercentage += percentage;
      }
      
      // If we found explicit distribution and it's reasonably complete (>80% accounted for)
      if (explicitDistribution.length > 0 && totalPercentage >= 80) {
        return explicitDistribution;
      }
      
      // No structured data found, return null
      return null;
    };

    // Get structured age data if available, otherwise try to extract from text
    const ageDistributionText = methodologyDataObj.ageDistribution || '';
    const extractedAgeData = extractAgeDataFromText(ageDistributionText);
    
    // Update the hasAgeData check to include extracted data
    const hasAgeData = (methodologyDataObj.demographics?.age && 
                      Array.isArray(methodologyDataObj.demographics.age) && 
                      methodologyDataObj.demographics.age.length > 0) ||
                      (extractedAgeData !== null);

    // Determine the final age data to use
    const ageDataForChart = methodologyDataObj.demographics?.age && 
                          Array.isArray(methodologyDataObj.demographics.age) && 
                          methodologyDataObj.demographics.age.length > 0 
                          ? methodologyDataObj.demographics.age 
                          : extractedAgeData;

    // Prepare gender data for pie chart if available 
    // Check directly under methodologyDataObj.gender first, then demographics.gender as fallback
    const genderSource = methodologyDataObj?.gender || methodologyDataObj?.demographics?.gender;
    const genderData = genderSource && (genderSource.male > 0 || genderSource.female > 0) 
                      ? [
                        { name: 'Male', value: genderSource.male, color: '#4299E1' },
                        { name: 'Female', value: genderSource.female, color: '#ED64A6' }
                      ] 
                      : [];
    
    // DEBUG: Log the prepared genderData array
    console.log("[MethodologySection] genderData for chart:", genderData);

    // Add 'Other' category if present in methodologyDataObj
    if (methodologyDataObj.demographics?.gender && methodologyDataObj.demographics.gender.other > 0) {
      genderData.push({ 
        name: 'Other', 
        value: methodologyDataObj.demographics.gender.other,
        color: '#9F7AEA'
      });
    }

    // Render Bar Chart for Age Demographics
    const renderAgeChart = () => {
      if (!hasAgeData) return null;

      return (
        <div className="mt-3 mb-2">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={ageDataForChart}
              margin={{ top: 10, right: 10, left: 0, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="range" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
              />
              <YAxis 
                unit="%" 
                tick={{ fontSize: 12 }}
                domain={[0, 'dataMax + 10']}
              />
              <Tooltip 
                formatter={(value) => [`${value}%`, 'Percentage']}
                labelFormatter={(label) => `Age: ${label}`}
              />
              <Bar 
                dataKey="percentage" 
                fill="#4ADE80" 
                name="Percentage"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    };

    // Render Pie Chart for Gender Demographics
    const renderGenderChart = () => {
      if (genderData.length === 0) return null;

      const COLORS = ['#4299E1', '#ED64A6', '#9F7AEA'];

      return (
        <div className="mt-3 mb-2">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={genderData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
              >
                {genderData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color || COLORS[index % COLORS.length]} 
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend 
                formatter={(value, entry) => {
                  // Add percentage to the legend label
                  const item = genderData.find(d => d.name === value);
                  const sum = genderData.reduce((acc, curr) => acc + curr.value, 0);
                  const percent = item ? Math.round((item.value / sum) * 100) : 0;
                  return `${value} ${percent}%`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    };

    // If in preview mode, return the real content with an overlay
    if (isPreview) {
      return (
        <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm relative">
          {/* The real content that will be blurred */}
          <div className="filter blur-[4px]">
            <div className="bg-gray-50 py-4 px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-800">Methodology</h3>
              <p className="text-sm text-gray-600">
                Analysis of the study methodology
              </p>
            </div>
            <div className="bg-white px-6 py-5">
              {/* Grid for methodology cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Study Type */}
                <div className="bg-blue-50 p-5 rounded-lg border border-blue-100">
                  <h4 className="text-blue-800 font-medium mb-2">Study Type</h4>
                  <p className="text-gray-700">{methodologyDataObj.typeOfStudy || methodologyDataObj.studyType || "Randomized clinical trial"}</p>
                </div>
                
                {/* Study Participants */}
                <div className="bg-purple-50 p-5 rounded-lg border border-purple-100">
                  <h4 className="text-purple-800 font-medium mb-2">Study Participants</h4>
                  <p className="text-gray-700">
                    {methodologyDataObj.cohortSize ? 
                      `${methodologyDataObj.cohortSize.toLocaleString()} participants` : 
                      "Not available"}
                  </p>
                </div>
                
                {/* Age Demographics */}
                <div className="bg-green-50 p-5 rounded-lg border border-green-100">
                  <h4 className="text-green-800 font-medium mb-2">Age Demographics</h4>
                  {hasAgeData ? renderAgeChart() : (
                    <p className="text-gray-700">{methodologyDataObj.ageDistribution || "Not available"}</p>
                  )}
                </div>
                
                {/* Gender Demographics */}
                <div className="bg-pink-50 p-5 rounded-lg border border-pink-100">
                  <h4 className="text-pink-800 font-medium mb-2">Gender Demographics</h4>
                  {genderData.length > 0 ? (
                    renderGenderChart()
                  ) : (
                    <p className="text-gray-700">
                      {'Not available'}
                    </p>
                  )}
                </div>
                
                {/* Geographic Information */}
                <div className="bg-amber-50 p-5 rounded-lg border border-amber-100">
                  <h4 className="text-amber-800 font-medium mb-2">Geographic Information</h4>
                  <p className="text-gray-700">
                    {methodologyDataObj.geographicDistribution || "Not available"}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Premium feature overlay */}
          <div className="absolute inset-0 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-lg bg-white/40">
            <div className="bg-white p-8 rounded-lg shadow-sm text-center max-w-sm border border-gray-100">
              <div className="mb-5 mx-auto w-12 h-12 text-[#d7aeff] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Methodology</h3>
              <p className="text-gray-600 mb-6">Sign up for a free account to see details about the study including Cohort Analysis and Demographics.</p>
              <Link href="/signup">
                <Button className="bg-[#3255A9] hover:bg-[#1e3a6d] w-full font-medium py-2 text-white">
                  Sign Up Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    // Standard render for non-preview mode with the new card layout
    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="bg-gray-50 py-4 px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-800">Methodology</h3>
          <p className="text-sm text-gray-600">
            Analysis of the study methodology
          </p>
        </div>
        <div className="bg-white px-6 py-5 space-y-6">
          {/* Grid for methodology cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Study Type */}
            <div className="bg-blue-50 p-5 rounded-lg border border-blue-100">
              <h4 className="text-blue-800 font-medium mb-2">Study Type</h4>
              <p className="text-gray-700">
                {methodologyDataObj.typeOfStudy || methodologyDataObj.studyType || "Not available"}
              </p>
            </div>
            
            {/* Study Participants */}
            <div className="bg-purple-50 p-5 rounded-lg border border-purple-100">
              <h4 className="text-purple-800 font-medium mb-2">Study Participants</h4>
              <p className="text-gray-700">
                {methodologyDataObj.cohortSize ? 
                  `${methodologyDataObj.cohortSize.toLocaleString()} participants` : 
                  "Not available"}
              </p>
            </div>
            
            {/* Age Demographics with Chart */}
            <div className="bg-green-50 p-5 rounded-lg border border-green-100">
              <h4 className="text-green-800 font-medium mb-2">Age Demographics</h4>
              {hasAgeData ? renderAgeChart() : (
                <p className="text-gray-700">
                  {methodologyDataObj.ageDistribution || "Not available"}
                </p>
              )}
            </div>
            
            {/* Gender Demographics with Chart */}
            <div className="bg-pink-50 p-5 rounded-lg border border-pink-100">
              <h4 className="text-pink-800 font-medium mb-2">Gender Demographics</h4>
              {genderData.length > 0 ? (
                renderGenderChart()
              ) : (
                <p className="text-gray-700">
                  {'Not available'}
                </p>
              )}
            </div>
            
            {/* Geographic Information */}
            <div className="bg-amber-50 p-5 rounded-lg border border-amber-100">
              <h4 className="text-amber-800 font-medium mb-2">Geographic Information</h4>
              <p className="text-gray-700">
                {methodologyDataObj.geographicDistribution || "Not available"}
              </p>
            </div>
          </div>
          
          {/* Study Notes Section */}
          {methodologyDataObj.notes && methodologyDataObj.notes.length > 0 && (
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 mt-4">
              <h4 className="text-gray-800 font-medium mb-3">Study Notes</h4>
              <ul className="list-disc pl-5 space-y-2">
                {methodologyDataObj.notes.map((note: string, index: number) => (
                  <li key={index} className="text-gray-700">{note}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  const renderRelatedResearch = () => {
    const getFormattedErrorMessage = (error: string) => {
      if (error.includes('API request error:')) {
        return 'Unable to fetch related research. Please try again later.';
      }
      return error;
    };

    // Function to render a single article card
    const renderArticleCard = (article: any, index: number) => (
      <div key={index} className="border-b border-gray-100 pb-4 last:border-b-0">
        <h3 className="font-medium text-[#1e3a6d] text-sm mb-1">
          <a href={article.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {article.title}
          </a>
        </h3>
        <p className="text-xs text-gray-500">{article.classificationReason}</p>
      </div>
    );

    // Determine if there is any research to show (or an error)
    const hasSupporting = relatedResearch?.supporting?.length > 0;
    const hasContradictory = relatedResearch?.contradictory?.length > 0;
    const hasError = !!relatedResearch?.error;

    // Skip rendering if no data and no error
    if (!relatedResearch || (!hasSupporting && !hasContradictory && !hasError)) {
      console.log("Skipping Related Research render: No data or error.");
      return null;
    }

    // Handle error case first
    if (hasError && typeof relatedResearch.error === 'string') {
      // Assign the confirmed string to a new constant
      const errorString = relatedResearch.error; 
      return (
        <div className="mt-8">
          <div className="p-4 bg-red-50 rounded-md text-red-600">
            {/* Pass the new constant to the function */}
            <p>{getFormattedErrorMessage(errorString)}</p>
            <Button 
              onClick={retryRelatedResearch} 
              variant="outline" 
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        </div>
      );
    }

    // Render the grid if there is data and no error
    return (
      <div className="">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Supporting Research Column */}
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-4"> 
              <CardTitle className="text-green-600 text-lg flex items-center"> 
                <span className="mr-2">✅</span> Supporting Research 
              </CardTitle>
              <CardDescription className="text-sm">
                Confirms or expands on this study
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasSupporting ? (
                <div className="space-y-3">
                  {relatedResearch.supporting.map(renderArticleCard)}
                </div>
              ) : (
                <p className="text-gray-600 text-sm">No supporting research found.</p>
              )}
            </CardContent>
          </Card>
          
          {/* Contradictory Research Column */}
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-amber-600 text-lg flex items-center">
                <span className="mr-2">⚠️</span> Contradictory Research
              </CardTitle>
              <CardDescription className="text-sm">
                Presents different or opposing findings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasContradictory ? (
                <div className="space-y-3">
                  {relatedResearch.contradictory.map(renderArticleCard)}
                </div>
              ) : (
                <p className="text-gray-600 text-sm">No contradictory research found.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Back Button - Only show in preview mode */}
      {isPreview && (
        <div className="mb-0 pb-0">
          <Button 
            variant="ghost" 
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-2 py-0"
            onClick={onBack || (() => router.push('/'))}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M19 12H5"></path>
              <path d="M12 19l-7-7 7-7"></path>
            </svg>
            Back
          </Button>
        </div>
      )}

      {/* Article Header */}
      <div className="mb-3 -mt-2">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          {articleSource && (
            <p>Source: {articleSource}</p>
          )}
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 ml-1">
              View Original
            </a>
          )}
        </div>

        {/* Title section with cleaner structure */}
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          {originalTitle || articleTitle || "Article Summary"}
        </h1>
        {/* Show AI Summary title always if available, not just when different from original title */}
        {aiSummaryTitle && (
          <h2 className="text-lg md:text-xl text-gray-600 italic">
            <span className="font-medium">AI Summary:</span> {aiSummaryTitle}
          </h2>
        )}
      </div>

      {/* Key findings */}
      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="bg-gray-50 py-4 px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-800">Key Findings</h3>
          <p className="text-sm text-gray-600">
            The most important discoveries from this research
          </p>
        </div>
        <div className="bg-white px-6 py-5">
          {renderVisualSummary()}
        </div>
      </div>

      {/* Keywords */}
      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="bg-gray-50 py-4 px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-800">Keywords</h3>
          <p className="text-sm text-gray-600">
            Important topics and terminology from the article
          </p>
        </div>
        <div className="bg-white px-6 py-5">
          {renderKeywords()}
        </div>
      </div>

      {/* Methodology - Using wrapper component to isolate and prevent stray outputs */}
      <MethodologySection />

      {/* Related Research - Conditional structure for preview */}
      {isPreview ? (
        // --- PREVIEW MODE Structure --- 
        <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm relative">
          <div className="filter blur-[4px]">
            {/* Card Header */}
            <div className="bg-gray-50 py-4 px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-800">Related Research</h3>
              <p className="text-sm text-gray-600">
                Articles with supporting or contradicting findings
              </p>
            </div>
            {/* Card Content Area */}
            <div className="bg-white px-6 py-5">
              {renderRelatedResearch()} 
            </div>
          </div>
          {/* Premium feature overlay */}
          <div className="absolute inset-0 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-lg bg-white/40">
            <div className="bg-white p-8 rounded-lg shadow-sm text-center max-w-sm border border-gray-100">
              <div className="mb-5 mx-auto w-12 h-12 text-amber-500 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Related Research</h3>
              <p className="text-gray-600 mb-6">Sign up for a free account to see research with supporting or opposing findings.</p>
              <Link href="/signup">
                <Button className="bg-[#3255A9] hover:bg-[#1e3a6d] w-full font-medium py-2 text-white">
                  Sign Up Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        // --- STANDARD MODE Structure ---
        <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          {/* Card Header */}
          <div className="bg-gray-50 py-4 px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">Related Research</h3>
            <p className="text-sm text-gray-600">
              Articles with supporting or contradicting findings
            </p>
          </div>
          {/* Card Content Area */}
          <div className="bg-white px-6 py-5">
            {renderRelatedResearch()}
          </div>
        </div>
      )}
    </div>
  );
} 