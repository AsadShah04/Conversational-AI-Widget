// import { NextResponse } from 'next/server';
// import { RoomServiceClient } from 'livekit-server-sdk';
// const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
// const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
// const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY_DEV!;
// const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET_DEV!;
// const LIVEKIT_URL = process.env.LIVEKIT_URL_DEV!;
// export const revalidate = 0;
// export async function GET(req: Request) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const sid = searchParams.get('sid');
//     const agentRoom = searchParams.get('room');
//     if (!sid) throw new Error('Missing call SID');
//     console.log('📡 Status check request:', sid);
//     // ───── LiveKit SIP Call ─────
//     if (sid.startsWith('SCL_')) {
//       console.log('🔎 Checking LiveKit SIP call status...');
//       const livekitHost = LIVEKIT_URL.replace('wss://', 'https://').replace('ws://', 'http://');
//       const roomService = new RoomServiceClient(livekitHost, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
//       try {
//         const rooms = await roomService.listRooms();
//         // Match by metadata, name, or param
//         const activeRoom =
//           rooms.find((r) => r.metadata?.includes(sid)) ||
//           rooms.find((r) => r.name === agentRoom) ||
//           rooms.find((r) => r.name.includes('room'));
//         if (!activeRoom) {
//           console.log('❌ No active LiveKit room found for', sid);
//           return NextResponse.json({ status: 'completed', provider: 'livekit' });
//         }
//         let participants = [];
//         try {
//           participants = await roomService.listParticipants(activeRoom.name);
//         } catch (err) {
//           const error = err as unknown as { code?: string; message?: string };
//           // Graceful catch for "Not Found"
//           if (
//             error.code === 'not_found' ||
//             error.message?.includes('requested room does not exist')
//           ) {
//             console.log('⚡ LiveKit room already destroyed — marking call as completed');
//             return NextResponse.json({ status: 'completed', provider: 'livekit' });
//           }
//           throw error;
//         }
//         console.log(`👥 Found ${participants.length} participant(s) in room "${activeRoom.name}"`);
//         // Fast exit: if agent left, end immediately
//         // 🧠 Check if agent is still present
//         const agentStillHere = participants.some((p) =>
//           p.identity?.toLowerCase().startsWith('agent-')
//         );
//         // ⚡ If agent is gone, call is over
//         if (!agentStillHere) {
//           console.log('⚡ Agent participant left — ending call immediately');
//           return NextResponse.json({ status: 'completed', provider: 'livekit' });
//         }
//         // 🧩 If only one participant remains (agent alone), mark as completed immediately
//         if (participants.length === 1 && agentStillHere) {
//           console.log('⚡ Only one participant (agent) remains — marking call completed');
//           return NextResponse.json({ status: 'completed', provider: 'livekit' });
//         }
//         // ✅ Otherwise still active
//         return NextResponse.json({
//           status: 'in-progress',
//           provider: 'livekit',
//           participants: participants.map((p) => ({
//             identity: p.identity,
//             sid: p.sid,
//             state: p.state,
//           })),
//         });
//         // Otherwise no one left
//         console.log('🔚 No participants left — marking call as completed');
//         return NextResponse.json({ status: 'completed', provider: 'livekit' });
//       } catch (err) {
//         console.error('❌ LiveKit status check failed:', err);
//         return NextResponse.json(
//           { status: 'unknown', provider: 'livekit', error: String(err) },
//           { status: 500 }
//         );
//       }
//     }
//     // ───── Twilio Call ─────
//     console.log('🔎 Checking Twilio call status...');
//     const authHeader =
//       'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
//     const response = await fetch(
//       `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/${sid}.json`,
//       {
//         method: 'GET',
//         headers: { Authorization: authHeader },
//       }
//     );
//     if (!response.ok) {
//       const error = await response.text();
//       console.error('❌ Twilio status check failed:', error);
//       throw new Error(`Twilio status fetch failed: ${error}`);
//     }
//     const data = await response.json();
//     const status = data.status || 'unknown';
//     console.log(`📞 Twilio call ${sid} status:`, status);
//     return NextResponse.json({ status, provider: 'twilio', data });
//   } catch (err) {
//     console.error('🚨 Error in /api/telephony/status:', err);
//     return NextResponse.json(
//       { success: false, status: 'unknown', message: String(err) },
//       { status: 500 }
//     );
//   }
// }
import { NextResponse } from 'next/server';
import { RoomServiceClient } from 'livekit-server-sdk';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;

