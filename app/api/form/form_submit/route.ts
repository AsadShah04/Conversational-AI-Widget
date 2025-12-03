// import { NextResponse } from 'next/server';
// interface LeadResponse {
//   message?: string;
//   [key: string]: unknown;
// }
// export async function POST(request: Request) {
//   try {
//     const body = await request.json();
//     const { full_name, email, phone, agent_id } = body;
//     if (!full_name || !email || !phone || !agent_id) {
//       return NextResponse.json(
//         { success: false, message: 'Missing required fields' },
//         { status: 400 }
//       );
//     }
//     // ✅ Read target URL from environment
//     const targetUrl = process.env.NEXT_PUBLIC_FORM_LEAD_URL_DEV;
//     if (!targetUrl) {
//       throw new Error('Form submission URL not configured');
//     }
//     // ✅ Prepare payload as per API schema
//     const payload = {
//       agent_id,
//       full_name,
//       email,
//       phone,
//       metadata: {}, // optional extra info
//     };
//     // ✅ Send to external API
//     const res = await fetch(targetUrl, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(payload),
//     });
//     // ✅ Handle non-JSON or malformed responses safely
//     const text = await res.text();
//     let data: LeadResponse;
//     try {
//       data = JSON.parse(text) as LeadResponse;
//     } catch {
//       console.warn('⚠️ Non-JSON response from API:', text);
//       data = { raw: text };
//     }
//     if (!res.ok) {
//       throw new Error(data?.message || 'Failed to send form data');
//     }
//     return NextResponse.json({
//       success: true,
//       message: 'Form submitted successfully',
//       data,
//     });
//   } catch (error) {
//     console.error('❌ Form submit error:', error);
//     return NextResponse.json(
//       {
//         success: false,
//         message: error instanceof Error ? error.message : 'Form submission failed',
//       },
//       { status: 500 }
//     );
//   }
// }
import { NextResponse } from 'next/server';

interface LeadResponse {
  message?: string;
  [key: string]: unknown;
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const domainName = url.searchParams.get('domainName') || '';

    const body = await request.json();
    const { full_name, email, phone, agent_id } = body;

    if (!full_name || !email || !phone || !agent_id) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // ✅ Dynamic selection (ONLY change)
    let targetUrl;
    if (domainName.includes('onboardsoft-live')) {
      targetUrl = process.env.NEXT_PUBLIC_FORM_LEAD_URL_LIVE;
      console.log('🔧 Using Form Live LiveKit environment');
    } else if (domainName.includes('convoso')) {
      targetUrl = process.env.NEXT_PUBLIC_FORM_LEAD_URL_CONVOSO;
      console.log('🔧 Using Form Convoso LiveKit environment');
    } else if (domainName.includes('onboardsoft-dev')) {
      targetUrl = process.env.NEXT_PUBLIC_FORM_LEAD_URL_DEV;
      console.log('🔧 Using Form DEV LiveKit environment');
    } else {
      targetUrl = process.env.NEXT_PUBLIC_FORM_LEAD_URL_LIVE;
      console.log('🔧 Using Default Form LIVE LiveKit environment');
    }

    if (!targetUrl) {
      throw new Error('Form submission URL not configured');
    }

    // ✅ Prepare payload as per API schema
    const payload = {
      agent_id,
      full_name,
      email,
      phone,
      metadata: {}, // optional extra info
    };

    // ✅ Send to external API
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // ✅ Handle non-JSON or malformed responses safely
    const text = await res.text();
    let data: LeadResponse;
    try {
      data = JSON.parse(text) as LeadResponse;
    } catch {
      console.warn('⚠️ Non-JSON response from API:', text);
      data = { raw: text };
    }

    if (!res.ok) {
      throw new Error(data?.message || 'Failed to send form data');
    }

    return NextResponse.json({
      success: true,
      message: 'Form submitted successfully',
      data,
    });
  } catch (error) {
    console.error('❌ Form submit error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Form submission failed',
      },
      { status: 500 }
    );
  }
}
