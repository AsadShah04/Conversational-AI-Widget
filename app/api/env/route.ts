import { NextResponse } from 'next/server';

export const revalidate = 0;

export async function GET() {
  const secret = process.env.TELEPHONY_TOKEN_SECRET;

  if (!secret) {
    return NextResponse.json({ success: false, message: 'Secret not configured' }, { status: 500 });
  }

  const encoded = Buffer.from(secret).toString('base64url');

  return NextResponse.json({
    success: true,
    secret: encoded,
  });
}
