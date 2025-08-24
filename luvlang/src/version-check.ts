// 🔒 VERSION VERIFICATION - DO NOT REMOVE
// This ensures we're deploying the correct LuvLang version

export const LUVLANG_VERSION = {
  name: "LuvLang Professional",
  version: "2.0.0",
  theme: "deep-purple-pink",
  features: {
    photoUpload: true,
    professionalTheme: true,
    advancedRouting: true,
    supabaseIntegration: true
  },
  heroTitle: "Find Your Soul Match",
  deployment: {
    source: "lovable-dev",
    projectId: "016dc165-a1fe-4ce7-adef-dbf00d3eba8a",
    locked: true
  }
};

// Validation function to prevent wrong deployments
export const validateVersion = () => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') return true;
  
  // Check for Vite template artifacts (wrong version indicators)
  const body = document.body.innerHTML;
  const hasViteTemplate = body.includes('Vite + React') || body.includes('count is');
  
  if (hasViteTemplate) {
    console.error('🚨 WRONG VERSION DETECTED: Vite template found!');
    console.error('This is NOT the professional LuvLang version');
    return false;
  }
  
  console.log('✅ Version validated: LuvLang Professional v2.0');
  return true;
};

// Auto-validate on import
if (typeof window !== 'undefined') {
  setTimeout(validateVersion, 1000);
}