import fs from 'fs';
import path from 'path';

// Configure where to store trace logs
const TRACE_LOG_DIR = process.env.TRACE_LOG_DIR || './logs/ai-traces';

// Create trace directory if it doesn't exist
try {
  if (!fs.existsSync(TRACE_LOG_DIR)) {
    fs.mkdirSync(TRACE_LOG_DIR, { recursive: true });
    console.log(`Created trace log directory: ${TRACE_LOG_DIR}`);
  }
} catch (error) {
  console.error(`Error creating trace directory: ${error}`);
}

// Interface for AI call details to track
interface AICallDetails {
  name: string;
  model: string;
  messages?: Array<{role: string; content: string}>;
  prompt?: string;
  temperature?: number;
  maxTokens?: number;
  extraParams?: Record<string, any>;
}

// Utility function to log AI calls before and after execution
export const traceAICall = async <T>(
  details: AICallDetails,
  callFn: () => Promise<T>
): Promise<T> => {
  const startTime = performance.now();
  const timestamp = new Date().toISOString();
  const callId = Date.now().toString(36) + Math.random().toString(36).substring(2);
  
  // Extract sensitive data to not log API keys
  const safeDetails = {
    ...details,
    // Truncate message content to avoid huge logs
    messages: details.messages?.map(msg => ({
      ...msg,
      content: msg.content ? `${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}` : ''
    })),
    // Truncate prompt to avoid huge logs
    prompt: details.prompt ? 
      `${details.prompt.substring(0, 100)}${details.prompt.length > 100 ? '...' : ''}` : undefined
  };
  
  console.log(`[AI Call ${callId}] Starting: ${details.name} with model ${details.model} at ${timestamp}`);
  
  try {
    // Save pre-call trace with request details
    if (process.env.ENABLE_AI_TRACING === 'true') {
      const preCallData = {
        id: callId,
        type: 'ai_call_request',
        timestamp,
        details: safeDetails
      };
      
      const preCallPath = path.join(
        TRACE_LOG_DIR, 
        `req-${timestamp.replace(/[:.]/g, '-')}-${details.name}-${callId}.json`
      );
      
      fs.writeFileSync(preCallPath, JSON.stringify(preCallData, null, 2));
    }
    
    // Execute the actual API call
    const result = await callFn();
    const duration = performance.now() - startTime;
    
    // Log successful call details
    console.log(`[AI Call ${callId}] Completed: ${details.name} in ${duration.toFixed(2)}ms`);
    
    // Save successful response trace
    if (process.env.ENABLE_AI_TRACING === 'true') {
      const traceData = {
        id: callId,
        type: 'ai_call_response',
        timestamp: new Date().toISOString(),
        duration,
        details: safeDetails,
        success: true,
        // Don't log full result as it could be very large
        resultSummary: typeof result === 'object' ? 
          `Object returned (${typeof result === 'object' && result !== null ? Object.keys(result).join(', ') : 'null'})` : 
          `Result of type ${typeof result}`
      };
      
      const traceLogPath = path.join(
        TRACE_LOG_DIR, 
        `res-${timestamp.replace(/[:.]/g, '-')}-${details.name}-${callId}.json`
      );
      
      fs.writeFileSync(traceLogPath, JSON.stringify(traceData, null, 2));
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    // Log error details
    console.error(`[AI Call ${callId}] Error: ${details.name} failed after ${duration.toFixed(2)}ms`, error);
    
    // Save error trace
    if (process.env.ENABLE_AI_TRACING === 'true') {
      const traceData = {
        id: callId,
        type: 'ai_call_error',
        timestamp: new Date().toISOString(),
        duration,
        details: safeDetails,
        success: false,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : String(error)
      };
      
      const traceLogPath = path.join(
        TRACE_LOG_DIR, 
        `err-${timestamp.replace(/[:.]/g, '-')}-${details.name}-${callId}.json`
      );
      
      fs.writeFileSync(traceLogPath, JSON.stringify(traceData, null, 2));
    }
    
    throw error;
  }
}; 