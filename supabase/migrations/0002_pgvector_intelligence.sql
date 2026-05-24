-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to tasks
ALTER TABLE tasks ADD COLUMN embedding vector(1536);

-- Create a function for semantic search
CREATE OR REPLACE FUNCTION match_tasks (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  user_id_param uuid
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tasks.id,
    tasks.title,
    tasks.description,
    1 - (tasks.embedding <=> query_embedding) AS similarity
  FROM tasks
  WHERE tasks.user_id = user_id_param
    AND tasks.deleted_at IS NULL
    AND 1 - (tasks.embedding <=> query_embedding) > match_threshold
  ORDER BY tasks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
