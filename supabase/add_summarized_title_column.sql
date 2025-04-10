-- Add summarized_title column to article_summaries table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'article_summaries' 
        AND column_name = 'summarized_title'
    ) THEN
        ALTER TABLE public.article_summaries 
        ADD COLUMN summarized_title TEXT;
        
        RAISE NOTICE 'summarized_title column added to article_summaries table';
    ELSE
        RAISE NOTICE 'summarized_title column already exists in article_summaries table';
    END IF;
END $$; 