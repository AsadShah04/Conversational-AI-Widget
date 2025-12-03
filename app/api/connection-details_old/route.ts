import { NextResponse } from 'next/server';
import { AccessToken, type AccessTokenOptions, type VideoGrant } from 'livekit-server-sdk';
import { RoomConfiguration } from '@livekit/protocol';

// don't cache the results
export const revalidate = 0;

export type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
};

export async function POST(req: Request) {
  try {
    // Parse configuration from request body
    const body = await req.json();
    const agentName: string = body?.room_config?.agents?.[0]?.agent_name;
    const agentId: string = body?.agent_id;
    const agentRoom: string = body?.agent_room;
    const domainName: string = body?.domainName;

    // Determine which LiveKit credentials to use based on domain name
    let LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL;

    if (domainName === 'onboardsoft-dev') {
      LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY_DEV;
      LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET_DEV;
      LIVEKIT_URL = process.env.LIVEKIT_URL_DEV;
      console.log('🔧 Using DEV LiveKit environment');
    } else if (domainName === 'onboardsoft-live') {
      LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY_LIVE;
      LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET_LIVE;
      LIVEKIT_URL = process.env.LIVEKIT_URL_LIVE;
      console.log('🔧 Using LIVE LiveKit environment');
    } else if (domainName === 'convoso') {
      LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY_CONVOSO;
      LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET_CONVOSO;
      LIVEKIT_URL = process.env.LIVEKIT_URL_CONVOSO;
      console.log('🔧 Using CONVOSO LiveKit environment');
    } else {
      LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY_LIVE;
      LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET_LIVE;
      LIVEKIT_URL = process.env.LIVEKIT_URL_LIVE;
      console.log('🔧 Using DEFAULT LIVE LiveKit environment');
    }

    if (LIVEKIT_URL === undefined) {
      throw new Error('LIVEKIT_URL is not defined');
    }
    if (LIVEKIT_API_KEY === undefined) {
      throw new Error('LIVEKIT_API_KEY is not defined');
    }
    if (LIVEKIT_API_SECRET === undefined) {
      throw new Error('LIVEKIT_API_SECRET is not defined');
    }

    // Generate or use provided participant details
    const participantName = 'user';
    const participantIdentity = `voice_assistant_user_${Math.floor(Math.random() * 10_000)}`;

    // Use provided room name or generate random one
    const roomName = agentRoom || `voice_assistant_room_${Math.floor(Math.random() * 10_000)}`;

    console.log('🔗 Creating connection for:', {
      roomName,
      agentName,
      agentId,
      isCustomRoom: !!agentRoom,
    });

    // Generate participant token
    const participantToken = await createParticipantToken(
      { identity: participantIdentity, name: participantName },
      roomName,
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
      agentName,
      agentId
    );

    // Return connection details
    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantToken: participantToken,
      participantName,
    };

    const headers = new Headers({
      'Cache-Control': 'no-store',
    });

    return NextResponse.json(data, { headers });
  } catch (error) {
    if (error instanceof Error) {
      console.error(error);
      return new NextResponse(error.message, { status: 500 });
    }
  }
}

function createParticipantToken(
  userInfo: AccessTokenOptions,
  roomName: string,
  apiKey: string,
  apiSecret: string,
  agentName?: string,
  agentId?: string
): Promise<string> {
  const at = new AccessToken(apiKey, apiSecret, {
    ...userInfo,
    ttl: '15m',
  });

  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };

  at.addGrant(grant);

  // Configure room with agent
  if (agentName || agentId) {
    const agentConfig: { agentName?: string; agentId?: string } = {};
    if (agentName) agentConfig.agentName = agentName;
    if (agentId) agentConfig.agentId = agentId;

    at.roomConfig = new RoomConfiguration({
      agents: [agentConfig],
    });
  }

  return at.toJwt();
}
