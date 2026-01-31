#!/usr/bin/env node
/**
 * BUILD-TIME ENVIRONMENT VARIABLE INJECTION
 *
 * This script runs during Vercel build to inject environment variables
 * into a config file that the client can safely read.
 *
 * Only PUBLIC variables should be included here (anon keys, URLs).
 * NEVER include service role keys or secrets!
 */

const fs = require('fs');
const path = require('path');

// Read environment variables (set in Vercel dashboard)
const config = {
    SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
    STRIPE_PUBLIC_KEY: process.env.STRIPE_PUBLIC_KEY || process.env.VITE_STRIPE_PUBLIC_KEY || '',
    // Add other PUBLIC keys as needed
};

// Validate required variables
const missing = [];
if (!config.SUPABASE_URL) missing.push('SUPABASE_URL');
if (!config.SUPABASE_ANON_KEY) missing.push('SUPABASE_ANON_KEY');

if (missing.length > 0) {
    console.warn('⚠️  Missing environment variables:', missing.join(', '));
    console.warn('   Set these in Vercel Dashboard → Settings → Environment Variables');
    console.warn('   Using fallback/empty values for now.');
}

// Generate the config file
const configContent = `// AUTO-GENERATED - DO NOT EDIT MANUALLY
// Generated at build time from environment variables
// Last build: ${new Date().toISOString()}

window.__ENV__ = {
    SUPABASE_URL: '${config.SUPABASE_URL}',
    SUPABASE_ANON_KEY: '${config.SUPABASE_ANON_KEY}',
    STRIPE_PUBLIC_KEY: '${config.STRIPE_PUBLIC_KEY}'
};

console.log('✅ Environment config loaded');
`;

// Write to env-config.js
const outputPath = path.join(__dirname, 'env-config.js');
fs.writeFileSync(outputPath, configContent);

console.log('✅ Environment config generated:', outputPath);
console.log('   SUPABASE_URL:', config.SUPABASE_URL ? '✓ Set' : '✗ Missing');
console.log('   SUPABASE_ANON_KEY:', config.SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing');
console.log('   STRIPE_PUBLIC_KEY:', config.STRIPE_PUBLIC_KEY ? '✓ Set' : '✗ Missing');
