import { supabase } from '@/lib/supabase';
import type { AIModel } from '@/types';
import { debugAction, debugError } from '@/lib/debug';

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
  debugAction('api', 'summarize request start', {
    documentId,
    model: model || 'ollama/auto',
    hasSession: Boolean(session?.access_token),
  });

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
    debugAction('api', 'summarize request failed', {
      documentId,
      status: response.status,
      payload,
    }, 'error');
    throw new Error(payload?.error || 'Failed to summarize document');
  }

  const payload = await response.json();
  debugAction('api', 'summarize request success', {
    documentId,
    summaryLength: String(payload.summary || '').length,
  });
  return payload.summary;
}

export async function analyzeOcrText(text: string, fileName: string, model?: AIModel): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  debugAction('api', 'ocr analyze request start', {
    fileName,
    textLength: text.length,
    model: model || 'ollama/auto',
    hasSession: Boolean(session?.access_token),
  });

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
    debugAction('api', 'ocr analyze request failed', {
      fileName,
      status: response.status,
      payload,
    }, 'error');
    throw new Error(payload?.error || payload?.details || `Gagal menganalisis OCR dengan AI (${response.status})`);
  }

  const payload = await response.json();
  debugAction('api', 'ocr analyze request success', {
    fileName,
    analysisLength: String(payload.analysis || '').length,
  });
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
  debugAction('api', 'chat stream request start', {
    messageCount: request.messages.length,
    model: request.model || 'ollama/auto',
    documentId: request.documentContext,
    hasSession: Boolean(session?.access_token),
  });

  if (!request.documentContext) {
    debugAction('api', 'chat stream blocked', { reason: 'missing_document' }, 'warn');
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
    debugAction('api', 'chat stream request failed', {
      status: response.status,
      payload,
      documentId: request.documentContext,
    }, 'error');
    throw new Error(payload?.error || payload?.details || `Gagal menghubungi AI server (${response.status})`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder('utf-8');

  if (!reader) {
    debugAction('api', 'chat stream missing reader', { documentId: request.documentContext }, 'warn');
    return;
  }

  let sseBuffer = '';
  let chunkCount = 0;
  let characterCount = 0;

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
            chunkCount += 1;
            characterCount += content.length;
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
        if (content) {
          chunkCount += 1;
          characterCount += content.length;
          onChunk(content);
        }
      } catch (e) {
        console.warn('Error parsing final JSON from SSE', e);
      }
    }
  }

  debugAction('api', 'chat stream completed', {
    documentId: request.documentContext,
    chunkCount,
    characterCount,
  });
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
  debugAction('api', 'document upload start', { userId: user.id, file, filePath });

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    debugError('api', 'document upload failed', uploadError, { userId: user.id, filePath });
    throw uploadError;
  }

  const { data: urlData } = supabase.storage
    .from('documents')
    .getPublicUrl(filePath);

  debugAction('api', 'document upload success', { userId: user.id, filePath });
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
  debugAction('api', 'document metadata save start', { userId: user.id, doc });

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

  if (error) {
    debugError('api', 'document metadata save failed', error, { userId: user.id, doc });
    throw error;
  }
  debugAction('api', 'document metadata save success', { userId: user.id, documentId: data.id });
  return data;
}

/**
 * Get user's documents.
 */
export async function getUserDocuments() {
  debugAction('api', 'documents list start');
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    debugError('api', 'documents list failed', error);
    throw error;
  }
  debugAction('api', 'documents list success', { count: data?.length ?? 0 });
  return data;
}

/**
 * Delete a document and its file.
 */
export async function deleteDocument(id: string, filePath: string) {
  debugAction('api', 'document delete start', { id, filePath });
  await supabase.storage.from('documents').remove([filePath]);

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id);

  if (error) {
    debugError('api', 'document delete failed', error, { id, filePath });
    throw error;
  }
  debugAction('api', 'document delete success', { id, filePath });
}

/**
 * Convert an Office document (.docx, .xlsx, .pptx) to PDF using the Python LibreOffice service.
 */
export async function convertOfficeToPdf(file: File): Promise<Blob> {
  const { data: { session } } = await supabase.auth.getSession();

  const formData = new FormData();
  formData.append('file', file);
  const requestId = crypto.randomUUID();

  const debugPayload = {
    requestId,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    hasSession: Boolean(session?.access_token),
    endpoint: buildApiUrl('/api/convert/office-to-pdf'),
  };
  debugAction('api', 'office conversion request start', debugPayload);

  const response = await fetch(buildApiUrl('/api/convert/office-to-pdf'), {
    method: 'POST',
    headers: {
      'X-Request-Id': requestId,
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
    },
    body: formData,
  });

  debugAction('api', 'office conversion response', {
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
    const htmlTitle = rawError.match(/<title>(.*?)<\/title>/i)?.[1]?.trim();
    const htmlHeading = rawError.match(/<h1>(.*?)<\/h1>/i)?.[1]?.trim();
    const gatewayHint = response.status === 502
      ? 'Gateway Nginx tidak bisa meneruskan request ke API backend. Cek container api dan nginx di VPS.'
      : '';
    const routeMissing =
      response.status === 404 &&
      (rawError.includes('Cannot POST') || response.headers.get('content-type')?.includes('text/html'));
    const routeHint = routeMissing
      ? 'Endpoint konversi tidak ditemukan di backend. Pastikan VITE_API_URL mengarah ke Nginx/API gateway tanpa :3000, lalu redeploy/restart backend terbaru.'
      : '';
    debugError('api', 'office conversion failed', new Error(payload?.error || detail || response.statusText), {
      ...debugPayload,
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      payload,
      detail,
      routeMissing,
      gatewayHint,
      rawError: rawError.slice(0, 2000),
    });
    throw new Error(
      payload?.error ||
      detail ||
      gatewayHint ||
      routeHint ||
      htmlHeading ||
      htmlTitle ||
      rawError.slice(0, 500) ||
      `Gagal mengonversi file Office ke PDF (${response.status})`
    );
  }

  const blob = await response.blob();
  debugAction('api', 'office conversion completed', {
    fileName: file.name,
    outputType: blob.type,
    outputSize: blob.size,
  });
  return blob;
}

export const convertWordToPdf = convertOfficeToPdf;
