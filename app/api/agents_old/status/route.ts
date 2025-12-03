import { NextResponse } from 'next/server';

const AGENT_STATUS_BASE_URL =
  process.env.NEXT_PUBLIC_AGENT_STATUS_URL_DEV ||
  'https://developmentamd.voiceadmins.com/api/agents';

export const revalidate = 0;

/**
 * POST endpoint to check if an AI agent is active/running
 * Expects JSON: { agent_id: "uuid" }
 */
export async function POST(req: Request) {
  try {
    const { agent_id } = (await req.json()) as { agent_id?: string };

    if (!agent_id) {
      return NextResponse.json(
        { success: false, message: 'Missing agent_id in request body' },
        { status: 400 }
      );
    }

    const url = `${AGENT_STATUS_BASE_URL}/${agent_id}/status`;
    console.log(`🔍 Checking agent status: ${url}`);

    const res = await fetch(url, { method: 'GET' });
    const text = await res.text();
    console.log('⬅️ Agent status raw response:', text);

    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    // ✅ Handle common "not found" response
    const detail = typeof data?.detail === 'string' ? data.detail.toLowerCase() : '';
    if (res.status === 404 || detail.includes('not found')) {
      console.warn(`⚠️ Agent ${agent_id} not found`);
      return NextResponse.json(
        { success: false, available: false, message: 'Agent not found or offline' },
        { status: 404 }
      );
    }

    // ✅ Handle success
    if (res.ok) {
      const isRunning =
        data?.status === 'running' || data?.is_active === true || data?.state === 'active';

      return NextResponse.json({
        success: true,
        available: isRunning,
        status: (data?.status as string) || 'unknown',
        data,
      });
    }

    // ❌ Other backend error
    return NextResponse.json(
      {
        success: false,
        available: false,
        message: `Agent status API failed (${res.status})`,
        details: data,
      },
      { status: res.status }
    );
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('🚨 Error in /api/agents/status:', error);
    return NextResponse.json(
      {
        success: false,
        available: false,
        message: error.message || 'Internal error while checking agent status',
      },
      { status: 500 }
    );
  }
}
