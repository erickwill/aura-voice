import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { validateApiToken, extractBearerToken } from '@/lib/auth';
import { checkUsageLimit, recordUsage } from '@/lib/billing/usage';
import { db, subscriptions } from '@/lib/db';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * POST /api/v1/chat
 * Proxy chat completions to OpenRouter with usage tracking
 */
export async function POST(request: NextRequest) {
  // Extract and validate token
  const authHeader = request.headers.get('authorization');
  const token = extractBearerToken(authHeader);

  if (!token) {
    return NextResponse.json(
      { error: 'missing_token', message: 'Authorization header with Bearer token is required' },
      { status: 401 }
    );
  }

  const user = await validateApiToken(token);
  if (!user) {
    return NextResponse.json(
      { error: 'invalid_token', message: 'Invalid or expired API token' },
      { status: 401 }
    );
  }

  // Check subscription status
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .limit(1);

  if (sub && sub.status !== 'active' && sub.status !== 'trialing') {
    return NextResponse.json(
      {
        error: 'subscription_inactive',
        message: 'Your subscription is not active. Please update your payment method.',
      },
      { status: 402 }
    );
  }

  // Check usage limits
  const usageLimit = await checkUsageLimit(user.id);
  if (!usageLimit.allowed) {
    return NextResponse.json(
      {
        error: 'usage_limit_exceeded',
        message: 'Monthly token limit exceeded. Please upgrade your plan.',
        usage: {
          used: usageLimit.used,
          limit: usageLimit.limit,
          periodEnd: usageLimit.periodEnd,
        },
      },
      { status: 402 }
    );
  }

  // Get OpenRouter API key
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey) {
    console.error('OPENROUTER_API_KEY not configured');
    return NextResponse.json(
      { error: 'server_error', message: 'API not configured' },
      { status: 500 }
    );
  }

  try {
    // Parse request body
    const body = await request.json();

    // Forward to OpenRouter
    const openRouterResponse = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://10x.dev',
        'X-Title': '10x CLI',
      },
      body: JSON.stringify(body),
    });

    // Handle non-streaming response
    if (!body.stream) {
      const data = await openRouterResponse.json();

      // Track usage from response
      if (data.usage) {
        const model = body.model || 'unknown';
        await recordUsage(
          user.id,
          model,
          data.usage.prompt_tokens || 0,
          data.usage.completion_tokens || 0,
          0 // Cost calculation would go here
        );
      }

      return NextResponse.json(data, {
        status: openRouterResponse.status,
      });
    }

    // Handle streaming response
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let inputTokens = 0;
    let outputTokens = 0;
    const model = body.model || 'unknown';

    const stream = new ReadableStream({
      async start(controller) {
        const reader = openRouterResponse.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Forward the chunk
            controller.enqueue(value);

            // Try to parse SSE data for usage tracking
            const text = decoder.decode(value, { stream: true });
            const lines = text.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  // Track tokens if available
                  if (parsed.usage) {
                    inputTokens = parsed.usage.prompt_tokens || inputTokens;
                    outputTokens = parsed.usage.completion_tokens || outputTokens;
                  }
                } catch {
                  // Ignore parse errors for partial chunks
                }
              }
            }
          }

          // Record usage after stream completes
          // Estimate tokens if not provided (rough estimate)
          if (outputTokens === 0) {
            // Rough estimate: 4 chars per token
            outputTokens = Math.ceil(decoder.decode().length / 4);
          }

          await recordUsage(user.id, model, inputTokens, outputTokens, 0);

          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      status: openRouterResponse.status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'proxy_error', message: 'Failed to forward request' },
      { status: 502 }
    );
  }
}

/**
 * GET /api/v1/chat
 * Return usage info for the authenticated user
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = extractBearerToken(authHeader);

  if (!token) {
    return NextResponse.json(
      { error: 'missing_token', message: 'Authorization header required' },
      { status: 401 }
    );
  }

  const user = await validateApiToken(token);
  if (!user) {
    return NextResponse.json(
      { error: 'invalid_token', message: 'Invalid or expired API token' },
      { status: 401 }
    );
  }

  const usageLimit = await checkUsageLimit(user.id);

  return NextResponse.json({
    user: {
      id: user.id,
    },
    usage: {
      tokensUsed: usageLimit.used,
      tokensLimit: usageLimit.limit,
      tokensRemaining: usageLimit.remaining,
      periodEnd: usageLimit.periodEnd,
    },
  });
}
