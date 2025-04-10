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

// Interface for trace event data
interface TraceEvent {
  eventName: string;
  timestamp: number;
  data?: Record<string, any>;
}

// Interface for trace completion data
interface TraceCompletion {
  success?: boolean;
  error?: string | Record<string, any>;
  duration: number;
  events: TraceEvent[];
}

/**
 * Simple trace utility for tracking API calls and operations
 */
class Tracer {
  private traces: Map<string, { 
    id: string;
    startTime: number;
    events: TraceEvent[];
  }> = new Map();
  
  /**
   * Start a new trace
   * @param name Name of the trace
   * @returns Trace object
   */
  startTrace(name: string) {
    const id = `${name}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const startTime = performance.now();
    
    this.traces.set(id, {
      id,
      startTime,
      events: [],
    });
    
    console.log(`[Trace ${id}] Started`);
    
    return {
      /**
       * Add an event to the trace
       * @param eventName Name of the event
       * @param data Additional data for the event
       */
      addEvent: (eventName: string, data?: Record<string, any>) => {
        const trace = this.traces.get(id);
        if (trace) {
          trace.events.push({
            eventName,
            timestamp: performance.now() - startTime,
            data,
          });
          console.log(`[Trace ${id}] Event: ${eventName}`);
        }
      },
      
      /**
       * End the trace and save the trace data
       * @param completion Completion data for the trace
       */
      end: (completion?: Partial<{ success: boolean; error: string | Record<string, any> }>) => {
        const trace = this.traces.get(id);
        if (trace) {
          const duration = performance.now() - trace.startTime;
          
          // Prepare trace data
          const traceData = {
            id,
            name,
            startTime: new Date(Date.now() - duration).toISOString(),
            endTime: new Date().toISOString(),
            duration,
            success: completion?.success ?? !completion?.error,
            error: completion?.error,
            events: trace.events,
          };
          
          // Log completion
          if (traceData.success) {
            console.log(`[Trace ${id}] Completed successfully in ${duration.toFixed(2)}ms`);
          } else {
            console.error(`[Trace ${id}] Failed in ${duration.toFixed(2)}ms`, traceData.error);
          }
          
          // Save trace data if tracing is enabled
          if (process.env.ENABLE_AI_TRACING === 'true') {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const traceFilename = `trace-${timestamp}-${name}-${id}.json`;
            const tracePath = path.join(TRACE_LOG_DIR, traceFilename);
            
            try {
              fs.writeFileSync(tracePath, JSON.stringify(traceData, null, 2));
            } catch (error) {
              console.error(`Error saving trace data: ${error}`);
            }
          }
          
          // Remove trace from map
          this.traces.delete(id);
        }
      }
    };
  }
}

// Export a singleton tracer instance
export const tracer = new Tracer(); 