import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Paperclip,
  Bot,
  User,
  Sparkles,
  Copy,
  ThumbsUp,
  RotateCcw,
  FileText,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AI_MODELS } from '@/lib/ai-router';
import type { AIModel, PDFDocument } from '@/types';
import { streamChatMessage, summarizeDocument } from '@/services/api';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { debugAction, debugError } from '@/lib/debug';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  timestamp: Date;
}

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Halo! 👋 Saya DocuMind AI. Upload dokumen PDF dan saya akan membantu Anda memahami, menganalisis, dan meringkas isinya. Apa yang bisa saya bantu hari ini?',
    model: 'Ollama VPS',
    timestamp: new Date(),
  },
];

const suggestedQuestions = [
  'Ringkas dokumen ini dalam 5 poin utama',
  'Apa topik utama yang dibahas?',
  'Buatkan analisis SWOT dari dokumen ini',
  'Terjemahkan bagian penting ke Bahasa Inggris',
];

export default function ChatPage() {
  const [searchParams] = useSearchParams();
  const documentId = searchParams.get('doc');
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>('ollama/auto');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [activeDocument, setActiveDocument] = useState<PDFDocument | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!documentId) {
        debugAction('chat', 'document context cleared');
        setActiveDocument(null);
        return;
      }

      debugAction('chat', 'document fetch start', { documentId });
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error) {
        debugError('chat', 'document fetch failed', error, { documentId });
        toast.error('Dokumen chat tidak ditemukan.');
        setActiveDocument(null);
        return;
      }

      debugAction('chat', 'document fetch success', {
        documentId,
        fileName: data?.name,
      });
      setActiveDocument(data as PDFDocument);
    };

    fetchDocument();
  }, [documentId]);

  const appendAssistantMessage = (content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content,
        model: AI_MODELS[selectedModel].name,
        timestamp: new Date(),
      },
    ]);
  };

  const handleSummarize = async () => {
    if (!documentId) {
      debugAction('chat', 'summarize blocked', { reason: 'missing_document' }, 'warn');
      toast.warning('Buka chat dari salah satu dokumen terlebih dahulu.');
      return;
    }

    setIsSummarizing(true);
    debugAction('chat', 'summarize start', { documentId, selectedModel });
    try {
      const summary = await summarizeDocument(documentId, selectedModel);
      appendAssistantMessage(summary);
      debugAction('chat', 'summarize success', {
        documentId,
        selectedModel,
        summaryLength: summary.length,
      });
    } catch (error: any) {
      debugError('chat', 'summarize failed', error, { documentId, selectedModel });
      toast.error(error.message || 'Gagal membuat ringkasan dokumen.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSend = async () => {
    if (isTyping) {
      debugAction('chat', 'send blocked', { reason: 'request_in_progress' }, 'warn');
      toast.warning('Tunggu jawaban AI selesai dulu.');
      return;
    }
    if (!input.trim()) {
      debugAction('chat', 'send blocked', { reason: 'empty_input' }, 'warn');
      return;
    }
    if (!documentId) {
      debugAction('chat', 'send blocked', { reason: 'missing_document' }, 'warn');
      toast.warning('Pilih dokumen dari halaman Dokumen Saya untuk memulai chat RAG.');
      return;
    }

    const userContent = input.trim();
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const aiMsgId = crypto.randomUUID();
    const aiMsg: Message = {
      id: aiMsgId,
      role: 'assistant',
      content: '', // Start empty
      model: AI_MODELS[selectedModel].name,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, aiMsg]);
    debugAction('chat', 'send start', {
      documentId,
      selectedModel,
      messageLength: userContent.length,
    });

    try {
      // Map existing UI messages to the API format
      const apiMessages = messages
        .filter(m => m.content.trim().length > 0)
        .map(m => ({ role: m.role, content: m.content }));
      apiMessages.push({ role: 'user', content: userContent }); // Add the new one

      let receivedContent = false;
      await streamChatMessage(
        {
          messages: apiMessages,
          model: selectedModel,
          documentContext: documentId,
        },
        (chunk) => {
          receivedContent = true;
          setMessages((prev) => 
            prev.map(msg => 
              msg.id === aiMsgId ? { ...msg, content: msg.content + chunk } : msg
            )
          );
        }
      );
      if (!receivedContent) {
        setMessages((prev) => 
          prev.map(msg => 
            msg.id === aiMsgId ? { ...msg, content: 'AI belum mengirim isi jawaban. Coba kirim ulang atau pilih OpenRouter Free.' } : msg
          )
        );
      }
      debugAction('chat', 'send success', { documentId, selectedModel });
    } catch (error: any) {
      console.error('Chat error:', error);
      debugError('chat', 'send failed', error, { documentId, selectedModel });
      setMessages((prev) => 
        prev.map(msg => 
          msg.id === aiMsgId ? { ...msg, content: error.message || 'Maaf, terjadi kesalahan saat menghubungi server.' } : msg
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* Chat header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-background/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-bg">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">AI Chat PDF</h2>
            <p className="text-xs text-muted-foreground">
              {activeDocument ? activeDocument.name : 'Buka dari Dokumen Saya untuk memilih konteks'}
            </p>
          </div>
        </div>

        {/* Model Picker */}
        <div className="relative flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSummarize}
            disabled={!documentId || isSummarizing || isTyping}
            className="gap-2"
          >
            {isSummarizing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            <span className="hidden sm:inline">Ringkas</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowModelPicker(!showModelPicker)}
            className="gap-2"
          >
            <span className="text-base">{AI_MODELS[selectedModel].icon}</span>
            <span className="hidden sm:inline">{AI_MODELS[selectedModel].name}</span>
            <ChevronDown className="h-3 w-3" />
          </Button>

          <AnimatePresence>
            {showModelPicker && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-popover p-2 shadow-dialog z-50"
              >
                {Object.values(AI_MODELS).map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      if (isTyping) return;
                      setSelectedModel(model.id);
                      setShowModelPicker(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                      selectedModel === model.id
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-secondary'
                    )}
                  >
                    <span className="text-lg">{model.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{model.name}</p>
                      <p className="text-[11px] text-muted-foreground">{model.description}</p>
                    </div>
                    <Badge variant="secondary" className="text-[9px]">{model.speed}</Badge>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : '')}
            >
              {msg.role === 'assistant' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full gradient-bg">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}

              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-3',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-surface-2 border border-border rounded-bl-md'
                )}
              >
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>

                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/50">
                    {msg.model && (
                      <Badge variant="secondary" className="text-[9px]">{msg.model}</Badge>
                    )}
                    <div className="flex-1" />
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                      <Copy className="h-3 w-3" />
                    </button>
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                      <ThumbsUp className="h-3 w-3" />
                    </button>
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
                  <User className="h-4 w-4 text-primary" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full gradient-bg">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="rounded-2xl bg-surface-2 border border-border px-4 py-3 rounded-bl-md">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="h-2 w-2 rounded-full bg-primary/60"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                onClick={() => {
                  setInput(q);
                  inputRef.current?.focus();
                }}
                className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-border bg-background/80 backdrop-blur-sm p-4">
        <div className="mx-auto max-w-4xl">
          {!documentId && (
            <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              Pilih dokumen dari halaman Dokumen Saya agar AI memakai konteks PDF yang benar.
            </div>
          )}
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface-2 p-2 focus-within:border-primary/50 transition-colors">
            <Button variant="ghost" size="icon-sm" className="shrink-0 mb-0.5">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" className="shrink-0 mb-0.5">
              <FileText className="h-4 w-4" />
            </Button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tanya apa saja tentang PDF Anda..."
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground max-h-32 py-2"
              style={{ minHeight: '36px' }}
            />
            <Button
              variant="gradient"
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isTyping || !documentId}
              className="shrink-0 rounded-xl"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            DocuMind AI dapat membuat kesalahan. Periksa informasi penting.
          </p>
        </div>
      </div>
    </div>
  );
}
