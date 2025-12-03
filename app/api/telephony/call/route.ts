// import { NextResponse } from 'next/server';
// const TELEPHONY_API_URL = process.env.NEXT_PUBLIC_TELEPHONY_URL_DEV;
// export const revalidate = 0;
// export async function POST(req: Request) {
//   try {
//     const payload = (await req.json()) as Record<string, unknown>;
//     console.log('📞 Incoming call payload:', payload);
//     if (!TELEPHONY_API_URL) {
//       throw new Error('❌ Missing TELEPHONY_API_URL environment variable');
//     }
//     console.log(`➡️ Forwarding call to backend: ${TELEPHONY_API_URL}`);
//     const response = await fetch(TELEPHONY_API_URL, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(payload),
//     });
//     const text = await response.text();
//     console.log('⬅️ Telephony backend raw response:', text);
//     let data: Record<string, unknown> = {};
//     try {
//       data = JSON.parse(text);
//     } catch {
//       data = { raw: text };
//     }
//     if (!response.ok) {
//       console.error('❌ Telephony backend error:', data);
//       return NextResponse.json(
//         {
//           success: false,
//           message: `Telephony API failed (${response.status})`,
//           details: data,
//         },
//         { status: response.status }
//       );
//     }
//     console.log('✅ Call triggered successfully');
//     return NextResponse.json({
//       success: true,
//       data,
//     });
//   } catch (err: unknown) {
//     const error = err instanceof Error ? err : new Error(String(err));
//     console.error('🚨 Error in /api/telephony/call:', error);
//     return NextResponse.json(
//       {
//         success: false,
//         message: error.message || 'Unknown internal error while triggering call',
//       },
//       { status: 500 }
//     );
//   }
// }
import { NextResponse } from 'next/server';

export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const domainName = url.searchParams.get('domainName') || '';

    // 🔥 Dynamic URL selection (ONLY update)
    let TELEPHONY_API_URL;
    if (domainName.includes('onboardsoft-live')) {
      TELEPHONY_API_URL = process.env.NEXT_PUBLIC_TELEPHONY_URL_LIVE;
      console.log('🔧 Using Call Live LiveKit environment');
    } else if (domainName.includes('convoso')) {
      TELEPHONY_API_URL = process.env.NEXT_PUBLIC_TELEPHONY_URL_CONVOSO;
      console.log('🔧 Using Call Convoso LiveKit environment');
    } else if (domainName.includes('onboardsoft-dev')) {
      TELEPHONY_API_URL = process.env.NEXT_PUBLIC_TELEPHONY_URL_DEV;
      console.log('🔧 Using Call Dev LiveKit environment');
    } else {
      TELEPHONY_API_URL = process.env.NEXT_PUBLIC_TELEPHONY_URL_LIVE;
      console.log('🔧 Using Default Call Live LiveKit environment');
    }

    const payload = (await req.json()) as Record<string, unknown>;
    console.log('📞 Incoming call payload:', payload);

    if (!TELEPHONY_API_URL) {
      throw new Error('❌ Missing TELEPHONY_API_URL environment variable');
    }

    console.log(`➡️ Forwarding call to backend: ${TELEPHONY_API_URL}`);

    const response = await fetch(TELEPHONY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    console.log('⬅️ Telephony backend raw response:', text);

    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      console.error('❌ Telephony backend error:', data);
      return NextResponse.json(
        {
          success: false,
          message: `Telephony API failed (${response.status})`,
          details: data,
        },
        { status: response.status }
      );
    }

    console.log('✅ Call triggered successfully');
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('🚨 Error in /api/telephony/call:', error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Unknown internal error while triggering call',
      },
      { status: 500 }
    );
  }
}
