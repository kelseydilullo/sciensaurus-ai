'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface ArticleSummaryContentProps {
  articleData: any;
  relatedResearch: {
    supporting: any[];
    contradictory: any[];
    totalFound: number;
    searchKeywords: string[];
    error?: string;
  };
  url: string;
  retryRelatedResearch: () => void;
}

export default function ArticleSummaryContent({ 
  articleData, 
  relatedResearch, 
  url,
  retryRelatedResearch 
}: ArticleSummaryContentProps) {
  const [articleTitle, setArticleTitle] = useState<string>('');
  const [articleSource, setArticleSource] = useState<string>('');
  const [publishDate, setPublishDate] = useState<string>('');
  
  // Function to parse text response (moved to the top)
  const parseTextResponse = (text: string) => {
    const result: any = {
      title: "",
      originalTitle: "",
      visualSummary: [] as { emoji: string; point: string }[],
      keywords: [] as string[],
      cohortAnalysis: {
        studyType: "",
        duration: "",
        dateRange: "",
        cohortSize: 0,
        notes: [] as string[],
        demographics: {
          age: [] as { range: string; percentage: number }[],
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
    }
    
    // Parse title
    const titleSection = text.match(/### Summarized Title:\s*([\s\S]*?)(?=###|$)/);
    if (titleSection && titleSection[1]) {
      result.title = titleSection[1].trim();
    }
    
    // Parse visual summary
    const visualSummarySection = text.match(/### Visual Summary:\s*([\s\S]*?)(?=###|$)/);
    if (visualSummarySection && visualSummarySection[1]) {
      const points = visualSummarySection[1].trim().split('\n').filter(line => line.trim() !== '');
      
      points.forEach(point => {
        const emojiMatch = point.match(/^([\p{Emoji}])\s+(.*)/u);
        if (emojiMatch) {
          result.visualSummary.push({
            emoji: emojiMatch[1],
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
      
      // Text number patterns - expanded to include more variations
      const textNumberPatterns: Record<string, number> = {
        'ninety': 90, 'ninety-one': 91, 'ninety-two': 92, 'ninety-three': 93, 
        'ninety-four': 94, 'ninety-five': 95, 'ninety-six': 96, 'ninety-seven': 97, 
        'ninety-eight': 98, 'ninety-nine': 99, 'one hundred': 100, 
        'eighty': 80, 'seventy': 70, 'sixty': 60, 'fifty': 50, 
        'forty': 40, 'thirty': 30, 'twenty': 20, 'ten': 10,
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9
      };
      
      // First check for direct numeric matches
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
      } else {
        // Try to match text numbers
        // First look for explicit patterns
        let foundTextMatch = false;
        
        // Try to extract from the full article text rather than just cohort section
        const fullTextToSearch = text + " " + cohortText; // Search both the section and full text
        
        for (const [textNumber, numValue] of Object.entries(textNumberPatterns)) {
          // Try multiple patterns for text numbers
          // Pattern 1: "textNumber participants/subjects/etc."
          const textMatchPattern1 = new RegExp(`\\b(${textNumber})\\s+(?:participants|subjects|people|individuals|patients)\\b`, 'i');
          // Pattern 2: "enrolled/included/etc. textNumber participants/subjects/etc."
          const textMatchPattern2 = new RegExp(`(?:enrolled|included|recruited|randomized|assigned)\\s+(?:a\\s+total\\s+of\\s+)?\\b(${textNumber})\\b`, 'i');
          // Pattern 3: "total of textNumber"
          const textMatchPattern3 = new RegExp(`total\\s+of\\s+\\b(${textNumber})\\b`, 'i');
          
          const textMatch = fullTextToSearch.match(textMatchPattern1) || 
                            fullTextToSearch.match(textMatchPattern2) || 
                            fullTextToSearch.match(textMatchPattern3);
          
          if (textMatch) {
            result.cohortAnalysis.cohortSize = numValue;
            foundTextMatch = true;
            break;
          }
        }
        
        // If still no match, try more general pattern matching for full text descriptions
        if (!foundTextMatch) {
          // Look for phrases like "ninety patients were enrolled"
          const genericTextMatch = fullTextToSearch.match(/\b(ninety|eighty|seventy|sixty|fifty|forty|thirty|twenty|ten|one hundred)\b.*?(?:participants|subjects|patients|people|individuals)/i);
          
          if (genericTextMatch && genericTextMatch[1]) {
            const numberText = genericTextMatch[1].toLowerCase();
            if (textNumberPatterns[numberText]) {
              result.cohortAnalysis.cohortSize = textNumberPatterns[numberText];
            }
          }
        }
      }
      
      // Check additional patterns
      if (result.cohortAnalysis.cohortSize === 0) {
        // Check for "enrolled X participants" pattern
        const enrolledMatch = text.match(/enrolled\s+(\d+)\s+participants/i) || 
                               cohortText.match(/enrolled\s+(\d+)\s+participants/i);
        if (enrolledMatch && enrolledMatch[1]) {
          result.cohortAnalysis.cohortSize = parseInt(enrolledMatch[1]);
        }
        
        // Look for n = X pattern
        const nEqualsMatch = text.match(/n\s*=\s*(\d+)/i) || 
                              cohortText.match(/n\s*=\s*(\d+)/i);
        if (nEqualsMatch && nEqualsMatch[1]) {
          result.cohortAnalysis.cohortSize = parseInt(nEqualsMatch[1]);
        }
        
        // Look for specific PubMed abstract patterns
        // Pattern: "We enrolled ninety participants..."
        const enrolledTextMatch = text.match(/(?:we|they)\s+(?:enrolled|included|recruited)\s+(\w+[\-\s]?\w*)\s+(?:participants|subjects|patients|people|individuals)/i) ||
                                   cohortText.match(/(?:we|they)\s+(?:enrolled|included|recruited)\s+(\w+[\-\s]?\w*)\s+(?:participants|subjects|patients|people|individuals)/i);
                                   
        if (enrolledTextMatch && enrolledTextMatch[1]) {
          const numberText = enrolledTextMatch[1].toLowerCase();
          // Check if it's a known text number
          if (textNumberPatterns[numberText]) {
            result.cohortAnalysis.cohortSize = textNumberPatterns[numberText];
          }
        }
        
        // Look for "A total of X patients/participants"
        const totalOfMatch = text.match(/total\s+of\s+(\w+[\-\s]?\w*)\s+(?:participants|subjects|patients|people|individuals)/i) ||
                               cohortText.match(/total\s+of\s+(\w+[\-\s]?\w*)\s+(?:participants|subjects|patients|people|individuals)/i);
                               
        if (totalOfMatch && totalOfMatch[1]) {
          const numberText = totalOfMatch[1].toLowerCase();
          // Check if it's a known text number
          if (textNumberPatterns[numberText]) {
            result.cohortAnalysis.cohortSize = textNumberPatterns[numberText];
          } else if (/\d+/.test(totalOfMatch[1])) {
            // It's a numeric value
            const numericPart = totalOfMatch[1].match(/\d[\d,]*/);
            if (numericPart) {
              result.cohortAnalysis.cohortSize = parseInt(numericPart[0].replace(/,/g, ''));
            }
          }
        }
        
        // Direct search for "ninety participants" in the PubMed abstract
        if (result.cohortAnalysis.cohortSize === 0) {
          if (text.includes("ninety participants") || cohortText.includes("ninety participants")) {
            result.cohortAnalysis.cohortSize = 90;
          }
        }
      }
      
      // Extract study population
      const populationMatch = cohortText.match(/Study Population:|Target Population:|Participants:|Subject Characteristics:\s*([\s\S]*?)(?=\n\n|Demographics:|Age Distribution:|Gender:|Study Design:|$)/i);
      
      if (populationMatch && populationMatch[1]) {
        result.cohortAnalysis.studyPopulation = populationMatch[1].trim();
      }
      
      // Extract age demographics
      const ageDemographicsSection = cohortText.match(/Age Distribution:?\s*([\s\S]*?)(?=(Gender:|Geographic Distribution:|Notes:|$))/i);
      if (ageDemographicsSection && ageDemographicsSection[1]) {
        const ageText = ageDemographicsSection[1].trim();
        
        // Try multiple patterns to extract age data
        let ageDataFound = false;
        
        // Pattern 1: Look for patterns like "18-24: 15%" or "65+: 5%" or "Under 18: 10%"
        const ageRangePattern = /([A-Za-z0-9\s\-\+]+):\s*(\d+(?:\.\d+)?)%/g;
        let ageRangeMatch;
        
        // Use the regex to find all age ranges and percentages
        while ((ageRangeMatch = ageRangePattern.exec(ageText)) !== null) {
          const range = ageRangeMatch[1].trim();
          const percentage = parseFloat(ageRangeMatch[2]);
          
          if (range && !isNaN(percentage)) {
            result.cohortAnalysis.demographics.age.push({
              range,
              percentage
            });
            ageDataFound = true;
          }
        }
        
        // Pattern 2: If no matches found but there's text about age distribution, try line by line
        if (!ageDataFound) {
          const lines = ageText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
          
          for (const line of lines) {
            // Try to extract age and percentage information from each line
            // Look for various formats including "X% were between Y-Z years"
            const ageMatch = line.match(/(\d+(?:\.\d+)?)%.*?(\d+(?:\-\d+|\+)?|(?:under|over)\s+\d+|young adults|middle aged|elderly)/i) || 
                            line.match(/(\d+(?:\-\d+|\+)|(?:under|over)\s+\d+|young adults|middle aged|elderly).*?(\d+(?:\.\d+)?)%/i);
            
            if (ageMatch) {
              // Determine which group is the percentage and which is the age range
              let range, percentage;
              
              if (ageMatch[1].includes('%')) {
                percentage = parseFloat(ageMatch[1].replace('%', ''));
                range = ageMatch[2].trim();
              } else {
                range = ageMatch[1].trim();
                percentage = parseFloat(ageMatch[2].replace('%', ''));
              }
              
              if (range && !isNaN(percentage)) {
                result.cohortAnalysis.demographics.age.push({
                  range,
                  percentage
                });
                ageDataFound = true;
              }
            }
          }
        }
        
        // Pattern 3: Look for age ranges described in prose
        if (!ageDataFound) {
          // Examples: "60% of participants were between 30-45 years old"
          const proseMatches = ageText.matchAll(/(\d+(?:\.\d+)?)%.*?(?:were|was|aged|between|in the range of|from).*?(\d+)\s*(?:\-|to)\s*(\d+|\+)/gi);
          
          for (const match of proseMatches) {
            const percentage = parseFloat(match[1]);
            const ageStart = match[2];
            const ageEnd = match[3];
            
            if (!isNaN(percentage)) {
              result.cohortAnalysis.demographics.age.push({
                range: `${ageStart}-${ageEnd}`,
                percentage
              });
              ageDataFound = true;
            }
          }
        }
      }
      
      // Extract gender demographics
      const genderSection = cohortText.match(/Gender:?\s*([\s\S]*?)(?=(Geographic Distribution:|Notes:|$))/i);
      if (genderSection && genderSection[1]) {
        const genderText = genderSection[1].trim();
        
        // Pattern 1: Standard percentage format "Male: X%"
        const maleMatch = genderText.match(/Male:?\s*(\d+(?:\.\d+)?)%/i);
        if (maleMatch && maleMatch[1]) {
          result.cohortAnalysis.demographics.gender.male = parseFloat(maleMatch[1]);
        }
        
        const femaleMatch = genderText.match(/Female:?\s*(\d+(?:\.\d+)?)%/i);
        if (femaleMatch && femaleMatch[1]) {
          result.cohortAnalysis.demographics.gender.female = parseFloat(femaleMatch[1]);
        }
        
        const otherMatch = genderText.match(/Other:?\s*(\d+(?:\.\d+)?)%/i);
        if (otherMatch && otherMatch[1]) {
          result.cohortAnalysis.demographics.gender.other = parseFloat(otherMatch[1]);
        }
        
        // Pattern 2: Look for prose descriptions
        if (result.cohortAnalysis.demographics.gender.male === 0 && 
            result.cohortAnalysis.demographics.gender.female === 0) {
          
          // Examples: "60% were male" or "female participants (70%)"
          const maleProse = genderText.match(/(\d+(?:\.\d+)?)%.*?(?:were|was|identified as).*?male/i) ||
                           genderText.match(/male.*?(\d+(?:\.\d+)?)%/i);
          
          if (maleProse && maleProse[1]) {
            result.cohortAnalysis.demographics.gender.male = parseFloat(maleProse[1]);
          }
          
          const femaleProse = genderText.match(/(\d+(?:\.\d+)?)%.*?(?:were|was|identified as).*?female/i) ||
                             genderText.match(/female.*?(\d+(?:\.\d+)?)%/i);
          
          if (femaleProse && femaleProse[1]) {
            result.cohortAnalysis.demographics.gender.female = parseFloat(femaleProse[1]);
          }
        }
        
        // If we have only one gender percentage, calculate the other (assuming binary for simplicity)
        if (result.cohortAnalysis.demographics.gender.male > 0 && 
            result.cohortAnalysis.demographics.gender.female === 0 && 
            result.cohortAnalysis.demographics.gender.other === 0) {
          
          result.cohortAnalysis.demographics.gender.female = 100 - result.cohortAnalysis.demographics.gender.male;
        } 
        else if (result.cohortAnalysis.demographics.gender.female > 0 && 
                 result.cohortAnalysis.demographics.gender.male === 0 &&
                 result.cohortAnalysis.demographics.gender.other === 0) {
          
          result.cohortAnalysis.demographics.gender.male = 100 - result.cohortAnalysis.demographics.gender.female;
        }
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
  const result = articleData.rawText
    ? parseTextResponse(articleData.rawText)
    : articleData;
  
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
    
    // Set article title if available
    if (result?.title) {
      setArticleTitle(result.title);
    } else if (result?.originalTitle) {
      setArticleTitle(result.originalTitle);
    }
  }, [url, result]);
  
  const renderVisualSummary = () => {
    if (!result || !result.visualSummary || result.visualSummary.length === 0) {
      return <p className="text-gray-600">No key findings available.</p>;
    }
    
    return (
      <div className="space-y-4">
        {result.visualSummary.map((item: { emoji: string; point: string }, index: number) => (
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
    if (!result || !result.keywords || result.keywords.length === 0) {
      return <p className="text-gray-600">No keywords available.</p>;
    }
    
    return (
      <div className="flex flex-wrap gap-2">
        {result.keywords.map((keyword: string, index: number) => (
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
  
  // Render the methodology section
  const renderMethodology = () => {
    if (!result.cohortAnalysis) {
      return null;
    }

    console.log("Methodology Data:", result.cohortAnalysis);
    console.log("Age Demographics:", result.cohortAnalysis.demographics?.age);
    console.log("Gender Demographics:", result.cohortAnalysis.demographics?.gender);

    // Check if we have valid age data to render
    const hasAgeData = result.cohortAnalysis.demographics.age && 
                       Array.isArray(result.cohortAnalysis.demographics.age) && 
                       result.cohortAnalysis.demographics.age.length > 0;
    
    // Prepare gender data for pie chart if available
    const hasGenderData = result.cohortAnalysis.demographics.gender &&
      (result.cohortAnalysis.demographics.gender.male > 0 || 
       result.cohortAnalysis.demographics.gender.female > 0 || 
       result.cohortAnalysis.demographics.gender.other > 0);
    
    const genderData = result.cohortAnalysis.demographics.gender ? [
      { name: 'Male', value: result.cohortAnalysis.demographics.gender.male },
      { name: 'Female', value: result.cohortAnalysis.demographics.gender.female }
    ].filter(item => item.value > 0) : [];
    
    // Re-check if we have age data
    const shouldShowAgeChart = hasAgeData;
                              
    // Re-check if we have gender data                         
    const shouldShowGenderChart = hasGenderData;
       
    if (shouldShowGenderChart && result.cohortAnalysis.demographics.gender.other > 0) {
      genderData.push({ name: 'Other', value: result.cohortAnalysis.demographics.gender.other });
    }

    // Extract age range information from notes or text
    const extractAgeRangeInfo = () => {
      // First check if we have notes that mention age
      if (result.cohortAnalysis.notes && result.cohortAnalysis.notes.length > 0) {
        for (const note of result.cohortAnalysis.notes) {
          // Look for common age range patterns in notes
          const ageRangeMatch = note.match(/aged\s+between\s+(\d+)\s+and\s+(\d+)/i) || 
                                note.match(/aged\s+(\d+)\s*\-\s*(\d+)/i) ||
                                note.match(/ages?\s+(\d+)\s+to\s+(\d+)/i) ||
                                note.match(/ages?\s+of\s+(\d+)\s*\-\s*(\d+)/i) ||
                                note.match(/participants\s+were\s+(\d+)\s*\-\s*(\d+)\s+years/i) ||
                                note.match(/(\d+)\s*\-\s*(\d+)\s+years?\s+old/i) ||
                                note.match(/age(?:s|d)?\s+(?:range|from)?\s*:?\s*(\d+)\s*[^\d]+\s*(\d+)/i);
          
          if (ageRangeMatch) {
            return `${ageRangeMatch[1]}-${ageRangeMatch[2]} years`;
          }
        }
      }
      
      // Check for age data in the studyPopulation field if available
      if (result.cohortAnalysis.studyPopulation) {
        const populationAgeMatch = result.cohortAnalysis.studyPopulation.match(/aged\s+between\s+(\d+)\s+and\s+(\d+)/i) || 
                                   result.cohortAnalysis.studyPopulation.match(/aged\s+(\d+)\s*\-\s*(\d+)/i) ||
                                   result.cohortAnalysis.studyPopulation.match(/ages?\s+(\d+)\s+to\s+(\d+)/i);
        
        if (populationAgeMatch) {
          return `${populationAgeMatch[1]}-${populationAgeMatch[2]} years`;
        }
      }
      
      // If we have age demographics data but not enough for a chart, extract the range info
      if (result.cohortAnalysis.demographics.age && 
          result.cohortAnalysis.demographics.age.length === 1) {
        return result.cohortAnalysis.demographics.age[0].range;
      }
      
      return null;
    };

    const ageRangeInfo = extractAgeRangeInfo();
    const hasAgeRangeInfo = !!ageRangeInfo;

    // Debug view component for development environment
    const DebugView = () => {
      if (process.env.NODE_ENV !== 'development') return null;
      
      return (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg border border-gray-300">
          <h4 className="text-sm font-medium text-gray-800 mb-2">Debug Data (Dev Only)</h4>
          
          <details className="mb-2">
            <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-800">
              Show Raw Methodology Data
            </summary>
            <div className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-[300px]">
              <pre>{JSON.stringify(result.cohortAnalysis, null, 2)}</pre>
            </div>
          </details>
          
          <details className="mb-2">
            <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-800">
              Show Age Demographics Data
            </summary>
            <div className="mt-2 p-2 bg-white rounded text-xs overflow-auto">
              <p className="font-bold mb-1">Has Age Data: {hasAgeData ? "Yes" : "No"}</p>
              <p className="mb-1">Count: {result.cohortAnalysis.demographics.age?.length || 0} age ranges</p>
              <p className="mb-1">Extracted Age Range: {ageRangeInfo || "None found"}</p>
              <pre>{JSON.stringify(result.cohortAnalysis.demographics.age, null, 2)}</pre>
            </div>
          </details>
          
          <details>
            <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-800">
              Show Gender Demographics Data
            </summary>
            <div className="mt-2 p-2 bg-white rounded text-xs overflow-auto">
              <p className="font-bold mb-1">Has Gender Data: {hasGenderData ? "Yes" : "No"}</p>
              <pre>{JSON.stringify(result.cohortAnalysis.demographics.gender, null, 2)}</pre>
              <p className="mt-2">Gender Data for Chart:</p>
              <pre>{JSON.stringify(genderData, null, 2)}</pre>
            </div>
          </details>
        </div>
      );
    };

    // Check if we have any cohort data to show
    const hasCohortData = result.cohortAnalysis.cohortSize > 0 || 
                          result.cohortAnalysis.duration || 
                          result.cohortAnalysis.dateRange ||
                          hasAgeData || 
                          hasGenderData ||
                          hasAgeRangeInfo;

    // Function to render a study info widget
    const StudyInfoWidget = ({ 
      icon, 
      title, 
      value, 
      color = "blue" 
    }: { 
      icon: React.ReactNode, 
      title: string, 
      value: string | number | React.ReactNode, 
      color?: "blue" | "green" | "purple" | "amber" | "indigo" 
    }) => {
      const gradientClasses = {
        blue: "bg-blue-50 border-blue-200",
        green: "bg-green-50 border-green-200",
        purple: "bg-purple-50 border-purple-200",
        amber: "bg-amber-50 border-amber-200",
        indigo: "bg-indigo-50 border-indigo-200"
      };
      
      const iconClasses = {
        blue: "bg-blue-100 text-blue-700",
        green: "bg-green-100 text-green-700",
        purple: "bg-purple-100 text-purple-700",
        amber: "bg-amber-100 text-amber-700",
        indigo: "bg-indigo-100 text-indigo-700"
      };
      
      const titleClasses = {
        blue: "text-blue-700",
        green: "text-green-700",
        purple: "text-purple-700",
        amber: "text-amber-700",
        indigo: "text-indigo-700"
      };

      return (
        <div className={`rounded-lg border p-5 shadow-sm hover:shadow ${gradientClasses[color]}`}>
          <div className="flex items-start gap-4">
            <div className={`rounded-full p-3 ${iconClasses[color]}`}>
              {icon}
            </div>
            <div>
              <h4 className={`text-sm font-semibold mb-1 ${titleClasses[color]}`}>{title}</h4>
              <div className="text-base font-medium text-gray-800">{value}</div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div>
        {/* Study Details widgets */}
        {hasCohortData ? (
          <>
            {/* Main study info widgets in a grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Study Participants */}
              {result.cohortAnalysis.cohortSize > 0 && (
                <StudyInfoWidget
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  }
                  title="Study Participants"
                  value={`${result.cohortAnalysis.cohortSize.toLocaleString()} participants`}
                  color="blue"
                />
              )}
              
              {/* Study Duration */}
              {(result.cohortAnalysis.duration || result.cohortAnalysis.dateRange) && (
                <StudyInfoWidget
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  }
                  title="Study Duration"
                  value={
                    <div>
                      {result.cohortAnalysis.duration && (
                        <div>{result.cohortAnalysis.duration}</div>
                      )}
                      {result.cohortAnalysis.dateRange && (
                        <div className="text-sm font-normal mt-1 text-gray-600">
                          Date Range: {result.cohortAnalysis.dateRange}
                        </div>
                      )}
                    </div>
                  }
                  color="green"
                />
              )}
              
              {/* Study Type */}
              {result.cohortAnalysis.studyType && (
                <StudyInfoWidget
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                    </svg>
                  }
                  title="Study Type"
                  value={result.cohortAnalysis.studyType}
                  color="purple"
                />
              )}
              
              {/* Age Demographics widget */}
              {hasAgeRangeInfo && (
                <StudyInfoWidget
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M22 12h-4"></path>
                      <path d="M20 15v-6"></path>
                    </svg>
                  }
                  title="Age Demographics"
                  value={ageRangeInfo}
                  color="indigo"
                />
              )}
              
              {/* Study Population */}
              {result.cohortAnalysis.studyPopulation && (
                <StudyInfoWidget
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  }
                  title="Study Population"
                  value={result.cohortAnalysis.studyPopulation}
                  color="amber"
                />
              )}
            </div>
            
            {/* Age Demographics Chart (only if we have enough data for a chart) */}
            {shouldShowAgeChart && (
              <div className="mt-8 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center border-b border-gray-200 pb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                  </svg>
                  Age Distribution
                </h4>
                <div className="h-80 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={result.cohortAnalysis.demographics.age}
                      margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="range" 
                        height={60}
                        angle={-45}
                        textAnchor="end"
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                      />
                      <YAxis 
                        domain={[0, (dataMax: number) => Math.min(Math.ceil(dataMax * 1.2), 100)]}
                        tickFormatter={(value) => `${value}%`}
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                      />
                      <Tooltip 
                        formatter={(value) => [`${value}%`, 'Percentage']}
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '12px',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                        }}
                        cursor={{ fill: 'rgba(209, 213, 219, 0.2)' }}
                      />
                      <Bar 
                        dataKey="percentage" 
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                        name="Percentage"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            
            {/* Gender Demographics - MOVED UP above Study Notes with more subtle styling */}
            {shouldShowGenderChart && (
              <div className="mt-8 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center border-b border-gray-200 pb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                    <line x1="9" y1="9" x2="9.01" y2="9"></line>
                    <line x1="15" y1="9" x2="15.01" y2="9"></line>
                  </svg>
                  Gender Demographics
                </h4>
                <div className="h-80 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genderData}
                        cx="50%"
                        cy="45%"
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        labelLine={true}
                      >
                        {genderData.map((entry, index: number) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={index === 0 ? '#3b82f6' : index === 1 ? '#ec4899' : '#8b5cf6'} 
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value}%`, 'Percentage']}
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '12px',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend 
                        layout="horizontal" 
                        verticalAlign="bottom" 
                        align="center"
                        wrapperStyle={{ paddingTop: '20px' }}
                        formatter={(value) => <span style={{ fontSize: '14px', color: '#374151' }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            
            {/* Study Notes - KEPT below Gender Demographics but with toned down styling */}
            {result.cohortAnalysis.notes && result.cohortAnalysis.notes.length > 0 && (
              <div className="mt-8 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center border-b border-gray-200 pb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
                    <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"></path>
                    <line x1="9" y1="9" x2="10" y2="9"></line>
                    <line x1="9" y1="13" x2="15" y2="13"></line>
                    <line x1="9" y1="17" x2="15" y2="17"></line>
                  </svg>
                  Study Notes
                </h4>
                <ul className="list-disc pl-6 text-sm text-gray-700 space-y-3">
                  {result.cohortAnalysis.notes.map((note: string, index: number) => (
                    <li key={index} className="leading-relaxed">{note}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-10 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <p className="text-md font-medium text-gray-600 italic max-w-md mx-auto">
              No detailed methodology information is available for this study.
            </p>
            <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
              This could be due to limited reporting in the original article or abstract.
            </p>
          </div>
        )}
        
        {/* Debug View - only in development */}
        <DebugView />
      </div>
    );
  };
  
  const renderRelatedResearch = () => {
    const { supporting, contradictory, error: researchError, searchKeywords } = relatedResearch;
    
    // Check if the error contains common connection errors and make them user-friendly
    const getFormattedErrorMessage = (error: string) => {
      if (error.includes('ECONNREFUSED') || error.includes('CONNECTION_REFUSED') || error.includes('Internal Server Error')) {
        return 'Unable to connect to the research database. The service might be temporarily unavailable.';
      } else if (error.includes('ETIMEDOUT') || error.includes('timeout')) {
        return 'Connection to the research database timed out. Please try again later.';
      } else if (error.includes('ENOTFOUND')) {
        return 'Could not resolve the research database hostname. Please check your network connection.';
      }
      return error;
    };
    
    // Handle errors with a retry button
    if (researchError) {
      return (
        <div className="p-6 bg-red-50 border border-red-100 rounded-md">
          <div className="flex flex-col items-center text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-red-600 mb-4">{getFormattedErrorMessage(researchError)}</p>
            <Button 
              variant="outline"
              className="bg-white hover:bg-gray-100 text-red-600 border-red-300"
              onClick={retryRelatedResearch}
            >
              Retry
            </Button>
          </div>
        </div>
      );
    }
    
    if (supporting.length === 0 && contradictory.length === 0) {
      return (
        <div className="p-6 text-center bg-gray-50 border border-gray-100 rounded-md">
          <p className="text-gray-600 mb-2">No related research articles found.</p>
          <Button 
            variant="outline"
            className="text-gray-600 border-gray-300 hover:bg-gray-100 text-sm"
            onClick={retryRelatedResearch}
          >
            Try again
          </Button>
        </div>
      );
    }
    
    return (
      <div className="grid md:grid-cols-2 gap-8">
        {/* Supporting Research */}
        <div>
          <h4 className="text-lg font-medium mb-4 flex items-center">
            <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
            Supporting Research
          </h4>
          <div className="space-y-4">
            {supporting.length === 0 ? (
              <p className="text-gray-500">No supporting research articles found.</p>
            ) : (
              supporting.map((article, index) => (
                <div key={index} className="border-l-4 border-l-green-500 p-4 bg-white shadow-sm rounded-md">
                  <h5 className="font-medium text-blue-900 mb-1">
                    <a href={article.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {article.title}
                    </a>
                  </h5>
                  {article.finding && (
                    <p className="text-sm text-gray-700 my-2 bg-green-50 p-2 rounded border-l-2 border-l-green-400">
                      <span className="text-green-600 font-medium">This study supports: </span>{article.finding}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Contradictory Research */}
        <div>
          <h4 className="text-lg font-medium mb-4 flex items-center">
            <span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>
            Contradictory Research
          </h4>
          <div className="space-y-4">
            {contradictory.length === 0 ? (
              <p className="text-gray-500">No contradictory research articles found.</p>
            ) : (
              contradictory.map((article, index) => (
                <div key={index} className="border-l-4 border-l-red-500 p-4 bg-white shadow-sm rounded-md">
                  <h5 className="font-medium text-blue-900 mb-1">
                    <a href={article.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {article.title}
                    </a>
                  </h5>
                  {article.finding && (
                    <p className="text-sm text-gray-700 my-2 bg-red-50 p-2 rounded border-l-2 border-l-red-400">
                      <span className="text-red-600 font-medium">This study challenges: </span>{article.finding}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-8">
      {/* Article Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          {articleSource && (
            <>
              <span>Source: {articleSource}</span>
              <span>•</span>
            </>
          )}
          {publishDate && (
            <>
              <span>Published: {publishDate}</span>
              <span>•</span>
            </>
          )}
          <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
            View Original 
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-3 w-3" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          {articleTitle || "Article Analysis"}
        </h1>
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

      {/* Methodology */}
      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="bg-gray-50 py-4 px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-800">Methodology</h3>
          <p className="text-sm text-gray-600">
            Analysis of the study methodology
          </p>
        </div>
        <div className="bg-white px-6 py-5">
          {renderMethodology()}
        </div>
      </div>

      {/* Related Research */}
      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="bg-gray-50 py-4 px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-800">Related Research</h3>
          <p className="text-sm text-gray-600">
            Articles with supporting or contradicting findings
          </p>
        </div>
        <div className="bg-white px-6 py-5">
          {renderRelatedResearch()}
        </div>
      </div>
    </div>
  );
} 