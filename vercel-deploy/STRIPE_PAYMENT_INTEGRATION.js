/**
 * LUVLANG LEGENDARY - STRIPE PAYMENT & FILE DELIVERY INTEGRATION
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Purpose: Secure payment processing and file delivery for mastered audio
 * Security: Zero-trust architecture with signed URLs and JWT verification
 * Flow: Master → Buy/Download → Payment → Webhook → Signed URL → Download
 *
 * Features:
 * - Checks if user has already paid for file
 * - Creates Stripe checkout session via Vercel serverless endpoint
 * - Handles payment verification
 * - Generates 60-second signed download URLs
 * - Shows loading states during webhook processing
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOWNLOAD MASTER - Main entry point for file delivery
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function downloadMaster() {
    try {

        // Show loading state
        showPaymentModal('Preparing secure payment...');

        // ──────────────────────────────────────────────────────────────────
        // 1. CHECK IF USER IS AUTHENTICATED (optional — Supabase may not be loaded)
        // ──────────────────────────────────────────────────────────────────

        var user = null;
        if (window.supabase && window.supabase.auth) {
            try {
                var authResult = await window.supabase.auth.getUser();
                user = authResult.data ? authResult.data.user : null;
            } catch (e) {
                console.warn('Auth check skipped:', e.message);
            }
        }

        // ──────────────────────────────────────────────────────────────────
        // 2. CREATE STRIPE CHECKOUT SESSION
        //    No file upload needed — Stripe only needs tier + metadata.
        //    The actual mastered file export happens AFTER payment.
        // ──────────────────────────────────────────────────────────────────

        const tier = window.selectedTier || 'basic';
        const filename = window.currentAudioFilename || 'untitled';
        const targetLUFS = window.analysisResults?.integratedLUFS || -14;
        const truePeak = window.analysisResults?.maxPeak || 0;
        const genre = window.selectedPreMasterGenre || 'unknown';
        const platform = getSelectedPlatform();

        const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tier: tier,
                sessionData: {
                    filename: filename,
                    userId: user ? user.id : '',
                    targetLUFS: targetLUFS,
                    truePeak: truePeak,
                    genre: genre,
                    platform: platform,
                    premiumEffects: window.premiumEffects || null,
                },
                successUrl: window.location.origin + '/?session_id={CHECKOUT_SESSION_ID}',
                cancelUrl: window.location.origin + '/',
            }),
        });

        if (!response.ok) {
            const errBody = await response.json().catch(function() { return {}; });
            throw new Error(errBody.error || 'Failed to create checkout session');
        }

        const data = await response.json();

        if (!data.url) {
            throw new Error('No checkout URL returned');
        }

        hidePaymentModal();

        // ──────────────────────────────────────────────────────────────────
        // 3. REDIRECT TO STRIPE CHECKOUT
        // ──────────────────────────────────────────────────────────────────

        window.location.href = data.url;

    } catch (error) {
        console.error('❌ Error in downloadMaster:', error);
        hidePaymentModal();
        if (typeof showLuvLangToast === 'function') {
            showLuvLangToast(error.message || 'An error occurred. Please try again.');
        }
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CREATE CHECKOUT SESSION - Call Vercel Serverless Endpoint
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function createCheckoutSession(filePath) {
    try {
        // Get current user session
        const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();

        if (sessionError || !session) {
            throw new Error('Please sign in to purchase');
        }

        // Get original filename and metadata
        const originalFilename = window.currentAudioFilename || 'mastered_track.wav';
        const metadata = {
            genre: window.selectedPreMasterGenre || 'unknown',
            platform: getSelectedPlatform(),
            lufs: window.analysisResults?.integratedLUFS,
            true_peak: window.analysisResults?.maxPeak,
        };

        // Call Vercel serverless endpoint
        const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
                tier: window.selectedTier || 'basic',
                sessionData: {
                    file_path: filePath,
                    filename: originalFilename,
                    userId: session.user.id,
                    targetLUFS: metadata.lufs,
                    truePeak: metadata.true_peak,
                    genre: metadata.genre,
                    platform: metadata.platform,
                },
                successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
                cancelUrl: `${window.location.origin}/cancel`,
            }),
        });

        if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            throw new Error(errBody.error || 'Failed to create checkout session');
        }

        const data = await response.json();

        if (!data.url) {
            throw new Error('No checkout URL returned');
        }

        return data.url;

    } catch (error) {
        console.error('❌ Error creating checkout:', error);
        throw error;
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Get current file path from storage or create one
 */
