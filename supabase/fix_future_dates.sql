-- Fix any future dates and clearly incorrect dates in article_summaries table
DO $$
DECLARE
  current_date TIMESTAMP WITH TIME ZONE := NOW();
  affected_rows_future INTEGER := 0;
  affected_rows_past INTEGER := 0;
  affected_rows_total INTEGER := 0;
BEGIN
  -- Update any publish_date values that are in the future
  UPDATE public.article_summaries
  SET publish_date = current_date
  WHERE publish_date > current_date;
  
  -- Get the number of rows affected
  GET DIAGNOSTICS affected_rows_future = ROW_COUNT;
  
  -- Fix any dates that are clearly too far in the past (before 1900)
  -- Most scientific articles with digital identifiers are from 1900 or later
  UPDATE public.article_summaries
  SET publish_date = NULL
  WHERE publish_date < '1900-01-01';
  
  -- Get the number of rows affected
  GET DIAGNOSTICS affected_rows_past = ROW_COUNT;
  
  affected_rows_total := affected_rows_future + affected_rows_past;
  
  -- Log the result
  IF affected_rows_future > 0 THEN
    RAISE NOTICE 'Fixed % article(s) with future publish dates', affected_rows_future;
  ELSE
    RAISE NOTICE 'No articles with future publish dates found';
  END IF;
  
  IF affected_rows_past > 0 THEN
    RAISE NOTICE 'Fixed % article(s) with invalid past dates (before 1900)', affected_rows_past;
  ELSE
    RAISE NOTICE 'No articles with invalid past dates found';
  END IF;
  
  IF affected_rows_total > 0 THEN
    RAISE NOTICE 'Total fixed dates: %', affected_rows_total;
  ELSE
    RAISE NOTICE 'No date issues found';
  END IF;
END $$; 