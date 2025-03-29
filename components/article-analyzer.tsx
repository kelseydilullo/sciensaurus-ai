"use client";

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useChat } from 'ai/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface ArticleAnalyzerProps {
  initialUrl?: string;
}

export function ArticleAnalyzer({ initialUrl = '' }: ArticleAnalyzerProps) {
  const [url, setUrl] = useState(initialUrl);
  const [submittedUrl, setSubmittedUrl] = useState('');

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/analyze-article',
    id: submittedUrl || 'article-analyzer',
    body: {
      url: submittedUrl,
    },
  });

  // Log when the component mounts and when key states change
  useEffect(() => {
    console.log('ArticleAnalyzer mounted');
    
    return () => {
      console.log('ArticleAnalyzer unmounted');
    };
  }, []);

  // Update URL input when initialUrl prop changes
  useEffect(() => {
    if (initialUrl && initialUrl !== url) {
      console.log('Setting URL from initialUrl prop:', initialUrl);
      setUrl(initialUrl);
    }
  }, [initialUrl, url]);

  // Auto-submit when initialUrl is provided and no analysis is in progress
  useEffect(() => {
    if (initialUrl && !submittedUrl && !isLoading) {
      console.log('Auto-submitting initialUrl:', initialUrl);
      setSubmittedUrl(initialUrl);
    }
  }, [initialUrl, submittedUrl, isLoading]);

  useEffect(() => {
    if (submittedUrl) {
      console.log('Submitted URL changed:', submittedUrl);
    }
  }, [submittedUrl]);

  useEffect(() => {
    if (messages.length > 0) {
      console.log('Messages received:', messages.length);
    }
  }, [messages]);

  const handleUrlSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Submitting URL for analysis:', url);
    
    if (!url.trim()) {
      console.error('URL is empty');
      return;
    }

    // Set the submitted URL which will trigger the API call via useChat
    setSubmittedUrl(url);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 flex flex-col gap-4">
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <CardTitle>Scientific Article Analyzer</CardTitle>
          <CardDescription>Enter the URL of a scientific article to get an analysis</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleUrlSubmit} className="flex w-full items-center space-x-2">
            <Input
              type="url"
              placeholder="https://pubmed.ncbi.nlm.nih.gov/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 border-gray-300 focus:border-[#1e3a6d] focus:ring-[#1e3a6d]"
              required
            />
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-[#1e3a6d] hover:bg-[#0f2a4d] text-white"
            >
              {isLoading ? 'Analyzing...' : 'Analyze'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {submittedUrl && messages.length === 0 && (
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <p className="text-sm text-gray-500">Analyzing article, please wait...</p>
              <div className="h-4 w-full bg-gray-200 animate-pulse rounded"></div>
              <div className="h-4 w-full bg-gray-200 animate-pulse rounded"></div>
              <div className="h-4 w-4/5 bg-gray-200 animate-pulse rounded"></div>
            </div>
          </CardContent>
        </Card>
      )}

      {messages.length > 0 && (
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gray-50 border-b border-gray-200">
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>
              <span className="font-medium">Article:</span> {submittedUrl}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[500px] overflow-y-auto pr-4">
              <div className="whitespace-pre-wrap">
                {messages
                  .filter((m) => m.role === 'assistant')
                  .map((m, index) => (
                    <div key={index} className="mb-4">
                      {m.content}
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 