async function getCurrentFilePath() {
    // If we have a stored file path from a previous upload, use it
    if (window.currentMasterFilePath) {
        return window.currentMasterFilePath;
    }

    // Otherwise, upload the current buffer to storage first
    if (!window.audioBuffer) {
        return null;
    }

    try {
        // Generate unique file path
        const { data: { user } } = await window.supabase.auth.getUser();
        if (!user) return null;

        const timestamp = Date.now();
        const filename = window.currentAudioFilename || 'audio';
        const filePath = `${user.id}/${timestamp}_${filename}`;

        // Export to WAV
        const wavData = await exportToWAV(audioBuffer);

        // Upload to Supabase Storage
        const { data, error } = await window.supabase.storage
            .from('masters')
            .upload(filePath, wavData, {
                contentType: 'audio/wav',
                upsert: false,
            });

        if (error) {
            console.error('❌ Upload error:', error);
            throw error;
        }

        // Store for future use
        window.currentMasterFilePath = filePath;

        return filePath;

    } catch (error) {
        console.error('❌ Error uploading file:', error);
        throw error;
    }
}

/**
 * Get selected platform for LUFS targeting
 */
function getSelectedPlatform() {
    const activeBtn = document.querySelector('.selector-btn[data-platform].active');
    return activeBtn ? activeBtn.getAttribute('data-platform') : 'spotify';
}

/**
 * Export audio buffer to WAV format
 * CRITICAL: Uses exportMasteredWAV to render audio through the FULL mastering chain
 * This ensures the exported file sounds EXACTLY like the preview
 */
async function exportToWAV(buffer) {
    // ALWAYS use exportMasteredWAV to render through the mastering chain
    // This is critical - the original buffer is UNPROCESSED
    if (typeof window.exportMasteredWAV === 'function') {

        return await window.exportMasteredWAV();
    }

    // Fallback warning - this should never happen in production
    console.warn('⚠️ exportMasteredWAV not available - falling back to unprocessed export');
    console.warn('   The exported file will NOT have mastering applied!');

    // Fallback: Basic WAV export (UNPROCESSED - not recommended)
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 24;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;

    const data = [];
    for (let i = 0; i < numberOfChannels; i++) {
        data.push(buffer.getChannelData(i));
    }

    const dataLength = data[0].length * numberOfChannels * bytesPerSample;
    const bufferLength = 44 + dataLength;
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    // WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // Write interleaved audio data
    let offset = 44;
    for (let i = 0; i < data[0].length; i++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const sample = Math.max(-1, Math.min(1, data[channel][i]));
            const intSample = sample < 0 ? sample * 0x800000 : sample * 0x7FFFFF;
            view.setInt32(offset, intSample, true);
            offset += 3; // 24-bit
        }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UI FEEDBACK FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function showPaymentModal(message) {
    let modal = document.getElementById('paymentModal');

    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'paymentModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            min-width: 300px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        `;

        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        spinner.style.cssText = 'margin: 0 auto 20px; width: 50px; height: 50px; border: 3px solid rgba(255,255,255,0.3); border-top-color: #00d4ff; border-radius: 50%; animation: spin 1s linear infinite;';
        const msgEl = document.createElement('div');
        msgEl.id = 'paymentMessage';
        msgEl.style.cssText = 'color: white; font-size: 1rem;';
        msgEl.textContent = message;
        content.appendChild(spinner);
        content.appendChild(msgEl);

        modal.appendChild(content);
        document.body.appendChild(modal);

        // Add spinner animation
        const style = document.createElement('style');
        style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(style);
    } else {
        modal.style.display = 'flex';
        document.getElementById('paymentMessage').textContent = message;
    }
}

function updatePaymentModal(message) {
    const messageEl = document.getElementById('paymentMessage');
    if (messageEl) {
        messageEl.textContent = message;
    }
}

function hidePaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function showAuthModal() {
    (typeof showLuvLangToast==='function'?showLuvLangToast('Please sign in to purchase and download your master.\n\nClick the "Sign In" button in the top right corner.'):void 0);
    // Or show your actual auth modal
}

function showSuccessToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.9), rgba(184, 79, 255, 0.9));
        color: white;
        padding: 16px 24px;
        border-radius: 10px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 10001;
        font-size: 0.9rem;
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PAYMENT SUCCESS HANDLER (for redirect from Stripe)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handlePaymentSuccess() {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (!sessionId) return;

    showPaymentModal('Verifying payment...');

    // Poll for order completion with exponential backoff
    let attempts = 0;
    const maxAttempts = 15;
    const OVERALL_TIMEOUT = 30000; // 30 seconds
    const startTime = Date.now();

    const checkOrder = async () => {
        attempts++;

        // Overall timeout guard
        if (Date.now() - startTime > OVERALL_TIMEOUT) {
            hidePaymentModal();
            (typeof showLuvLangToast==='function'?showLuvLangToast('Payment verification timed out. Your payment was received — please refresh the page or try downloading again.'):void 0);
            return;
        }

        try {
            const { data: orders, error } = await window.supabase
                .from('orders')
                .select('*')
                .eq('stripe_session_id', sessionId)
                .eq('status', 'completed')
                .single();

            if (error || !orders) {
                if (attempts < maxAttempts) {
                    // Exponential backoff: 1s, 1.5s, 2.25s, ...
                    const delay = Math.min(1000 * Math.pow(1.5, attempts - 1), 5000);
                    updatePaymentModal(`Verifying payment... (${attempts}/${maxAttempts})`);
                    setTimeout(checkOrder, delay);
                } else {
                    hidePaymentModal();
                    (typeof showLuvLangToast==='function'?showLuvLangToast('Payment verification is taking longer than expected. Please check your email or try downloading again.'):void 0);
                }
                return;
            }

            // Order confirmed!
            hidePaymentModal();
            showSuccessToast('Payment verified! You can now download your master.');

            // Clear URL params
            window.history.replaceState({}, document.title, window.location.pathname);

            // Auto-trigger download
            setTimeout(() => {
                downloadMaster();
            }, 1000);
        } catch (err) {
            console.error('Payment verification error:', err);
            if (attempts < maxAttempts) {
                const delay = Math.min(1000 * Math.pow(1.5, attempts - 1), 5000);
                setTimeout(checkOrder, delay);
            } else {
                hidePaymentModal();
                (typeof showLuvLangToast==='function'?showLuvLangToast('Payment verification failed. Please refresh the page and try again.'):void 0);
            }
        }
    };

    await checkOrder();
}

// Wire exportMasteredWAV to performExport so Stripe integration gets mastered audio
// performExport is defined in the main HTML and renders through the full wet chain
if (typeof window.exportMasteredWAV !== 'function') {
    window.exportMasteredWAV = async function() {
        // Use the mastered buffer (post-processing) if available
        var buf = window.masteredAudioBuffer || window.audioBuffer;
        if (!buf) {
            throw new Error('No audio buffer available for export');
        }
        // Render to WAV blob using the mastered buffer
        var numberOfChannels = buf.numberOfChannels;
        var sampleRate = buf.sampleRate;
        var bitDepth = 24;
        var bytesPerSample = bitDepth / 8;
        var blockAlign = numberOfChannels * bytesPerSample;
        var channelArrays = [];
        for (var ch = 0; ch < numberOfChannels; ch++) {
            channelArrays.push(buf.getChannelData(ch));
        }
        var dataLength = channelArrays[0].length * numberOfChannels * bytesPerSample;
        var bufferLength = 44 + dataLength;
        var arrayBuffer = new ArrayBuffer(bufferLength);
        var view = new DataView(arrayBuffer);
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + dataLength, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);
        writeString(view, 36, 'data');
        view.setUint32(40, dataLength, true);
        var offset = 44;
        for (var i = 0; i < channelArrays[0].length; i++) {
            for (var c = 0; c < numberOfChannels; c++) {
                var sample = Math.max(-1, Math.min(1, channelArrays[c][i]));
                var intSample = sample < 0 ? sample * 0x800000 : sample * 0x7FFFFF;
                view.setInt32(offset, intSample, true);
                offset += 3;
            }
        }
        return new Blob([arrayBuffer], { type: 'audio/wav' });
    };
}

// Check for payment success on page load
if (window.location.search.includes('session_id')) {
    window.addEventListener('DOMContentLoaded', handlePaymentSuccess);
}

