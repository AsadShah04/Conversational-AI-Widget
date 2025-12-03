'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { motion } from 'motion/react';
import { RoomAudioRenderer, RoomContext, StartAudio } from '@livekit/components-react';
import { ErrorMessage } from '@/components/embed-popup/error-message';
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
    agentName: params.get('agentName') || 'BETTY',
    theme: params.get('theme') || '#724cfb',
    agentId: params.get('agentId') || '',
    domainName: params.get('domainName') || '',
    agentRoom: params.get('agentRoom') || 'voso_room',
    formEnabled: params.get('form_enabled') || 'No',
    phoneSid: params.get('phoneSid') || '',
    // sipTrunkId: params.get('sipTrunkId') || '',
    sipTrunkId: 'ST_PxWsPZdRBPUf',
    phoneNumber: params.get('phoneNumber') || '',
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
  const [isMuted, setIsMuted] = useState(false);
  const [callStatus, setCallStatus] = useState<string>('idle');
  // ✅ store callSid globally for hangup
  const [activeCallSid, setActiveCallSid] = useState<string | null>(null);

  // Dialer states
  const [showDialer, setShowDialer] = useState(false);
  const [dialerNumber, setDialerNumber] = useState('');
  const [isCalling, setIsCalling] = useState(false);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
  });
  const [formErrors, setFormErrors] = useState({
    fullName: '',
    email: '',
    phone: '',
  });
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Helper to append domainName to all API endpoints
  const api = (path: string) => {
    const url = new URL(path, window.location.origin);
    if (domainName) url.searchParams.set('domainName', domainName);
    return url.toString();
  };

  // Get dynamic config from URL
  const config = getUrlParams();

  const agentName = config?.agentName || 'Betty';
  const themeColor = config?.theme || '#724cfb';
  const agentId = config?.agentId || '23e88998-5fc1-4282-8c6f-29b545f67bea';
  const domainName = config?.domainName || 'convoso';
  const agentRoom = config?.agentRoom || 'voso_room';
  const formEnabled = config?.formEnabled === 'Yes';

  /** ─────────────── Apply Theme Globally ─────────────── **/
  useEffect(() => {
    document.documentElement.style.setProperty('--va-theme', themeColor);
  }, [themeColor]);

  useEffect(() => {
    console.log('🎨 Widget Config:', {
      agentName,
      themeColor,
      formEnabled,
      domainName,
      url: window.location.href,
    });
  }, [agentName, themeColor, formEnabled, domainName]);

  /** ─────────────── UI TOGGLE ─────────────── **/
  const handleTogglePopup = () => {
    if (isAnimating.current) return;
    setError(null);
    const newState = !popupOpen;
    setPopupOpen(newState);

    // If form is enabled and not submitted, show form
    if (newState && formEnabled && !formSubmitted) {
      setShowForm(true);
    }

    // Reset dialer when closing
    if (!newState) {
      setShowDialer(false);
      setDialerNumber('');
    }

    // Notify parent about state change
    window.parent.postMessage({ type: newState ? 'WIDGET_OPENED' : 'WIDGET_CLOSED' }, '*');
  };

  const handlePanelAnimationStart = () => (isAnimating.current = true);
  const handlePanelAnimationComplete = () => (isAnimating.current = false);

  /** ─────────────── DIALER FUNCTIONS ─────────────── **/
  const handleDialerClick = (digit: string) => {
    if (dialerNumber.length < 15) {
      setDialerNumber((prev) => prev + digit);
    }
  };

  const handleDialerBackspace = () => {
    setDialerNumber((prev) => prev.slice(0, -1));
  };

  // const handleDialerCall = async (): Promise<void> => {
  //   if (dialerNumber.length < 10) {
  //     setError({
  //       title: 'Invalid Number',
  //       description: 'Please enter a valid phone number',
  //     });
  //     return;
  //   }

  //   setIsCalling(true);

  //   const phoneSid = config?.phoneSid || '';
  //   const sipTrunkId = config?.sipTrunkId || '';
  //   const phoneNumber = config?.phoneNumber || '';

  //   const cleanNumber = dialerNumber.replace(/\D/g, '');
  //   // ✅ Normalize and validate US number
  //   let sipCallTo = cleanNumber;

  //   // Remove leading 00 or +
  //   sipCallTo = sipCallTo.replace(/^0+|^1+/, ''); // remove redundant country prefixes if any
  //   if (sipCallTo.length > 10) sipCallTo = sipCallTo.slice(-10); // keep last 10 digits only

  //   sipCallTo = `+1${sipCallTo}`; // standardize to +1XXXXXXXXXX

  //   const payload = {
  //     agent_id: agentId,
  //     number_id: phoneSid,
  //     sip_number: phoneNumber,
  //     sip_trunk_id: sipTrunkId,
  //     sip_call_to: sipCallTo,
  //     room_name: agentRoom,
  //     participant_identity: agentName,
  //     participant_name: agentName,
  //     wait_until_answered: true,
  //     krisp_enabled: true,
  //   };

  //   try {
  //     const res = await fetch('/api/telephony/call', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(payload),
  //     });

  //     const data = (await res.json()) as Record<string, unknown>;
  //     if (!res.ok) {
  //       const message = (data?.message as string) || 'Call failed';
  //       throw new Error(message);
  //     }

  //     console.log('✅ Call initiated:', data);
  //     //await handleStartCall();
  //   } catch (err: unknown) {
  //     const errorMsg = err instanceof Error ? err.message : 'Please try again later';
  //     console.error('❌ Call failed:', err);
  //     setError({
  //       title: 'Call initiation failed',
  //       description: errorMsg,
  //     });
  //   } finally {
  //     setIsCalling(false);
  //   }
  // };

  // 🧠 Updated handleDialerCall (no "any" usage, fully typed)

  const handleDialerCall = async (): Promise<void> => {
    if (dialerNumber.length < 10) {
      setError({
        title: 'Invalid Number',
        description: 'Please enter a valid phone number',
      });
      return;
    }

    setIsCalling(true);
    setError(null);

    const phoneSid = config?.phoneSid || '';
    const sipTrunkId = config?.sipTrunkId || '';
    const phoneNumber = config?.phoneNumber || '';

    // Always enforce US 10-digit with +1 prefix
    const cleanNumber = dialerNumber.replace(/\D/g, '').slice(-10);
    const sipCallTo = `+1${cleanNumber}`;

    const payload = {
      agent_id: agentId,
      number_id: phoneSid,
      sip_number: phoneNumber,
      sip_trunk_id: sipTrunkId,
      sip_call_to: sipCallTo,
      room_name: agentRoom,
      participant_identity: agentName,
      participant_name: agentName,
      wait_until_answered: true,
      krisp_enabled: true,
    };

    try {
      const res = await fetch(api('/api/telephony/call'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as unknown;

      if (!res.ok) {
        const message = (data as { message?: string })?.message || 'Call failed';
        throw new Error(message);
      }

      console.log('✅ Call initiated:', data);

      interface CallResponse {
        data?: {
          sid?: string;
          livekit_sip_call_id?: string;
          session_id?: string;
          status?: string;
          [key: string]: unknown;
        };
        success?: boolean;
        message?: string;
      }

      const parsed = (data as CallResponse).data ?? {};
      const callSid = parsed.sid || parsed.livekit_sip_call_id || parsed.session_id;

      if (!callSid) {
        console.warn('⚠️ No call identifier found in response.');
        setConnected(true);
        return;
      }

      console.log('📡 Stored call identifier:', callSid);
      setActiveCallSid(callSid);

      // 🧠 If this is a LiveKit SIP call, mark it connected instantly
      console.log('callSid:', callSid);

      if (callSid.startsWith('SCL_')) {
        console.log('🎧 LiveKit SIP call detected — marking connected immediately');
        setConnected(true);
        setCallStatus('in-progress');
        // ❌ don't return — allow status polling to start too
      }

      // 🕓 For both Twilio & LiveKit SIP calls — start polling
      startCallStatusPolling(callSid);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Please try again later';
      console.error('❌ Call failed:', err);
      setError({
        title: 'Call initiation failed',
        description: errorMsg,
      });
    } finally {
      setIsCalling(false);
    }
  };

  const handleEndCallDialer = async () => {
    try {
      if (activeCallSid) {
        console.log('🛑 Sending hangup request for:', activeCallSid);

        // Pass room name and participant identity
        const params = new URLSearchParams({
          sid: activeCallSid,
          room: agentRoom,
          participant: agentName,
        });

        params.set('domainName', domainName);
        const res = await fetch(api(`/api/telephony/hangup?${params}`), {
          method: 'PATCH',
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data?.message || 'Failed to hang up the call');
        console.log('✅ Call ended successfully');
      }

      await room.disconnect();
      setConnected(false);
      setCallDuration(0);
      setIsMuted(false);
      setActiveCallSid(null);
    } catch (err) {
      console.error('❌ Error ending call:', err);
      setError({
        title: 'Failed to end call',
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  // 🧩 Updated startCallStatusPolling (ESLint-clean)
  const startCallStatusPolling = (callSid: string): void => {
    console.log('📡 Starting Twilio call status polling for:', callSid);

    setCallStatus('queued');

    // ✅ const instead of let
    const pollInterval = setInterval(async () => {
      try {
        const statusUrl = api(`/api/telephony/status?sid=${callSid}&room=${agentRoom}`);
        const response = await fetch(statusUrl);

        console.log('response: ', response);

        const result = (await response.json()) as { status?: string; message?: string };
        console.log('result: ', result);

        if (!response.ok) throw new Error(result?.message || 'Failed to get status');

        const status = result?.status ?? 'unknown';
        setCallStatus(status);
        console.log(`📞 Twilio Call ${callSid} Status:`, status);

        // 🟢 Active Call
        if (status === 'in-progress') {
          setConnected(true);
        }

        // 🔴 Ended or Failed
        if (['completed', 'failed', 'busy', 'no-answer', 'canceled'].includes(status)) {
          clearInterval(pollInterval);
          setConnected(false);
          setCallDuration(0);
          console.log(`🛑 Call ${callSid} ended with status: ${status}`);
        }
      } catch (err) {
        console.error('Error polling Twilio call status:', err);
      }
    }, 3000); // Poll every 3 seconds
  };

  /** ─────────────── FORM VALIDATION ─────────────── **/
  const validateForm = () => {
    const errors = {
      fullName: '',
      email: '',
      phone: '',
    };
    let isValid = true;

    // Validate Full Name
    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
      isValid = false;
    }

    // Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email';
      isValid = false;
    }

    // Validate Phone (USA format)
    const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
      isValid = false;
    } else if (!phoneRegex.test(formData.phone.replace(/\D/g, ''))) {
      errors.phone = 'Please enter a valid USA phone number';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  /** ─────────────── FORM SUBMISSION ─────────────── **/
  // const handleFormSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();

  //   if (!validateForm()) {
  //     return;
  //   }

  //   setIsSubmittingForm(true);
  //   setError(null);

  //   try {
  //     // Submit form data to webhook3
  //     const response = await fetch('http://66.232328.54.163:2000/api/webh3ok/user_info', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         full_name: formData.fullName,
  //         email: formData.email,
  //         phone: formData.phone,
  //         agent_name: agentName,
  //         agent_id: agentId,
  //         agent_room: agentRoom,
  //       }),
  //     });

  //     if (!response.ok) {
  //       throw new Error('Failed to submit form');
  //     }

  //     const result = await response.json();
  //     console.log('✅ Form submitted successfully:', result);

  //     // Mark form as submitted
  //     setFormSubmitted(true);
  //     setShowForm(false);

  //     // Auto-start call after successful form submission
  //     await handleStartCall();
  //   } catch (err) {
  //     console.error('❌ Form submission error:', err);
  //     setError({
  //       title: 'Failed to submit form',
  //       description: err instanceof Error ? err.message : 'Please try again',
  //     });
  //   } finally {
  //     setIsSubmittingForm(false);
  //   }
  // };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmittingForm(true);
    setError(null);

    try {
      // Submit form data to your backend
      const response = await fetch(api('/api/form/form_submit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          agent_id: agentId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit form');
      }

      const result = await response.json();
      console.log('✅ Form submitted successfully:', result);

      setError({
        title: 'Success',
        description: 'Form submitted successfully! Connecting you with the agent...',
      });

      setPopupOpen(true); // keep popup open

      // Show success message, then auto-start call
      setTimeout(async () => {
        setFormSubmitted(true);
        setShowForm(false);
        await handleStartCall(); // auto-start after success
        setTimeout(() => setError(null), 3000);
      }, 1500);

      // Optionally show success toast or small success text
      // alert('Your information was submitted successfully! You can now start the agent.');
    } catch (err) {
      console.error('❌ Form submission error:', err);
      setError({
        title: 'Failed to submit form',
        description: err instanceof Error ? err.message : 'Please try again',
      });
    } finally {
      setIsSubmittingForm(false);
    }
  };

  /** ─────────────── LIVEKIT EVENTS ─────────────── **/
  useEffect(() => {
    room.on(RoomEvent.Disconnected, () => {
      console.log('🔔 OnBoardSoft disconnected');
      setConnected(false);
      setConnecting(false);
      setCallDuration(0);
      setIsMuted(false);
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

  const getFreshIdentity = () => agentName + '_' + Date.now();

  const handleStartCall = async (): Promise<void> => {
    try {
      setConnecting(true);
      setError(null);

      console.log('🚀 Starting agent session for:', agentId);

      const identity = getFreshIdentity();

      const payload = {
        agent_id: agentId,
        tenant_id: 'default',
        client_identity: identity, // <<--- IMPORTANT FIX
      };

      const url = '/api/agents/start';
      console.log('POST:', url, payload);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log('📥 Agent start API response:', result);

      if (!response.ok) {
        throw new Error(result?.message || 'Failed to start agent session');
      }

      if (!result.livekit) {
        throw new Error('LiveKit details missing from response');
      }

      const { url: serverUrl, token } = result.livekit;

      if (!serverUrl || !token) {
        throw new Error('Invalid LiveKit connection details provided');
      }

      console.log('🔗 Connecting to LiveKit:', { serverUrl });

      await room.connect(serverUrl, token);

      console.log('🎉 Connected to LiveKit room successfully.');

      // Enable microphone
      await room.localParticipant.setMicrophoneEnabled(true, undefined, {
        preConnectBuffer: appConfig.isPreConnectBufferEnabled,
      });

      setConnecting(false);
      setConnected(true);
      setIsMuted(false);
      setShowDialer(false);
    } catch (err) {
      setConnecting(false);
      const errorMsg = err instanceof Error ? err.message : String(err);

      console.error('❌ handleStartCall Error:', err);

      setError({
        title: 'Failed to connect to agent',
        description: errorMsg,
      });
    }
  };

  // const handleStartCall = async (): Promise<void> => {
  //   try {
  //     setConnecting(true);
  //     setError(null);

  //     console.log('📡 Starting call with agent...');

  //     // Step 1: Call the start API to initialize agent session
  //     const startResponse = await fetch(
  //       `${process.env.NEXT_PUBLIC_FORM_BASE_URL_CONVOSO}api/agents/start`,
  //       {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //         },
  //         body: JSON.stringify({
  //           // add any required payload here
  //           // e.g., agentID, accountNo, etc.
  //         }),
  //       }
  //     );

  //     if (!startResponse.ok) {
  //       throw new Error(`Start API failed: ${startResponse.statusText}`);
  //     }

  //     const startData = await startResponse.json();
  //     console.log('📤 Start API response:', startData);

  //     // Step 2: Get LiveKit connection details (from startData or refresh if needed)
  //     const conn = startData.connection || (await existingOrRefreshConnectionDetails());
  //     if (
  //       !conn ||
  //       typeof conn.serverUrl !== 'string' ||
  //       typeof conn.participantToken !== 'string'
  //     ) {
  //       throw new Error('Invalid connection details received');
  //     }

  //     console.log('🔗 Connecting to OnBoardSoft...');
  //     await room.connect(conn.serverUrl, conn.participantToken);
  //     console.log('✅ Connected successfully.');

  //     await room.localParticipant.setMicrophoneEnabled(true, undefined, {
  //       preConnectBuffer: appConfig.isPreConnectBufferEnabled,
  //     });

  //     setConnecting(false);
  //     setConnected(true);
  //     setIsMuted(false);
  //     setShowDialer(false);
  //   } catch (err: unknown) {
  //     setConnecting(false);
  //     const error = err instanceof Error ? err.message : String(err);
  //     console.error('❌ Connection error:', err);
  //     setError({
  //       title: 'Failed to connect to agent',
  //       description: error,
  //     });
  //   }
  // };

  // const handleStartCall_bk_291125 = async (): Promise<void> => {
  //   try {
  //     setConnecting(true);
  //     setError(null);

  //     // Step 1: Check agent availability
  //     // const isAvailable = await checkAgentAvailability();
  //     // if (!isAvailable) {
  //     //   setConnecting(false);
  //     //   return;
  //     // }

  //     // Step 2: Get LiveKit connection details
  //     const conn = await existingOrRefreshConnectionDetails();
  //     if (
  //       !conn ||
  //       typeof conn.serverUrl !== 'string' ||
  //       typeof conn.participantToken !== 'string'
  //     ) {
  //       throw new Error('Invalid connection details received');
  //     }

  //     console.log('🔗 Connecting to OnBoardSoft...');
  //     await room.connect(conn.serverUrl, conn.participantToken);
  //     console.log('✅ Connected successfully.');

  //     await room.localParticipant.setMicrophoneEnabled(true, undefined, {
  //       preConnectBuffer: appConfig.isPreConnectBufferEnabled,
  //     });

  //     setConnecting(false);
  //     setConnected(true);
  //     setIsMuted(false);
  //     setShowDialer(false);
  //   } catch (err: unknown) {
  //     setConnecting(false);
  //     const error = err instanceof Error ? err.message : String(err);
  //     console.error('❌ Connection error:', err);
  //     setError({
  //       title: 'Failed to connect to agent',
  //       description: error,
  //     });
  //   }
  // };

  const handleEndCall = async () => {
    try {
      await room.disconnect();
      setConnected(false);
      setCallDuration(0);
      setIsMuted(false);
    } catch (err) {
      console.error('❌ Disconnect error:', err);
    }
  };

  /** ─────────────── MUTE TOGGLE ─────────────── **/
  const handleToggleMute = async () => {
    try {
      const newMutedState = !isMuted;
      await room.localParticipant.setMicrophoneEnabled(!newMutedState);
      setIsMuted(newMutedState);
      console.log(newMutedState ? '🔇 Microphone muted' : '🔊 Microphone unmuted');
    } catch (err) {
      console.error('❌ Error toggling mute:', err);
      setError({
        title: 'Failed to toggle microphone',
        description: err instanceof Error ? err.message : String(err),
      });
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
    if (connected && isMuted) return 'Muted – Click to unmute';
    if (connected) return 'Connected – Speak now';
    return 'Available 24/7';
  };

  const getFooterStatus = () => {
    if (connecting) return { color: '#e5b832', text: 'Connecting to agent...' };
    if (connected && isMuted) return { color: '#ef4444', text: 'Microphone is muted' };
    if (connected) return { color: '#1dc46b', text: 'Agent is online and ready' };
    return { color: '#9ca3af', text: 'Agent is available' };
  };

  const footer = getFooterStatus();

  // ✅ Fixed Phone formatting helper - allows proper deletion
  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters
    const phoneNumber = value.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX
    if (phoneNumber.length === 0) {
      return '';
    } else if (phoneNumber.length <= 3) {
      return phoneNumber; // ✅ Just numbers, no parenthesis yet
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  // Format dialer number for display
  const formatDialerDisplay = (num: string) => {
    const cleaned = num.replace(/\D/g, '');
    if (cleaned.length === 0) return '';
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  /** ─────────────── RENDER ─────────────── **/
  return (
    <RoomContext.Provider value={room}>
      <RoomAudioRenderer />
      <StartAudio label="Start Audio" />

      {/* 🟢 Floating Mic Launcher - Smaller */}
      <div
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '17px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: 'var(--va-theme)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          cursor: 'pointer',
          zIndex: 9999,
          transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        }}
        onClick={handleTogglePopup}
        onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 6px 16px var(--va-theme)')}
        onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)')}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </div>

      {/* Modal Container - More compact positioning */}
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
        className={cn('fixed right-4 z-50 md:right-5', !popupOpen && 'pointer-events-none')}
        style={{
          bottom: '150px',
          left: 'auto',
          maxHeight: 'calc(100vh - 180px)',
          width: '95vw',
          maxWidth: '420px',
        }}
      >
        {popupOpen && (
          <>
            {/* 📋 FORM VIEW */}
            {showForm && formEnabled ? (
              <div
                className="ml-auto w-full overflow-hidden rounded-[18px] border-2 shadow-2xl"
                style={{
                  backgroundColor: '#0f172a',
                  borderColor: '#1e293b',
                  width: '100%',
                  maxWidth: '360px',
                }}
              >
                {/* Close Button */}
                <button
                  aria-label="Close"
                  onClick={handleTogglePopup}
                  className="absolute top-3 right-3 z-10 text-white transition-opacity hover:opacity-70"
                  style={{ fontSize: '13px' }}
                >
                  ✕
                </button>

                <div className="px-5 py-5">
                  {/* Icon - Smaller */}
                  <div className="mb-3 flex justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--va-theme)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>

                  {/* Title - Smaller */}
                  <h2 className="mb-2 text-center text-lg font-bold text-white">
                    Connect with {agentName}
                  </h2>
                  <p className="mb-4 text-center text-xs text-gray-400">
                    Provide your information to start your consultation
                  </p>

                  {/* Form - Compact spacing */}
                  <form onSubmit={handleFormSubmit} className="space-y-3">
                    {/* Full Name */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-white">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#6b7280"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="absolute top-1/2 left-3 -translate-y-1/2 transform"
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Enter your full name"
                          value={formData.fullName}
                          onChange={(e) => {
                            setFormData({ ...formData, fullName: e.target.value });
                            if (formErrors.fullName) {
                              setFormErrors({ ...formErrors, fullName: '' });
                            }
                          }}
                          required
                          className="w-full rounded-lg border border-[#334155] bg-[#1e293b] py-2 pr-3 pl-9 text-sm text-white placeholder-gray-500 transition-colors focus:border-[var(--va-theme)] focus:outline-none"
                        />
                      </div>
                      {/* {formErrors.fullName && (
                        <p className="mt-1 text-xs text-red-500">{formErrors.fullName}</p>
                      )} */}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-white">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#6b7280"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="absolute top-1/2 left-3 -translate-y-1/2 transform"
                        >
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <path d="m2 7 10 7 10-7" />
                        </svg>
                        <input
                          type="email"
                          placeholder="your.email@company.com"
                          value={formData.email}
                          onChange={(e) => {
                            setFormData({ ...formData, email: e.target.value });
                            if (formErrors.email) {
                              setFormErrors({ ...formErrors, email: '' });
                            }
                          }}
                          required
                          className="w-full rounded-lg border border-[#334155] bg-[#1e293b] py-2 pr-3 pl-9 text-sm text-white placeholder-gray-500 transition-colors focus:border-[var(--va-theme)] focus:outline-none"
                        />
                      </div>
                      {/* {formErrors.email && (
                        <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>
                      )} */}
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-white">
                        USA Phone Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#6b7280"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="absolute top-1/2 left-3 -translate-y-1/2 transform"
                        >
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        <input
                          type="tel"
                          placeholder="(555) 123-4567"
                          value={formData.phone}
                          onChange={(e) => {
                            const formattedPhone = formatPhoneNumber(e.target.value);
                            setFormData({ ...formData, phone: formattedPhone });
                            if (formErrors.phone) {
                              setFormErrors({ ...formErrors, phone: '' });
                            }
                          }}
                          maxLength={14}
                          required
                          className="w-full rounded-lg border border-[#334155] bg-[#1e293b] py-2 pr-3 pl-9 text-sm text-white placeholder-gray-500 transition-colors focus:border-[var(--va-theme)] focus:outline-none"
                        />
                      </div>
                      {/* {formErrors.phone && (
                        <p className="mt-1 text-xs text-red-500">{formErrors.phone}</p>
                      )} */}
                      {/* <p className="mt-1 text-xs text-gray-500">USA phone numbers only</p> */}
                    </div>

                    {/* Privacy Notice - Compact */}
                    {/* Privacy Notice - only show when there's no success/error */}
                    {!error && (
                      <div className="flex items-start gap-2 rounded-lg border border-[#334155] bg-[#1e293b] p-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--va-theme)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mt-0.5 flex-shrink-0"
                        >
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        <p className="text-xs leading-relaxed text-gray-400">
                          Your information is protected and will only be used to connect you with{' '}
                          {agentName}.
                        </p>
                      </div>
                    )}

                    {/* Success / Error Message */}
                    {error && (
                      <div
                        className={`mt-2 rounded-lg border p-2 ${
                          error.title === 'Success'
                            ? 'border-green-500/20 bg-green-500/10 text-green-400'
                            : 'border-red-500/20 bg-red-500/10 text-red-400'
                        }`}
                      >
                        <p className="text-xs">{error.description}</p>
                      </div>
                    )}

                    {/* Submit Button - Compact */}
                    <button
                      type="submit"
                      disabled={isSubmittingForm}
                      className="w-full rounded-lg py-2.5 text-sm font-semibold text-[#fff] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      style={{
                        backgroundColor: 'var(--va-theme)',
                      }}
                    >
                      {isSubmittingForm ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg
                            className="animate-spin"
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        `Start Consultation`
                      )}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              /* 🎙️ VOICE CHAT VIEW */
              <div
                className="ml-auto w-full overflow-hidden rounded-[18px] border border-[#2a2a2a] bg-[#000] text-white shadow-2xl"
                style={{
                  minHeight: '470px',
                  maxHeight: 'calc(100vh - 180px)',
                  width: '95vw',
                  maxWidth: '420px', // same as your desktop widget size
                }}
              >
                {/* Header - Compact */}
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{
                    backgroundColor: 'var(--va-theme)',
                    color: '#fff',
                    borderTopLeftRadius: '16px',
                    borderTopRightRadius: '16px',
                  }}
                >
                  <div className="flex items-center gap-2">
                    {showDialer ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    ) : isMuted ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="1" y1="1" x2="23" y2="23" />
                        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                    )}
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm font-semibold">
                        {showDialer ? 'Enter Number' : agentName}
                      </span>
                      <span className="text-xs font-normal text-[#fff] opacity-75">
                        {showDialer ? 'Use dial pad below' : getHeaderStatus()}
                      </span>
                    </div>
                  </div>
                  <button
                    aria-label="Close"
                    className="text-base leading-none font-normal transition-opacity hover:opacity-70"
                    onClick={handleTogglePopup}
                  >
                    ✕
                  </button>
                </div>

                {/* Body - Compact */}
                <div
                  className="relative flex flex-col items-center justify-between px-5 py-5 text-center"
                  style={{ minHeight: '420px' }}
                >
                  {showDialer ? (
                    /* 📞 DIALER VIEW */
                    <div className="flex w-full flex-col items-center">
                      {/* Display - Compact */}
                      <div className="mb-4 w-full max-w-[380px]">
                        <div className="relative flex h-11 items-center justify-center rounded-lg border border-[#334155] bg-[#1e293b] px-3">
                          {/* +1 prefix displayed inline */}
                          <span className="absolute left-3 text-sm text-gray-400 select-none">
                            +1
                          </span>
                          <input
                            id="dialerInput"
                            ref={(el) => {
                              if (el && showDialer) setTimeout(() => el.focus(), 150);
                            }}
                            type="tel"
                            inputMode="numeric"
                            placeholder="Enter US number"
                            value={formatDialerDisplay(dialerNumber)}
                            onChange={(e) => {
                              const cleaned = e.target.value.replace(/\D/g, '');
                              setDialerNumber(cleaned.slice(0, 10)); // always 10-digit US format
                            }}
                            onFocus={(e) => {
                              const val = e.target.value;
                              e.target.setSelectionRange(val.length, val.length);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Backspace') {
                                e.preventDefault();
                                setDialerNumber((prev) => prev.slice(0, -1));
                              } else if (/^[0-9]$/.test(e.key)) {
                                e.preventDefault();
                                if (dialerNumber.length < 10) {
                                  setDialerNumber((prev) => prev + e.key);
                                }
                              } else if (e.key === 'Enter') {
                                e.preventDefault();
                                if (dialerNumber.length === 10) {
                                  handleDialerCall();
                                }
                              }
                            }}
                            className="w-full bg-transparent pl-7 text-center font-mono text-lg text-white focus:outline-none"
                            style={{ caretColor: 'var(--va-theme)' }}
                          />
                          {dialerNumber && (
                            <button
                              onClick={handleDialerBackspace}
                              className="absolute right-2 text-gray-400 transition-colors hover:text-white"
                              aria-label="Backspace"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                                <line x1="18" y1="9" x2="12" y2="15" />
                                <line x1="12" y1="9" x2="18" y2="15" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <p className="mt-1 text-center text-xs text-gray-500">
                          US phone numbers only
                        </p>
                      </div>

                      {connected ? (
                        <>
                          {/* Timer - Compact */}
                          <div className="mx-auto mb-4 w-full rounded-md border border-[#334155] bg-[#1e293b] px-3 py-3 text-center">
                            <div className="mb-1 text-xs tracking-wide text-gray-400">
                              Call Duration
                            </div>
                            <div className="font-mono text-2xl leading-tight font-medium text-white">
                              {Math.floor(callDuration / 60)}:
                              {String(callDuration % 60).padStart(2, '0')}
                            </div>
                            {callStatus && (
                              <div className="mt-1 text-xs text-gray-400">Status: {callStatus}</div>
                            )}
                          </div>

                          {/* End Call Button */}
                          <button
                            onClick={handleEndCallDialer}
                            className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#ef4444] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#dc2626]"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                            <span>End Call</span>
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Number Pad */}
                          <div className="mb-4 grid w-full max-w-[380px] grid-cols-3 gap-2">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                              <button
                                key={digit}
                                onClick={() => handleDialerClick(digit)}
                                className="flex h-12 items-center justify-center rounded-lg border border-[#334155] bg-[#1e293b] text-xl font-semibold text-white transition-all hover:border-[var(--va-theme)] hover:bg-[#334155]"
                              >
                                {digit}
                              </button>
                            ))}
                            <div></div>
                            <button
                              onClick={() => handleDialerClick('0')}
                              className="flex h-12 items-center justify-center rounded-lg border border-[#334155] bg-[#1e293b] text-xl font-semibold text-white transition-all hover:border-[var(--va-theme)] hover:bg-[#334155]"
                            >
                              0
                            </button>
                            <div></div>
                          </div>

                          {/* ✅ Smart Call/Error Button */}
                          {error ? (
                            <button
                              onClick={() => {
                                setError(null);
                                setIsCalling(false);
                              }}
                              className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#ef4444] py-3 text-sm font-semibold text-white shadow transition-all hover:bg-[#dc2626]"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="animate-pulse"
                              >
                                <path d="M18.364 5.636L5.636 18.364M5.636 5.636l12.728 12.728" />
                              </svg>
                              <span>Call couldn’t be placed — Try Again</span>
                            </button>
                          ) : (
                            <button
                              onClick={handleDialerCall}
                              disabled={dialerNumber.length < 10 || connecting}
                              className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-[#fff] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                              style={{ backgroundColor: 'var(--va-theme)' }}
                            >
                              {isCalling ? (
                                <>
                                  <svg
                                    className="animate-spin"
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                  </svg>
                                  <span>Connecting...</span>
                                </>
                              ) : (
                                <>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                  </svg>
                                  <span>Place Call</span>
                                </>
                              )}
                            </button>
                          )}

                          {/* Back Button */}
                          <button
                            onClick={() => {
                              setShowDialer(false);
                              setDialerNumber('');
                              setError(null);
                            }}
                            className="text-xs text-gray-400 transition-colors hover:text-white"
                          >
                            ← Back to Voice Chat
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    /* 🎙️ VOICE CHAT VIEW */
                    <div className="flex w-full flex-col items-center">
                      {/* Microphone Icon - Compact */}
                      <div className="relative mt-6 mb-6">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="52"
                          height="52"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={isMuted && connected ? '#ef4444' : 'var(--va-theme)'}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ transition: 'stroke 0.3s ease' }}
                        >
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                          <line x1="12" y1="19" x2="12" y2="23" />
                          <line x1="8" y1="23" x2="16" y2="23" />
                        </svg>
                        {isMuted && connected && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="72"
                            height="72"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                            }}
                          >
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        )}
                      </div>

                      <h2 className="mb-1 text-xl font-semibold text-white">Talk</h2>
                      <p className="mb-4 max-w-sm px-2 text-sm leading-relaxed text-gray-300">
                        Experience our advanced {agentName} voice agent with real-time conversation
                        capabilities.
                      </p>

                      {!connected ? (
                        <>
                          {/* Two Buttons - Compact */}
                          <div className="mb-8 flex w-full gap-3">
                            <button
                              onClick={handleStartCall}
                              disabled={connecting}
                              className="flex flex-1 items-center justify-center gap-2 rounded-lg py-3.5 text-sm font-semibold text-[#fff] transition-all hover:opacity-90"
                              style={{
                                backgroundColor: 'var(--va-theme)',
                                opacity: connecting ? 0.9 : 1,
                                cursor: connecting ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {connecting ? (
                                <>
                                  <svg
                                    className="animate-spin"
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                  </svg>
                                  <span>Connecting...</span>
                                </>
                              ) : (
                                <>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                    <line x1="12" y1="19" x2="12" y2="23" />
                                    <line x1="8" y1="23" x2="16" y2="23" />
                                  </svg>
                                  <span>START CALL</span>
                                </>
                              )}
                            </button>

                            {config?.phoneSid && config?.sipTrunkId && config?.phoneNumber && (
                              <button
                                onClick={() => {
                                  setShowDialer(true);
                                  setError(null);
                                }}
                                disabled={connecting}
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-semibold transition-all hover:bg-[#1e293b]"
                                style={{
                                  borderColor: 'var(--va-theme)',
                                  color: 'var(--va-theme)',
                                  cursor: connecting ? 'not-allowed' : 'pointer',
                                  opacity: connecting ? 0.5 : 1,
                                }}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                                  <circle cx="8" cy="14" r="1" />
                                  <circle cx="12" cy="14" r="1" />
                                  <circle cx="16" cy="14" r="1" />
                                  <circle cx="8" cy="18" r="1" />
                                  <circle cx="12" cy="18" r="1" />
                                  <circle cx="16" cy="18" r="1" />
                                </svg>
                                <span>Dial</span>
                              </button>
                            )}
                          </div>

                          {error && (
                            <div className="w-full rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-center">
                              <h4 className="text-sm font-semibold text-red-400">
                                {error.title || 'Connection Error'}
                              </h4>
                              <p className="mt-1 text-xs text-red-300">
                                We couldn’t connect to the AI agent. Please try again.
                              </p>
                            </div>
                          )}
                          {/* 🟡 Footer-style Twilio Notice */}
                          {/* {!(config?.phoneSid && config?.sipTrunkId && config?.phoneNumber) && (
                            <div
                              className="mt-6 w-full rounded-md border-t border-[#2a2a2a] bg-[#0f172a] px-4 py-3 text-center text-[11px] leading-relaxed text-gray-400"
                              style={{
                                borderTopColor: 'rgba(255,255,255,0.08)',
                                borderRadius: '0 0 18px 18px',
                              }}
                            >
                              <p>
                                <span className="font-medium text-[var(--va-theme)]">
                                  Dial feature disabled
                                </span>{' '}
                                — Attach a Twilio number in{' '}
                                <strong>Agent Configuration → Twilio Section</strong> to enable
                                outbound calling.
                              </p>
                            </div>
                          )} */}
                        </>
                      ) : (
                        <>
                          {/* Call Duration - Compact */}
                          <div className="mx-auto mb-4 w-full rounded-md border border-[#334155] bg-[#1e293b] px-3 py-3 text-center">
                            <div className="mb-1 text-xs tracking-wide text-gray-400">
                              Call Duration
                            </div>
                            <div className="font-mono text-2xl leading-tight font-medium text-white">
                              {Math.floor(callDuration / 60)}:
                              {String(callDuration % 60).padStart(2, '0')}
                            </div>
                          </div>

                          {/* End Call Button - Compact */}
                          <button
                            onClick={handleEndCall}
                            className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#ef4444] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#dc2626]"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                            <span>End Call</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Mute Button - Compact */}
                  {connected && !showDialer && (
                    <div className="absolute bottom-6 left-5">
                      <button
                        onClick={handleToggleMute}
                        className="flex items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition-all"
                        style={{
                          backgroundColor: isMuted ? '#ef4444' : 'transparent',
                          borderColor: isMuted ? '#ef4444' : '#334155',
                          color: isMuted ? 'white' : '#9ca3af',
                        }}
                        title={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted ? (
                          <>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <line x1="1" y1="1" x2="23" y2="23" />
                              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                              <line x1="12" y1="19" x2="12" y2="23" />
                              <line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                            <span>Muted</span>
                          </>
                        ) : (
                          <>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                              <line x1="12" y1="19" x2="12" y2="23" />
                              <line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                            <span>Mute</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer - Compact */}
                <div className="flex items-center justify-center gap-2 border-t border-[#2a2a2a] py-2 text-xs">
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: footer.color }}
                  ></div>
                  <span style={{ color: footer.color }}>{footer.text}</span>
                </div>

                <ErrorMessage error={error} />
              </div>
            )}
          </>
        )}
      </motion.div>
    </RoomContext.Provider>
  );
}

export default AgentClient;
