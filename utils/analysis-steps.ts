// Define the steps for article analysis
export type AnalysisStep = 
  | 'retrievingContent'
  | 'generatingSummary'
  | 'extractingKeywords'
  | 'searchingSimilarArticles'
  | 'assessingResearch'
  | 'complete';

// Map each step to its numerical index
const STEP_INDICES: Record<AnalysisStep, number> = {
  'retrievingContent': 1,
  'generatingSummary': 2,
  'extractingKeywords': 3,
  'searchingSimilarArticles': 4,
  'assessingResearch': 5,
  'complete': 6
};

/**
 * Determines the numerical index of the current analysis step
 * @param currentStep The current step in the analysis process
 * @returns The numerical index of the step
 */
export function determineCurrentStep(currentStep: string): number {
  return STEP_INDICES[currentStep as AnalysisStep] || 1;
}

/**
 * Check if a step is completed based on the current step
 * @param step The step to check
 * @param currentStep The current step in the process
 * @returns Boolean indicating if the step is completed
 */
export function isStepCompleted(step: AnalysisStep, currentStep: AnalysisStep): boolean {
  return STEP_INDICES[step] < STEP_INDICES[currentStep];
}

/**
 * Check if a step is the current active step
 * @param step The step to check
 * @param currentStep The current step in the process
 * @returns Boolean indicating if the step is the current step
 */
export function isCurrentStep(step: AnalysisStep, currentStep: AnalysisStep): boolean {
  return step === currentStep;
}

/**
 * Get the descriptive label for a step
 * @param step The analysis step
 * @returns A user-friendly label for the step
 */
export function getStepLabel(step: AnalysisStep): string {
  switch (step) {
    case 'retrievingContent':
      return 'Retrieving article content';
    case 'generatingSummary':
      return 'Generating summary';
    case 'extractingKeywords':
      return 'Extracting keywords';
    case 'searchingSimilarArticles':
      return 'Searching for similar articles';
    case 'assessingResearch':
      return 'Assessing research quality';
    case 'complete':
      return 'Analysis complete';
    default:
      return 'Processing';
  }
} 