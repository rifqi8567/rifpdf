// ============================================
// DocuMind AI — Edge Function: AI Chat
// Deploy: supabase functions deploy ai-chat
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting (simple in-memory, use Redis in production)
const rateLimit = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimit.get(userId)
  
  if (!entry || now > entry.resetAt) {
    rateLimit.set(userId, { count: 1, resetAt: now + 60000 }) // 1 minute window
    return true
  }
  
  if (entry.count >= 20) { // 20 requests per minute
    return false
  }
  
  entry.count++
  return true
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Get user from JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rate limit check
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request
    const { messages, model, documentContext } = await req.json()

    // Input validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sanitize messages
    const sanitizedMessages = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system' ? msg.role : 'user',
      content: typeof msg.content === 'string' ? msg.content.substring(0, 10000) : '', // Max 10k chars
    }))

    // Build system prompt with document context
    const systemMessage = {
      role: 'system',
      content: `You are DocuMind AI, a helpful PDF document analysis assistant. You help users understand, analyze, summarize, and extract information from PDF documents. Always respond in the same language as the user's message. Be concise, accurate, and helpful.${
        documentContext ? `\n\nDocument Context:\n${documentContext.substring(0, 50000)}` : ''
      }`,
    }

    // Call OpenRouter API
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://documind.ai',
        'X-Title': 'DocuMind AI',
      },
      body: JSON.stringify({
        model: model || 'google/gemini-2.0-flash-exp',
        messages: [systemMessage, ...sanitizedMessages],
        max_tokens: 4096,
        temperature: 0.7,
      }),
    })

    if (!aiResponse.ok) {
      const errorData = await aiResponse.text()
      console.error('OpenRouter error:', errorData)
      return new Response(
        JSON.stringify({ error: 'AI service temporarily unavailable' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const aiData = await aiResponse.json()
    const assistantMessage = aiData.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.'
    const tokensUsed = aiData.usage?.total_tokens || 0

    // Log usage for analytics only. This no longer deducts credits.
    await supabase.from('usage_logs').insert({
      user_id: user.id,
      action_type: 'chat',
      credits_used: 0,
      metadata: { model: model || 'google/gemini-2.0-flash-exp', tokens: tokensUsed, free_access: true },
    })

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        model: model || 'google/gemini-2.0-flash-exp',
        tokens_used: tokensUsed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
