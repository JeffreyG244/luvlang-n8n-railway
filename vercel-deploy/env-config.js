// Environment configuration for LuvLang Mastering
// Set these values in Vercel Dashboard -> Settings -> Environment Variables

window.__ENV__ = {
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: '',
    STRIPE_PUBLIC_KEY: ''
};

if (!window.__ENV__.SUPABASE_URL) {
    console.warn('Environment variables not configured. Set them in Vercel Dashboard.');
}
