-- Add raw_content column to article_summaries table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'article_summaries' 
        AND column_name = 'raw_content'
    ) THEN
        ALTER TABLE public.article_summaries 
        ADD COLUMN raw_content TEXT;
        
        RAISE NOTICE 'raw_content column added to article_summaries table';
    ELSE
        RAISE NOTICE 'raw_content column already exists in article_summaries table';
    END IF;
END $$; 