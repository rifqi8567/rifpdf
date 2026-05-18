-- ============================================
-- Supabase RPC for pgvector Similarity Search
-- Run this in the Supabase SQL Editor
-- ============================================

-- Enable the pgvector extension first!
CREATE EXTENSION IF NOT EXISTS vector;

CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding VECTOR(768), -- Change 768 to your embedding model dimension (e.g., nomic-embed-text is 768)
  match_threshold FLOAT,
  match_count INT,
  filter_document_id UUID
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.id,
    document_chunks.content,
    document_chunks.metadata,
    1 - (document_chunks.embedding <=> query_embedding) AS similarity
  FROM document_chunks
  WHERE document_chunks.document_id = filter_document_id
    AND 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
