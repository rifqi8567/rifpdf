import { supabase } from '@/lib/supabase';
import type { AIModel } from '@/types';

interface ChatRequest {
  messages: { role: string; content: string }[];
  model?: AIModel;
  documentContext?: string;
}



/**
 * Send chat message to VPS Backend and stream response.
 */
export async function streamChatMessage(
  request: ChatRequest,
  onChunk: (chunk: string) => void
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const vpsUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const response = await fetch(`${vpsUrl}/api/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
    },
    body: JSON.stringify({
      documentId: request.documentContext, // Mapping to your backend
      messages: request.messages,
      model: request.model || 'google/gemini-2.0-flash-exp',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get AI response');
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder('utf-8');

  if (!reader) return;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    // OpenRouter SSE format returns "data: {...}" strings.
    const chunkString = decoder.decode(value, { stream: true });
    
    // Parse SSE lines
    const lines = chunkString.split('\n').filter(line => line.trim() !== '');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;
        
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || '';
          if (content) {
            onChunk(content);
          }
        } catch (e) {
          console.warn('Error parsing JSON from SSE', e);
        }
      }
    }
  }
}

/**
 * Upload a PDF document to Supabase Storage.
 * Files are stored under the user's UUID folder for RLS isolation.
 */
export async function uploadDocument(file: File): Promise<{ url: string; path: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `${user.id}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('documents')
    .getPublicUrl(filePath);

  return { url: urlData.publicUrl, path: filePath };
}

/**
 * Save document metadata to the database.
 */
export async function saveDocumentMetadata(doc: {
  name: string;
  file_url: string;
  file_size: number;
  page_count: number;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('documents')
    .insert({
      user_id: user.id,
      name: doc.name,
      file_url: doc.file_url,
      file_size: doc.file_size,
      page_count: doc.page_count,
      status: 'ready',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get user's documents.
 */
export async function getUserDocuments() {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Delete a document and its file.
 */
export async function deleteDocument(id: string, filePath: string) {
  await supabase.storage.from('documents').remove([filePath]);

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
