(function initVAWidget() {
  // Load CryptoJS if not available in browser
  if (typeof CryptoJS === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js';
    script.async = false; // Ensure it loads before continuing
    document.head.appendChild(script);
  }

  // Wait until CryptoJS is ready, then start widget
  const waitForCrypto = setInterval(() => {
    if (typeof CryptoJS !== 'undefined') {
      clearInterval(waitForCrypto);
      startWidget();
    }
  }, 50);

  function startWidget() {
    const VERSION = 'v3.3.4';
    console.log(`[OnBoardSoft Widget] Loaded ${VERSION}`);

    const SECRET_KEY = '3kCGIDgZCRlTAZNnzGDBD0nYtMGgNAhU';

    // --- Helper for URL-safe base64 decode ---
    function fromUrlSafeBase64(str) {
      return str.replace(/-/g, '+').replace(/_/g, '/');
    }

    // --- AES Decrypt Telephony Token ---
    function decryptTelephonyData(token) {
      try {
        const decoded = fromUrlSafeBase64(token);
        const bytes = CryptoJS.AES.decrypt(decoded, SECRET_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        const [phone_sid, sip_trunk_id, phone_number] = decrypted.split('|');
        return { phone_sid, sip_trunk_id, phone_number };
      } catch (err) {
        console.warn('[VA Widget] Invalid or missing telephony-token:', err);
        return {};
      }
    }

    // =====================================================
    // Define Custom Element <va-widget>
    // =====================================================
    class VAWidget extends HTMLElement {
      constructor() {
        super();
        this.iframe = null;
      }

      connectedCallback() {
        const appUrl = this.getAttribute('app-url') || 'https://vosoaidemo.convoso.com/embed';
        const agentName = this.getAttribute('agent-name') || 'Betty';
        const theme = this.getAttribute('theme') || '#724cfb';
        const agentId = this.getAttribute('agent-id') || '';
        const agentRoom = this.getAttribute('agent-room') || 'voso_room';
        const formEnabled = this.getAttribute('form-enabled') || 'No';
        const telephonyToken = this.getAttribute('telephony-token') || '';
        const domainName = this.getAttribute('domain-name') || '';

        console.log('domainName: ', domainName);

        let phoneSid = '',
          sipTrunkId = '',
          phoneNumber = '';

        // --- Decrypt token if available ---
        if (telephonyToken) {
          const data = decryptTelephonyData(telephonyToken);
          console.log('Decrypted Telephony Data:', data);
          phoneSid = data.phone_sid || '';
          sipTrunkId = data.sip_trunk_id || '';
          phoneNumber = data.phone_number || '';
        }

        // --- Build iframe URL with params ---
        const url = new URL(appUrl);
        url.searchParams.set('agentName', agentName);
        url.searchParams.set('theme', theme);
        url.searchParams.set('form_enabled', formEnabled);
        if (agentId) url.searchParams.set('agentId', agentId);
        if (agentRoom) url.searchParams.set('agentRoom', agentRoom);
        if (phoneSid) url.searchParams.set('phoneSid', phoneSid);
        if (sipTrunkId) url.searchParams.set('sipTrunkId', sipTrunkId);
        if (phoneNumber) url.searchParams.set('phoneNumber', phoneNumber);
        if (domainName) url.searchParams.set('domainName', domainName);
        url.searchParams.set('_t', Date.now().toString());

        // --- Create iframe element ---
        this.iframe = document.createElement('iframe');
        this.iframe.src = url.toString();
        this.iframe.allow = 'microphone *; autoplay *';
        this.iframe.style.cssText = `
          all: initial;
          position: fixed;
          bottom: 0;
          right: 0;
          width: 100px;
          height: 100px;
          border: none;
          z-index: 9999;
          pointer-events: auto;
          background: transparent;
          overflow: visible;
          transition: width 0.3s ease, height 0.3s ease;
        `;
        this.iframe.setAttribute('data-widget-iframe', 'true');
        document.body.appendChild(this.iframe);

        // --- Handle widget open/close messages ---
        window.addEventListener('message', (event) => {
          if (event.source !== this.iframe.contentWindow) return;

          if (event.data.type === 'WIDGET_OPENED') {
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            let width, height;

            if (viewportWidth < 768) {
              width = 'calc(100vw - 32px)';
              height = Math.min(600, viewportHeight - 100) + 'px';
            } else {
              width = '360px';
              height = Math.min(600, viewportHeight - 100) + 'px';
            }

            this.iframe.style.width = width;
            this.iframe.style.height = height;
            this.iframe.style.maxWidth = '360px';
            this.iframe.style.right = viewportWidth < 768 ? '16px' : '0';
          } else if (event.data.type === 'WIDGET_CLOSED') {
            this.iframe.style.width = '100px';
            this.iframe.style.height = '100px';
            this.iframe.style.right = '0';
            this.iframe.style.maxWidth = 'none';
          }
        });

        // --- Responsive Resizing ---
        window.addEventListener('resize', () => {
          if (this.iframe && this.iframe.style.width !== '100px') {
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            if (viewportWidth < 768) {
              this.iframe.style.width = 'calc(100vw - 32px)';
              this.iframe.style.height = Math.min(600, viewportHeight - 100) + 'px';
              this.iframe.style.right = '16px';
            } else {
              this.iframe.style.width = '360px';
              this.iframe.style.height = Math.min(600, viewportHeight - 100) + 'px';
              this.iframe.style.right = '0';
            }
            this.iframe.style.maxWidth = '360px';
          }
        });

        console.log('[VA Widget] Initialized with', {
          agentName,
          agentId,
          agentRoom,
          theme,
          formEnabled,
          phoneSid,
          sipTrunkId,
          phoneNumber,
          hasTelephonyToken: !!telephonyToken,
          domainName,
        });
      }

      disconnectedCallback() {
        if (this.iframe) document.body.removeChild(this.iframe);
      }
    }

    // --- Register Custom Element ---
    if (!customElements.get('va-widget')) {
      customElements.define('va-widget', VAWidget);
    }
  }
})();
