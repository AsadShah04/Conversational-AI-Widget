import type { NextConfig } from 'next';

// next.config.ts
const NextConfig = {
  devIndicators: false,

  // ✅ allow hot reloads & asset requests from these origins
  allowedDevOrigins: [
    'https://chat.voiceadmins.com',
    'http://chat.voiceadmins.com',
    'http://localhost:3000',
  ],
};

export default NextConfig;