'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ArticleSummaryContent from '@/components/article-summary-content';
import { createClient } from '@/utils/supabase/client';

// Predefined article titles for each tab
const ARTICLE_TABS = [
  {
    id: 'gut-health',
    title: 'Gut Health and Mental Health',
    placeholder: 'Loading gut health article...'
  },
  {
    id: 'whole-foods',
    title: 'Whole Foods and Metabolic Health',
    placeholder: 'Loading whole foods article...'
  },
  {
    id: 'sleep-quality',
    title: 'Sleep Quality and Cognitive Function',
    placeholder: 'Loading sleep quality article...'
  }
];

interface PreAnalyzedArticlesProps {
  adminEmail?: string;
}

export default function PreAnalyzedArticles({ adminEmail = 'kelsey.s.oneill@gmail.com' }: PreAnalyzedArticlesProps) {
  const [articles, setArticles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('gut-health');
  const [error, setError] = useState<string | null>(null);

  // Fetch articles from admin account
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        // First approach: Try direct admin fetch API
        const response = await fetch(`/api/get-admin-articles?email=${encodeURIComponent(adminEmail)}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch articles: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.articles || !Array.isArray(data.articles) || data.articles.length < 3) {
          throw new Error('Not enough articles found in the response');
        }

        // Map articles to tabs by keywords/titles
        const mappedArticles: Record<string, any> = {};
        
        // Look for gut health article
        const gutHealthArticle = data.articles.find(
          (article: any) => 
            (article.title?.toLowerCase().includes('gut') && article.title?.toLowerCase().includes('mental')) ||
            (article.keywords?.some((k: string) => k.toLowerCase().includes('gut')) &&
             article.keywords?.some((k: string) => k.toLowerCase().includes('mental')))
        );
        
        // Look for whole foods article
        const wholeFoodsArticle = data.articles.find(
          (article: any) => 
            (article.title?.toLowerCase().includes('whole food') || article.title?.toLowerCase().includes('metabolic')) ||
            (article.keywords?.some((k: string) => k.toLowerCase().includes('whole food')) ||
             article.keywords?.some((k: string) => k.toLowerCase().includes('metabolic')))
        );
        
        // Look for sleep quality article
        const sleepQualityArticle = data.articles.find(
          (article: any) => 
            (article.title?.toLowerCase().includes('sleep') && article.title?.toLowerCase().includes('cognitive')) ||
            (article.keywords?.some((k: string) => k.toLowerCase().includes('sleep')) &&
             article.keywords?.some((k: string) => k.toLowerCase().includes('cognitive')))
        );

        // If we can't find specific articles, just use the first 3
        mappedArticles['gut-health'] = gutHealthArticle || data.articles[0];
        mappedArticles['whole-foods'] = wholeFoodsArticle || data.articles[1];
        mappedArticles['sleep-quality'] = sleepQualityArticle || data.articles[2];

        setArticles(mappedArticles);
      } catch (err) {
        console.error('Error fetching pre-analyzed articles:', err);
        setError(err instanceof Error ? err.message : 'Failed to load articles');
        
        // Set placeholder articles for display
        setArticles({
          'gut-health': getPlaceholderGutHealthArticle(),
          'whole-foods': getPlaceholderWholeFoodsArticle(),
          'sleep-quality': getPlaceholderSleepArticle()
        });
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [adminEmail]);

  // Update the relatedResearch for each article
  const getRelatedResearch = (article: any) => {
    return article?.related_research || {
      supporting: [],
      contradictory: [],
      totalFound: 0,
      searchKeywords: article?.keywords || [],
      isPreview: true
    };
  };

  // Empty callback function for retryRelatedResearch
  const retryRelatedResearch = () => {
    // This is a placeholder - not needed for demo view
  };

  return (
    <div className="mt-8 mb-24">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-[#1e3a6d] mb-2">Example Summarized Articles</h2>
        {/* <p className="text-lg text-gray-600 italic mb-3">See Sciensaurus In Action</p> */}
      </div>

      <Card className="overflow-hidden border border-gray-200 shadow-md max-w-5xl mx-auto">
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="bg-gray-50 border-b border-gray-200 p-0 w-full rounded-none flex divide-x divide-gray-200">
            {ARTICLE_TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex-1 py-4 px-5 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#3255A9] data-[state=active]:shadow-none data-[state=active]:bg-white font-medium text-base md:text-lg text-gray-700 data-[state=active]:text-[#1e3a6d]"
              >
                {tab.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {ARTICLE_TABS.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="p-6">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-6"></div>
                    <div className="h-24 bg-gray-200 rounded w-full mb-4"></div>
                    <div className="h-24 bg-gray-200 rounded w-full"></div>
                  </div>
                </div>
              ) : articles[tab.id] ? (
                <div className="article-preview px-6 py-2">
                  <ArticleSummaryContent
                    articleData={articles[tab.id]}
                    relatedResearch={{
                      ...getRelatedResearch(articles[tab.id]),
                      isPreview: true
                    }}
                    url={articles[tab.id].url || ''}
                    retryRelatedResearch={retryRelatedResearch}
                    isPreview={true}
                    showBackButton={false}
                  />
                </div>
              ) : (
                <div className="p-8 text-center text-gray-600">
                  {error ? `Error: ${error}` : tab.placeholder}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </Card>
    </div>
  );
}

// Placeholder article data functions
function getPlaceholderGutHealthArticle() {
  return {
    title: "The Gut-Brain Connection: How Intestinal Microbiota Influences Mental Health",
    summarized_title: "Gut microbiome directly impacts brain function and mental health through various biochemical pathways",
    url: "https://example.com/gut-mental-health",
    visual_summary: [
      { emoji: "🦠", point: "The gut microbiome produces neurotransmitters like serotonin and dopamine that affect mood and cognition." },
      { emoji: "🧠", point: "Alterations in gut bacteria composition are linked to anxiety, depression, and stress responses." },
      { emoji: "🔄", point: "The vagus nerve provides a direct communication pathway between gut bacteria and the brain." },
      { emoji: "🧫", point: "Probiotics and prebiotics can improve mental health outcomes by modulating gut bacteria." },
      { emoji: "⚡", point: "Gut inflammation can trigger neuroinflammation, affecting cognitive function and emotional regulation." }
    ],
    keywords: ["Gut microbiome", "Mental health", "Microbiota-gut-brain axis", "Probiotics", "Neuroinflammation"],
    study_metadata: {
      studyType: "Systematic review and meta-analysis",
      cohortSize: 1250,
      notes: ["Analysis of 26 clinical studies", "Diverse populations across 12 countries", "Both healthy and clinical populations included"]
    }
  };
}

function getPlaceholderWholeFoodsArticle() {
  return {
    title: "Impact of Whole Food Consumption on Blood Glucose Regulation and Metabolic Health",
    summarized_title: "Whole foods significantly improve glucose regulation compared to processed foods",
    url: "https://example.com/whole-foods-metabolic-health",
    visual_summary: [
      { emoji: "🥦", point: "Diets rich in fiber from vegetables and whole grains reduced blood sugar spikes by 42% compared to processed food diets." },
      { emoji: "📊", point: "Continuous glucose monitoring showed 37% less glycemic variability in participants consuming whole foods." },
      { emoji: "⏱️", point: "Whole food meals resulted in sustained energy levels for 4-5 hours compared to 2-3 hours with processed foods." },
      { emoji: "🍎", point: "Antioxidants and polyphenols in fruits improved insulin sensitivity by 22% in just 14 days." },
      { emoji: "🧠", point: "Cognitive performance tests showed 18% improvement in focus during the whole food phase compared to processed foods." }
    ],
    keywords: ["Whole Foods", "Blood Glucose", "Glycemic Response", "Insulin Sensitivity", "Metabolic Health"],
    study_metadata: {
      studyType: "Randomized crossover trial",
      cohortSize: 248,
      notes: ["12-week intervention", "Continuous glucose monitoring throughout study period", "Participants maintained consistent exercise habits"]
    }
  };
}

function getPlaceholderSleepArticle() {
  return {
    title: "Sleep Quality and Duration: Critical Factors in Cognitive Function and Memory Consolidation",
    summarized_title: "Sleep quality directly impacts memory consolidation, cognitive performance, and brain health",
    url: "https://example.com/sleep-cognitive-function",
    visual_summary: [
      { emoji: "💤", point: "Deep sleep stages are essential for memory consolidation, with each additional hour improving recall by 23%." },
      { emoji: "🧩", point: "Problem-solving abilities decreased by 33% after just one night of poor sleep quality." },
      { emoji: "⏰", point: "Regular sleep schedules maintain circadian rhythms that optimize cognitive performance throughout the day." },
      { emoji: "🧪", point: "Sleep deprivation increases tau protein and beta-amyloid levels associated with cognitive decline." },
      { emoji: "📱", point: "Blue light exposure before bedtime reduced melatonin production by 50% and decreased REM sleep by 20%." }
    ],
    keywords: ["Sleep quality", "Cognitive function", "Memory consolidation", "Circadian rhythm", "Neuroplasticity"],
    study_metadata: {
      studyType: "Longitudinal cohort study",
      cohortSize: 783,
      notes: ["5-year follow-up period", "Comprehensive cognitive testing battery", "Sleep monitored through polysomnography"]
    }
  };
} 