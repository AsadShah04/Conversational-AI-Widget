'use client';

import { APP_CONFIG_DEFAULTS } from '@/app-config';
import EmbedPopupAgentClient from './embed-popup/agent-client';

export default function Welcome() {
  // Automatically open popup call immediately
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <EmbedPopupAgentClient appConfig={APP_CONFIG_DEFAULTS} />
    </div>
  );
}
