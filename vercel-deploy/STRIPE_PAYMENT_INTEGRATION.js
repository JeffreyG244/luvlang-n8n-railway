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
 * - Creates Stripe checkout session via Edge Function
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
        showPaymentModal('Checking payment status...');

        // ──────────────────────────────────────────────────────────────────
        // 1. CHECK IF USER IS AUTHENTICATED
        // ──────────────────────────────────────────────────────────────────

        const { data: { user }, error: authError } = await window.supabase.auth.getUser();

        if (authError || !user) {
            hidePaymentModal();
            showAuthModal();
            return;
        }

        // ──────────────────────────────────────────────────────────────────
        // 2. GET FILE PATH FROM STORAGE (or use processed buffer)
        // ──────────────────────────────────────────────────────────────────

        const filePath = await getCurrentFilePath();
        if (!filePath) {
            throw new Error('No mastered file to download. Please master your audio first.');
        }

        // ──────────────────────────────────────────────────────────────────
        // 3. CHECK IF USER HAS ALREADY PAID
        // ──────────────────────────────────────────────────────────────────

        const { data: orders, error: checkError } = await window.supabase
            .from('orders')
            .select('*')
            .eq('user_id', user.id)
            .eq('file_path', filePath)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(1);

        if (checkError) {
            console.error('❌ Error checking order status:', checkError);
            throw new Error('Failed to check payment status');
        }

        // ──────────────────────────────────────────────────────────────────
        // 4. IF PAID → GENERATE SIGNED URL & DOWNLOAD
        // ──────────────────────────────────────────────────────────────────

        if (orders && orders.length > 0) {

            updatePaymentModal('Generating secure download link...');

            // Generate 60-second signed URL
            const { data: signedUrlData, error: urlError } = await window.supabase.storage
                .from('masters')
                .createSignedUrl(filePath, 60); // 60 seconds expiry

            if (urlError || !signedUrlData) {
                console.error('❌ Error creating signed URL:', urlError);
                throw new Error('Failed to generate download link');
            }

            // Start download
            const downloadUrl = signedUrlData.signedUrl;
            const originalFilename = orders[0].original_filename || 'mastered_track.wav';

            // Create temporary download link
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = originalFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            hidePaymentModal();
            showSuccessToast('Download started! Your file is ready.');

            return;
        }

        // ──────────────────────────────────────────────────────────────────
        // 5. IF NOT PAID → CREATE CHECKOUT SESSION
        // ──────────────────────────────────────────────────────────────────

        updatePaymentModal('Preparing secure payment...');

        const checkoutUrl = await createCheckoutSession(filePath);

        hidePaymentModal();

        // Redirect to Stripe Checkout
        window.location.href = checkoutUrl;

    } catch (error) {
        console.error('❌ Error in downloadMaster:', error);
        hidePaymentModal();
        (typeof showLuvLangToast==='function'?showLuvLangToast(error.message || 'An error occurred. Please try again.'):void 0);
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CREATE CHECKOUT SESSION - Call Edge Function
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
            genre: window.currentGenrePreset || 'unknown',
            platform: getSelectedPlatform(),
            lufs: window.analysisResults?.integratedLUFS,
            true_peak: window.analysisResults?.maxPeak,
        };

        // Call create-checkout Edge Function
        const { data, error } = await window.supabase.functions.invoke('create-checkout', {
            body: {
                file_path: filePath,
                original_filename: originalFilename,
                metadata: metadata,
                tier: window.selectedTier || 'basic',
            },
        });

        if (error) {
            console.error('❌ Checkout creation error:', error);
            throw new Error(error.message || 'Failed to create checkout session');
        }

        if (!data.session_url) {
            throw new Error('No checkout URL returned');
        }

        return data.session_url;

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
    if (!audioBuffer) {
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

        content.innerHTML = `
            <div class="spinner" style="margin: 0 auto 20px; width: 50px; height: 50px; border: 3px solid rgba(255,255,255,0.3); border-top-color: #00d4ff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <div id="paymentMessage" style="color: white; font-size: 1rem;">${message}</div>
        `;

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

    // Poll for order completion (webhook may take a few seconds)
    let attempts = 0;
    const maxAttempts = 10;

    const checkOrder = async () => {
        attempts++;

        const { data: orders, error } = await window.supabase
            .from('orders')
            .select('*')
            .eq('stripe_session_id', sessionId)
            .eq('status', 'completed')
            .single();

        if (error || !orders) {
            if (attempts < maxAttempts) {
                updatePaymentModal(`Verifying payment... (${attempts}/${maxAttempts})`);
                setTimeout(checkOrder, 1000); // Check again in 1 second
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
    };

    await checkOrder();
}

// Check for payment success on page load
if (window.location.search.includes('session_id')) {
    window.addEventListener('DOMContentLoaded', handlePaymentSuccess);
}

