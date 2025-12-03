'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { motion } from 'motion/react';
import { RoomAudioRenderer, RoomContext, StartAudio } from '@livekit/components-react';
import { ErrorMessage } from '@/components/embed-popup/error-message';
import useConnectionDetails from '@/hooks/use-connection-details';
import { type AppConfig, EmbedErrorDetails } from '@/lib/types';
import { cn } from '@/lib/utils';

export type EmbedFixedAgentClientProps = {
  appConfig: AppConfig;
};

// Helper to get URL params
function getUrlParams() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return {
    agentName: params.get('agentName') || 'Maya',
    theme: params.get('theme') || '#d5b654',
    publicKey: params.get('publicKey') || '',
  };
}

function AgentClient({ appConfig }: EmbedFixedAgentClientProps) {
  const isAnimating = useRef(false);
  const room = useMemo(() => new Room(), []);
  const [popupOpen, setPopupOpen] = useState(false);
  const [error, setError] = useState<EmbedErrorDetails | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Get dynamic config from URL
  const config = getUrlParams();
  const agentName = config?.agentName || 'Maya';
  const themeColor = config?.theme || '#d5b654';

  useEffect(() => {
    console.log('🎨 Widget Config:', { agentName, themeColor, url: window.location.href });
  }, [agentName, themeColor]);

  const { existingOrRefreshConnectionDetails } = useConnectionDetails(appConfig);

  /** ─────────────── UI TOGGLE ─────────────── **/
  const handleTogglePopup = () => {
    if (isAnimating.current) return;
    setError(null);
    const newState = !popupOpen;
    setPopupOpen(newState);

    // Notify parent about state change
    window.parent.postMessage({ type: newState ? 'WIDGET_OPENED' : 'WIDGET_CLOSED' }, '*');
  };

  const handlePanelAnimationStart = () => (isAnimating.current = true);
  const handlePanelAnimationComplete = () => (isAnimating.current = false);

  /** ─────────────── LIVEKIT EVENTS ─────────────── **/
  useEffect(() => {
    room.on(RoomEvent.Disconnected, () => {
      console.log('🔔 LiveKit disconnected');
      setConnected(false);
      setConnecting(false);
      setCallDuration(0);
    });

    room.on(RoomEvent.MediaDevicesError, (err: Error) => {
      setError({
        title: 'Encountered an error with your media devices',
        description: `${err.name}: ${err.message}`,
      });
    });

    return () => {
      room.removeAllListeners();
    };
  }, [room]);

  /** ─────────────── CALL CONTROL ─────────────── **/
  const handleStartCall = async () => {
    try {
      setConnecting(true);
      const conn = await existingOrRefreshConnectionDetails();
      if (!conn) throw new Error('No connection details received');

      console.log('🔗 Connecting to LiveKit...');
      await room.connect(conn.serverUrl, conn.participantToken);
      console.log('✅ Connected to LiveKit, enabling mic...');

      await room.localParticipant.setMicrophoneEnabled(true, undefined, {
        preConnectBuffer: appConfig.isPreConnectBufferEnabled,
      });

      setConnecting(false);
      setConnected(true);
    } catch (err) {
      setConnecting(false);
      console.error('❌ Connection error:', err);
      setError({
        title: 'Failed to connect to agent',
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleEndCall = async () => {
    try {
      await room.disconnect();
      setConnected(false);
      setCallDuration(0);
    } catch (err) {
      console.error('❌ Disconnect error:', err);
    }
  };

  /** Timer **/
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (connected) {
      interval = setInterval(() => setCallDuration((t) => t + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [connected]);

  /** ─────────────── UI HELPERS ─────────────── **/
  const getHeaderStatus = () => {
    if (connecting) return 'Connecting...';
    if (connected) return 'Connected – Speak now';
    return 'Available 24/7';
  };

  const getFooterStatus = () => {
    if (connecting) return { color: themeColor, text: 'Connecting to agent...' };
    if (connected) return { color: '#1dc46b', text: 'Agent is online and ready' };
    return { color: '#888', text: 'Agent is available' };
  };

  const footer = getFooterStatus();

  /** ─────────────── RENDER ─────────────── **/
  return (
    <RoomContext.Provider value={room}>
      <RoomAudioRenderer />
      <StartAudio label="Start Audio" />

      {/* 🟡 Floating Mic Launcher */}
      <button
        onClick={handleTogglePopup}
        title={`Talk to ${agentName}`}
        className="fixed right-6 bottom-6 z-40 flex h-14 w-14 items-center justify-center rounded-full text-[#111318] shadow-lg transition-transform hover:scale-105"
        style={{ backgroundColor: themeColor }}
      >
        <span className="text-2xl">🎤</span>
      </button>

      {/* 🖤 Maya Modal */}
      <motion.div
        inert={!popupOpen}
        initial={{ opacity: 0, translateY: 8 }}
        animate={{
          opacity: popupOpen ? 1 : 0,
          translateY: popupOpen ? 0 : 8,
        }}
        transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
        onAnimationStart={handlePanelAnimationStart}
        onAnimationComplete={handlePanelAnimationComplete}
        className={cn(
          'fixed right-4 bottom-24 left-4 z-50 md:left-auto',
          !popupOpen && 'pointer-events-none'
        )}
      >
        {popupOpen && (
          <div className="ml-auto w-full overflow-hidden rounded-[18px] border border-[#2a2a2a] bg-[#111318] text-white shadow-2xl md:w-[360px]">
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ backgroundColor: themeColor, color: '#111318', fontWeight: 600 }}
            >
              <div className="flex items-center gap-2">
                <span>🎤</span>
                <div className="flex flex-col leading-tight">
                  <span className="font-semibold">{agentName}</span>
                  <span className="-mt-0.5 text-xs font-normal opacity-80">
                    {getHeaderStatus()}
                  </span>
                </div>
              </div>
              <button
                aria-label="Close"
                className="text-lg font-bold hover:opacity-80"
                onClick={handleTogglePopup}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-col items-center justify-center px-6 py-6 text-center">
              <div className="mb-4 text-3xl">🎙️</div>
              <h2 className="mb-2 text-lg font-semibold">Talk to {agentName}</h2>
              <p className="mb-8 text-sm text-gray-400">
                Experience our advanced {agentName} voice agent with real-time conversation
                capabilities.
              </p>

              {/* Start / End Button */}
              {!connected ? (
                <button
                  onClick={handleStartCall}
                  disabled={connecting}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-md px-8 py-3 text-base font-semibold transition-colors',
                    connecting
                      ? 'cursor-not-allowed text-[#111318]'
                      : 'text-[#111318] hover:opacity-90'
                  )}
                  style={{
                    backgroundColor: connecting ? `${themeColor}70` : themeColor,
                  }}
                >
                  {connecting ? (
                    <>
                      ⏳ <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      📞 <span>Start Voice Chat</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleEndCall}
                  className="flex items-center justify-center gap-2 rounded-md bg-[#d9534f] px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-[#c94642]"
                >
                  📞 <span>End Call</span>
                </button>
              )}

              {/* Call Duration */}
              {connected && (
                <div className="mt-6 text-sm text-gray-300">
                  Call Duration:{' '}
                  <span className="font-mono">
                    {`${Math.floor(callDuration / 60)}:${String(callDuration % 60).padStart(2, '0')}`}
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-center gap-2 border-t border-[#2a2a2a] py-2 text-sm">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: footer.color }}></div>
              <span className="text-gray-300">{footer.text}</span>
            </div>

            {/* Errors */}
            <ErrorMessage error={error} />
          </div>
        )}
      </motion.div>
    </RoomContext.Provider>
  );
}

export default AgentClient;
