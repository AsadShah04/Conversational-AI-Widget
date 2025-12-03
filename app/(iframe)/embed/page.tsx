import { headers } from 'next/headers';
import { ApplyThemeScript } from '@/components/embed-iframe/theme-provider';
import EmbedAgentClient from '@/components/embed-popup/agent-client';
import { getAppConfig, getOrigin } from '@/lib/env';

export default async function Embed() {
  const hdrs = await headers();
  const origin = getOrigin(hdrs);
  const appConfig = await getAppConfig(origin);

  return (
    <>
      <ApplyThemeScript />
      <EmbedAgentClient appConfig={appConfig} />
    </>
  );
}
