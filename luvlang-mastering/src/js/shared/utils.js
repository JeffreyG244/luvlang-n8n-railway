/**
 * LUVLANG MASTERING - SHARED UTILITIES
 * Common functions used across multiple components
 */

// ============================================
// TOAST NOTIFICATIONS
// ============================================

/**
 * Show a toast notification
 * @param {string} message - Text to display
 * @param {Object} options - Configuration
 * @param {string} options.className - CSS class for styling (default: 'luvlang-toast')
 * @param {number} options.duration - Duration in ms (default: 3000)
 * @param {string} options.type - 'info' | 'success' | 'error' | 'warning'
 */
export function showToast(message, options = {}) {
    const {
        className = 'luvlang-toast',
        duration = 3000,
        type = 'info'
    } = options;

    let toast = document.querySelector(`.${className}`);

    if (!toast) {
        toast = document.createElement('div');
        toast.className = className;
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.dataset.type = type;
    toast.classList.add('show');

    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// ============================================
// CONTAINER RESOLUTION
// ============================================

/**
 * Resolve a container reference (string selector or DOM element)
 * @param {string|HTMLElement} container - Selector string or DOM element
 * @returns {HTMLElement|null}
 */
export function resolveContainer(container) {
    if (typeof container === 'string') {
        return document.querySelector(container);
    }
    return container instanceof HTMLElement ? container : null;
}

// ============================================
// CONDITIONAL LOGGING
// ============================================

const _isDev = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
);

export const log = {
    // eslint-disable-next-line no-console
    info: (...args) => _isDev && console.log('[LuvLang]', ...args),
    warn: (...args) => console.warn('[LuvLang]', ...args),
    error: (...args) => console.error('[LuvLang]', ...args),
    // eslint-disable-next-line no-console
    debug: (...args) => _isDev && console.log('[LuvLang:debug]', ...args),
};

// ============================================
// SAFE FETCH WITH TIMEOUT
// ============================================

/**
 * Fetch with timeout and error handling
 * @param {string} url
 * @param {Object} options - Standard fetch options + timeout
 * @param {number} options.timeout - Timeout in ms (default: 10000)
 */
export async function safeFetch(url, options = {}) {
    const { timeout = 10000, ...fetchOptions } = options;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal
        });
        return response;
    } finally {
        clearTimeout(timer);
    }
}

// ============================================
// HTML ESCAPING
// ============================================

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - Raw string
 * @returns {string} Escaped string safe for innerHTML
 */
export function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ============================================
// DOM UTILITIES
// ============================================

/**
 * Safely set text content (XSS-safe alternative to innerHTML)
 */
export function setText(element, text) {
    if (element) element.textContent = text;
}

/**
 * Create an element with attributes and children
 */
export function createElement(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'className') el.className = value;
        else if (key === 'dataset') Object.assign(el.dataset, value);
        else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), value);
        else el.setAttribute(key, value);
    }
    for (const child of children) {
        if (typeof child === 'string') el.appendChild(document.createTextNode(child));
        else if (child) el.appendChild(child);
    }
    return el;
}
