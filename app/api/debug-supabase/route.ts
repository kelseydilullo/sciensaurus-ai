import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('Debug Supabase endpoint called');
    
    // Create admin client
    const adminClient = createAdminClient();
    
    if (!adminClient) {
      return NextResponse.json(
        { error: 'Failed to create admin client' },
        { status: 500 }
      );
    }
    
    // Test basic connection first
    const { data: pingData, error: pingError } = await adminClient
      .from('users')
      .select('count')
      .limit(1);
    
    if (pingError) {
      console.error('Basic connection test failed:', pingError);
      return NextResponse.json(
        { error: 'Database connection failed', details: pingError.message },
        { status: 500 }
      );
    }
    
    // Check if article_summaries table exists and get its structure
    const { data: tableInfo, error: tableError } = await adminClient
      .from('article_summaries')
      .select('*')
      .limit(1);
      
    let articleSummariesExists = true;
    let tableStructure = null;
    
    if (tableError) {
      console.error('Error querying article_summaries table:', tableError);
      articleSummariesExists = false;
    } else {
      // Instead of using RPC, infer structure from sample data
      if (tableInfo && tableInfo.length > 0) {
        tableStructure = Object.keys(tableInfo[0]).map(key => ({
          column_name: key,
          inferred_type: typeof tableInfo[0][key],
          sample_value: JSON.stringify(tableInfo[0][key]).substring(0, 50)
        }));
      } else {
        // If no samples available, just create a dummy record and check structure
        const testRecord = {
          url: 'https://test-schema-url-' + Date.now() + '.com',
          title: 'Test Schema Title',
          source: 'Debug Test',
          publish_date: new Date().toISOString(),
          summary: 'This is a test summary for debugging',
          keywords: ['test', 'debug'],
          visual_summary: [{ emoji: '📊', point: 'Test point' }],
          study_metadata: { type: 'Test study' },
          related_research: { supporting: [], contradictory: [] }
        };
        
        // Try inserting a record to get structure information
        const { data: schemaData, error: schemaError } = await adminClient
          .from('article_summaries')
          .insert(testRecord)
          .select()
          .single();
          
        if (schemaError) {
          console.error('Failed to create schema test record:', schemaError);
          // Try to be graceful about failure
        } else if (schemaData) {
          tableStructure = Object.keys(schemaData).map(key => ({
            column_name: key,
            inferred_type: typeof schemaData[key],
            sample_value: schemaData[key] ? JSON.stringify(schemaData[key]).substring(0, 50) : null
          }));
          
          // Clean up test record
          await adminClient
            .from('article_summaries')
            .delete()
            .eq('id', schemaData.id);
        }
      }
    }
    
    // Make a simple test insertion
    const testData = {
      url: 'https://test-debug-url-' + Date.now() + '.com',
      title: 'Test Debug Title'
    };
    
    const { data: insertData, error: insertError } = await adminClient
      .from('article_summaries')
      .insert(testData)
      .select()
      .single();
      
    let insertSuccess = false;
    let insertedId = null;
    
    if (insertError) {
      console.error('Error inserting simple test data:', insertError);
    } else {
      insertSuccess = true;
      insertedId = insertData?.id;
      
      // Clean up test data
      if (insertedId) {
        const { error: deleteError } = await adminClient
          .from('article_summaries')
          .delete()
          .eq('id', insertedId);
          
        if (deleteError) {
          console.error('Error deleting test data:', deleteError);
        }
      }
    }
    
    // Make a more complex test insertion
    const complexTestData = {
      url: 'https://complex-test-' + Date.now() + '.com',
      title: 'Complex Test Title',
      source: 'Debug Test',
      publish_date: new Date().toISOString(),
      summary: 'This is a complex test summary for debugging',
      keywords: ['test', 'debug', 'complex'],
      visual_summary: [
        { emoji: '🔍', point: 'First test point' },
        { emoji: '📊', point: 'Second test point' }
      ],
      study_metadata: { 
        type: 'Test study',
        duration: '10 weeks',
        participants: 100
      },
      related_research: { 
        supporting: [{ title: 'Test supporting article', url: 'https://example.com' }],
        contradictory: []
      }
    };
    
    const { data: complexInsertData, error: complexInsertError } = await adminClient
      .from('article_summaries')
      .insert(complexTestData)
      .select()
      .single();
      
    let complexInsertSuccess = false;
    let complexInsertedId = null;
    let complexErrorDetails = null;
    
    if (complexInsertError) {
      console.error('Error inserting complex test data:', complexInsertError);
      complexErrorDetails = {
        code: complexInsertError.code,
        message: complexInsertError.message,
        details: complexInsertError.details,
        hint: complexInsertError.hint
      };
    } else {
      complexInsertSuccess = true;
      complexInsertedId = complexInsertData?.id;
      
      // Clean up complex test data
      if (complexInsertedId) {
        await adminClient
          .from('article_summaries')
          .delete()
          .eq('id', complexInsertedId);
      }
    }
    
    // Check environment variables
    const envVars = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
        process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 15) + '...' : null
    };
    
    return NextResponse.json({
      success: true,
      connection: {
        status: 'connected'
      },
      tables: {
        article_summaries: {
          exists: articleSummariesExists,
          structure: tableStructure
        }
      },
      test_insertion: {
        simple: {
          success: insertSuccess,
          id: insertedId
        },
        complex: {
          success: complexInsertSuccess,
          id: complexInsertedId,
          error: complexErrorDetails
        }
      },
      environment: envVars
    });
  } catch (error) {
    console.error('Error in debug-supabase API:', error);
    return NextResponse.json(
      { 
        error: 'Debug operation failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null
      },
      { status: 500 }
    );
  }
} 