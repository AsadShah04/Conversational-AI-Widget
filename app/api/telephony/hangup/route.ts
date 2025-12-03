// import { NextResponse } from 'next/server';
// import { RoomServiceClient } from 'livekit-server-sdk';
// const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
// const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
// const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY_DEV!;
// const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET_DEV!;
// const LIVEKIT_URL = process.env.LIVEKIT_URL_DEV!;
// export async function PATCH(req: Request) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const sid = searchParams.get('sid');
//     const room = searchParams.get('room');
//     const participant = searchParams.get('participant');
//     if (!sid) {
//       throw new Error('Missing call sid parameter');
//     }
//     console.log('🛑 Hangup request received:', { sid, room, participant });
//     // Check if it's a LiveKit SIP call (starts with SCL_) or Twilio call
//     if (sid.startsWith('SCL_')) {
//       // LiveKit SIP Call - use LiveKit SDK to remove participant
//       console.log('🎧 Terminating LiveKit SIP call:', sid);
//       if (!room || !participant) {
//         throw new Error('Room name and participant identity are required for LiveKit SIP calls');
//       }
//       try {
//         // ✅ Use RoomServiceClient to remove the SIP participant
//         const livekitHost = LIVEKIT_URL.replace('wss://', 'https://').replace('ws://', 'http://');
//         const roomService = new RoomServiceClient(livekitHost, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
//         // Remove the participant from the room
//         await roomService.removeParticipant(room, participant);
//         console.log('✅ LiveKit SIP call participant removed successfully');
//         return NextResponse.json({
//           success: true,
//           message: 'LiveKit SIP call terminated',
//           provider: 'livekit',
//         });
//       } catch (livekitError) {
//         console.error('❌ LiveKit SIP hangup failed:', livekitError);
//         throw new Error(
//           `LiveKit SIP hangup failed: ${livekitError instanceof Error ? livekitError.message : String(livekitError)}`
//         );
//       }
//     } else {
//       // Twilio Call - use Twilio API to update call status
//       console.log('📞 Terminating Twilio call:', sid);
//       const authHeader =
//         'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
//       const response = await fetch(
//         `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/${sid}.json`,
//         {
//           method: 'POST',
//           headers: {
//             Authorization: authHeader,
//             'Content-Type': 'application/x-www-form-urlencoded',
//           },
//           body: new URLSearchParams({
//             Status: 'completed',
//           }),
//         }
//       );
//       if (!response.ok) {
//         const error = await response.text();
//         console.error('❌ Twilio hangup failed:', error);
//         throw new Error(`Twilio hangup failed: ${error}`);
//       }
//       const data = await response.json();
//       console.log('✅ Twilio call terminated successfully:', data);
//       return NextResponse.json({
//         success: true,
//         message: 'Twilio call terminated',
//         provider: 'twilio',
//         data,
//       });
//     }
//   } catch (error) {
//     console.error('🚨 Error hanging up call:', error);
//     return NextResponse.json(
//       {
//         success: false,
//         message: error instanceof Error ? error.message : 'Failed to hang up call',
//         error: error instanceof Error ? error.message : String(error),
//       },
//       { status: 500 }
//     );
//   }
// }
import { NextResponse } from 'next/server';
import { RoomServiceClient } from 'livekit-server-sdk';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;

export async function PATCH(req: Request) {
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
      console.log('🔧 Using Default Live LiveKit environment');
    }

    const sid = searchParams.get('sid');
    const room = searchParams.get('room');
    const participant = searchParams.get('participant');

    if (!sid) {
      throw new Error('Missing call sid parameter');
    }

    console.log('🛑 Hangup request received:', { sid, room, participant });

    if (sid.startsWith('SCL_')) {
      console.log('🎧 Terminating LiveKit SIP call:', sid);

      if (!room || !participant) {
        throw new Error('Room name and participant identity are required for LiveKit SIP calls');
      }

      try {
        const livekitHost = LIVEKIT_URL.replace('wss://', 'https://').replace('ws://', 'http://');
        const roomService = new RoomServiceClient(livekitHost, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

        await roomService.removeParticipant(room, participant);

        console.log('✅ LiveKit SIP call participant removed successfully');
        return NextResponse.json({
          success: true,
          message: 'LiveKit SIP call terminated',
          provider: 'livekit',
        });
      } catch (livekitError) {
        console.error('❌ LiveKit SIP hangup failed:', livekitError);
        throw new Error(
          `LiveKit SIP hangup failed: ${
            livekitError instanceof Error ? livekitError.message : String(livekitError)
          }`
        );
      }
    } else {
      console.log('📞 Terminating Twilio call:', sid);

      const authHeader =
        'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/${sid}.json`,
        {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            Status: 'completed',
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('❌ Twilio hangup failed:', error);
        throw new Error(`Twilio hangup failed: ${error}`);
      }

      const data = await response.json();
      console.log('✅ Twilio call terminated successfully:', data);

      return NextResponse.json({
        success: true,
        message: 'Twilio call terminated',
        provider: 'twilio',
        data,
      });
    }
  } catch (error) {
    console.error('🚨 Error hanging up call:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to hang up call',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
