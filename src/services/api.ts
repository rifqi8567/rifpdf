import { supabase } from '@/lib/supabase';
import type { AIModel } from '@/types';

interface ChatRequest {
  messages: { role: string; content: string }[];
  model?: AIModel;
  documentContext?: string;
}

const apiBaseUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!apiBaseUrl) {
    return normalizedPath;
  }

  if (apiBaseUrl.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return `${apiBaseUrl}${normalizedPath.slice(4)}`;
  }

  return `${apiBaseUrl}${normalizedPath}`;
}

export async function summarizeDocument(documentId: string, model?: AIModel): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(buildApiUrl(`/api/v1/documents/${documentId}/summary`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
    },
    body: JSON.stringify({
      model: model || 'ollama/auto',
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || 'Failed to summarize document');
  }

  const payload = await response.json();
  return payload.summary;
}

export async function analyzeOcrText(text: string, fileName: string, model?: AIModel): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(buildApiUrl('/api/v1/ocr/analyze'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
    },
    body: JSON.stringify({
      text,
      fileName,
      model: model || 'ollama/auto',
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || payload?.details || `Gagal menganalisis OCR dengan AI (${response.status})`);
  }

  const payload = await response.json();
  return payload.analysis;
}



/**
 * Send chat message to VPS Backend and stream response.
 */
export async function streamChatMessage(
  request: ChatRequest,
  onChunk: (chunk: string) => void
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!request.documentContext) {
    throw new Error('Pilih dokumen terlebih dahulu.');
  }

  const response = await fetch(buildApiUrl('/api/v1/chat/completions'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
    },
    body: JSON.stringify({
      documentId: request.documentContext, // Mapping to your backend
      messages: request.messages,
      model: request.model || 'ollama/auto',
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || payload?.details || `Gagal menghubungi AI server (${response.status})`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder('utf-8');

  if (!reader) return;

  let sseBuffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    sseBuffer += decoder.decode(value, { stream: true });
    const events = sseBuffer.split('\n\n');
    sseBuffer = events.pop() || '';
    
    for (const event of events) {
      const dataLines = event
        .split('\n')
        .filter((line) => line.startsWith('data: '))
        .map((line) => line.slice(6));

      for (const data of dataLines) {
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

  if (sseBuffer.trim().startsWith('data: ')) {
    const data = sseBuffer.trim().slice(6);
    if (data !== '[DONE]') {
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content || '';
        if (content) onChunk(content);
      } catch (e) {
        console.warn('Error parsing final JSON from SSE', e);
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

/**
 * Convert an Office document (.docx, .xlsx, .pptx) to PDF using the Python LibreOffice service.
 */
export async function convertOfficeToPdf(file: File): Promise<Blob> {
  const { data: { session } } = await supabase.auth.getSession();

  const formData = new FormData();
  formData.append('file', file);

  const debugPayload = {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    hasSession: Boolean(session?.access_token),
    endpoint: buildApiUrl('/api/convert/office-to-pdf'),
  };
  console.info('[office-conversion] request', debugPayload);

  const response = await fetch(buildApiUrl('/api/convert/office-to-pdf'), {
    method: 'POST',
    headers: {
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
    },
    body: formData,
  });

  console.info('[office-conversion] response', {
    status: response.status,
    statusText: response.statusText,
    contentType: response.headers.get('content-type'),
  });

  if (!response.ok) {
    const rawError = await response.text().catch(() => '');
    let payload: any = null;
    try {
      payload = rawError ? JSON.parse(rawError) : null;
    } catch {
      payload = null;
    }
    const detail = Array.isArray(payload?.detail)
      ? payload.detail.map((item: any) => item?.msg || JSON.stringify(item)).join(', ')
      : payload?.detail;
    console.error('[office-conversion] failed', {
      ...debugPayload,
      status: response.status,
      payload,
      detail,
      rawError: rawError.slice(0, 2000),
    });
    throw new Error(payload?.error || detail || rawError.slice(0, 500) || `Gagal mengonversi file Office ke PDF (${response.status})`);
  }

  const blob = await response.blob();
  console.info('[office-conversion] completed', {
    fileName: file.name,
    outputType: blob.type,
    outputSize: blob.size,
  });
  return blob;
}

export const convertWordToPdf = convertOfficeToPdf;
