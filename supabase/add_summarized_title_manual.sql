-- Run this SQL query manually in the Supabase dashboard SQL editor

-- Add summarized_title column to article_summaries table if it doesn't exist
ALTER TABLE article_summaries ADD COLUMN IF NOT EXISTS summarized_title TEXT;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'article_summaries' 
ORDER BY ordinal_position; 