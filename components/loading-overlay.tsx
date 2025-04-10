import { Badge } from "@/components/ui/badge";
import { LucideCheckCircle, LucideLoader2 } from "lucide-react";

export interface LoadingOverlayProps {
  currentStep: string;
  keywords?: string[];
}

const STEPS = [
  { id: 'retrievingContent', label: 'Retrieving article content' },
  { id: 'generatingSummary', label: 'Generating summary' },
  { id: 'extractingKeywords', label: 'Extracting keywords' },
  { id: 'searchingSimilarArticles', label: 'Searching for similar articles' },
  { id: 'assessingResearch', label: 'Assessing research quality' },
];

export function LoadingOverlay({ currentStep, keywords = [] }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-xl">
        <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
          Analyzing Article
        </h3>
        
        <div className="space-y-4 mb-6">
          {STEPS.map((step) => {
            const isCompleted = STEPS.findIndex(s => s.id === currentStep) > STEPS.findIndex(s => s.id === step.id);
            const isCurrent = step.id === currentStep;
            
            return (
              <div 
                key={step.id} 
                className={`flex items-center p-3 rounded-md ${
                  isCompleted ? 'bg-green-50' : isCurrent ? 'bg-blue-50' : 'bg-gray-50'
                }`}
              >
                {isCompleted ? (
                  <LucideCheckCircle className="h-5 w-5 text-green-600 mr-3 flex-shrink-0" />
                ) : isCurrent ? (
                  <LucideLoader2 className="h-5 w-5 text-blue-600 mr-3 animate-spin flex-shrink-0" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300 mr-3 flex-shrink-0" />
                )}
                <span className={`text-sm ${
                  isCompleted ? 'text-green-700' : isCurrent ? 'text-blue-700' : 'text-gray-500'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
        
        {keywords && keywords.length > 0 && currentStep !== 'retrievingContent' && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-600 mb-2">Keywords identified:</h4>
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword, idx) => (
                <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 