export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const domainName = searchParams.get('domainName') || '';

    // 🔥 Dynamic LiveKit environment selection (ONLY change)
    let LIVEKIT_API_KEY;
    let LIVEKIT_API_SECRET;
    let LIVEKIT_URL;

    if (domainName.includes('onboardsoft_dev')) {
      LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY_DEV!;
      LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET_DEV!;
      LIVEKIT_URL = process.env.LIVEKIT_URL_DEV!;
      console.log('🔧 Using Dev LiveKit environment');
    } else if (domainName.includes('convoso')) {
      LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY_CONVOSO!;
      LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET_CONVOSO!;
      LIVEKIT_URL = process.env.LIVEKIT_URL_CONVOSO!;
      console.log('🔧 Using Convoso LiveKit environment');
    } else {
      LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY_LIVE!;
      LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET_LIVE!;
      LIVEKIT_URL = process.env.LIVEKIT_URL_LIVE!;
      console.log('🔧 Using Live LiveKit environment');
    }

    const sid = searchParams.get('sid');
    const agentRoom = searchParams.get('room');

    if (!sid) throw new Error('Missing call SID');

    console.log('📡 Status check request:', sid);

    // ───── LiveKit SIP Call ─────
    if (sid.startsWith('SCL_')) {
      console.log('🔎 Checking LiveKit SIP call status...');
      const livekitHost = LIVEKIT_URL.replace('wss://', 'https://').replace('ws://', 'http://');
      const roomService = new RoomServiceClient(livekitHost, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

      try {
        const rooms = await roomService.listRooms();

        const activeRoom =
          rooms.find((r) => r.metadata?.includes(sid)) ||
          rooms.find((r) => r.name === agentRoom) ||
          rooms.find((r) => r.name.includes('room'));

        if (!activeRoom) {
          console.log('❌ No active LiveKit room found for', sid);
          return NextResponse.json({ status: 'completed', provider: 'livekit' });
        }

        let participants = [];
        try {
          participants = await roomService.listParticipants(activeRoom.name);
        } catch (err) {
          const error = err as unknown as { code?: string; message?: string };
          if (
            error.code === 'not_found' ||
            error.message?.includes('requested room does not exist')
          ) {
            console.log('⚡ LiveKit room already destroyed — marking call as completed');
            return NextResponse.json({ status: 'completed', provider: 'livekit' });
          }
          throw error;
        }

        console.log(`👥 Found ${participants.length} participant(s) in room "${activeRoom.name}"`);

        const agentStillHere = participants.some((p) =>
          p.identity?.toLowerCase().startsWith('agent-')
        );

        if (!agentStillHere) {
          console.log('⚡ Agent participant left — ending call immediately');
          return NextResponse.json({ status: 'completed', provider: 'livekit' });
        }

        if (participants.length === 1 && agentStillHere) {
          console.log('⚡ Only one participant (agent) remains — marking call completed');
          return NextResponse.json({ status: 'completed', provider: 'livekit' });
        }

        return NextResponse.json({
          status: 'in-progress',
          provider: 'livekit',
          participants: participants.map((p) => ({
            identity: p.identity,
            sid: p.sid,
            state: p.state,
          })),
        });

        console.log('🔚 No participants left — marking call as completed');
        return NextResponse.json({ status: 'completed', provider: 'livekit' });
      } catch (err) {
        console.error('❌ LiveKit status check failed:', err);
        return NextResponse.json(
          { status: 'unknown', provider: 'livekit', error: String(err) },
          { status: 500 }
        );
      }
    }

    // ───── Twilio Call ─────
    console.log('🔎 Checking Twilio call status...');
    const authHeader =
      'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/${sid}.json`,
      {
        method: 'GET',
        headers: { Authorization: authHeader },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Twilio status check failed:', error);
      throw new Error(`Twilio status fetch failed: ${error}`);
    }

    const data = await response.json();
    const status = data.status || 'unknown';

    console.log(`📞 Twilio call ${sid} status:`, status);
    return NextResponse.json({ status, provider: 'twilio', data });
  } catch (err) {
    console.error('🚨 Error in /api/telephony/status:', err);
    return NextResponse.json(
      { success: false, status: 'unknown', message: String(err) },
      { status: 500 }
    );
  }
}
