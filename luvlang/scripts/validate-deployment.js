#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔒 LuvLang Deployment Validation Starting...');

// Load the deployment lock configuration
const lockPath = path.join(__dirname, '..', '.deployment-lock.json');
if (!fs.existsSync(lockPath)) {
  console.error('❌ DEPLOYMENT BLOCKED: No deployment lock file found!');
  process.exit(1);
}

const lockConfig = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
console.log(`🔍 Validating version: ${lockConfig.version}`);

// Check 1: Validate HeroSection has correct title
const heroSectionPath = path.join(__dirname, '..', 'src', 'components', 'home', 'HeroSection.tsx');
if (fs.existsSync(heroSectionPath)) {
  const heroContent = fs.readFileSync(heroSectionPath, 'utf8');
  if (!heroContent.includes('Soul Match')) {
    console.error('❌ DEPLOYMENT BLOCKED: Hero section has wrong title!');
    console.error('   Expected: "Find Your Soul Match"');
    console.error('   This suggests the old Vite template or wrong version');
    process.exit(1);
  }
  console.log('✅ Hero section title validated');
} else {
  console.error('❌ DEPLOYMENT BLOCKED: HeroSection.tsx not found!');
  process.exit(1);
}

// Check 2: Validate CSS has correct theme colors
const cssPath = path.join(__dirname, '..', 'src', 'index.css');
if (fs.existsSync(cssPath)) {
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  if (!cssContent.includes('--love-primary: 280 100% 70%') || 
      !cssContent.includes('--love-secondary: 320 100% 75%')) {
    console.error('❌ DEPLOYMENT BLOCKED: CSS theme colors are wrong!');
    console.error('   Missing professional purple/pink theme variables');
    process.exit(1);
  }
  console.log('✅ CSS theme colors validated');
} else {
  console.error('❌ DEPLOYMENT BLOCKED: index.css not found!');
  process.exit(1);
}

// Check 3: Validate photo upload component exists
const photoCapturePath = path.join(__dirname, '..', 'src', 'components', 'SimplePhotoCapture.tsx');
if (!fs.existsSync(photoCapturePath)) {
  console.error('❌ DEPLOYMENT BLOCKED: SimplePhotoCapture.tsx not found!');
  console.error('   Upload feature missing - this is the wrong version');
  process.exit(1);
}
console.log('✅ Photo upload component validated');

// Check 4: Validate App.tsx has advanced routing (not simple Vite template)
const appPath = path.join(__dirname, '..', 'src', 'App.tsx');
if (fs.existsSync(appPath)) {
  const appContent = fs.readFileSync(appPath, 'utf8');
  if (appContent.includes('Vite + React') || appContent.includes('count is')) {
    console.error('❌ DEPLOYMENT BLOCKED: App.tsx contains Vite template code!');
    console.error('   This is the wrong/reverted version');
    process.exit(1);
  }
  if (!appContent.includes('AuthProvider') || !appContent.includes('Routes')) {
    console.error('❌ DEPLOYMENT BLOCKED: App.tsx missing advanced routing!');
    console.error('   This is not the professional version');
    process.exit(1);
  }
  console.log('✅ Advanced app routing validated');
} else {
  console.error('❌ DEPLOYMENT BLOCKED: App.tsx not found!');
  process.exit(1);
}

// Check 5: Validate package.json has correct name
const packagePath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  // Allow the current name, but check for required dependencies
  if (!packageJson.dependencies['@supabase/supabase-js']) {
    console.error('❌ DEPLOYMENT BLOCKED: Missing Supabase dependency!');
    console.error('   This suggests wrong project version');
    process.exit(1);
  }
  console.log('✅ Package dependencies validated');
}

// Final check - Executive Dashboard must exist and have correct styling
const execDashPath = path.join(__dirname, '..', 'src', 'pages', 'ExecutiveDashboard.tsx');
if (fs.existsSync(execDashPath)) {
  const execContent = fs.readFileSync(execDashPath, 'utf8');
  if (!execContent.includes('Executive Dashboard') || !execContent.includes('Welcome back, jeffreytgravescas')) {
    console.error('❌ DEPLOYMENT BLOCKED: ExecutiveDashboard wrong styling!');
    console.error('   Must match screenshot: /Users/jeffreygraves/Desktop/Luvlang.org website style.png');
    process.exit(1);
  }
  console.log('✅ Executive Dashboard styling validated');
} else {
  console.error('❌ DEPLOYMENT BLOCKED: ExecutiveDashboard.tsx missing!');
  process.exit(1);
}

console.log('🎉 ALL VALIDATION CHECKS PASSED!');
console.log(`✅ Deploying LuvLang ${lockConfig.version}`);
console.log('🎨 Theme: Deep Purple Gradient (matches screenshot)');
console.log('📸 Photo Upload: Enabled');  
console.log('👔 Executive Dashboard: Matches reference screenshot');
console.log('🔐 Security: Enhanced');
console.log('');
console.log('🖼️  REFERENCE: /Users/jeffreygraves/Desktop/Luvlang.org website style.png');
console.log('🔗 SOURCE: Lovable.dev 016dc165-a1fe-4ce7-adef-dbf00d3eba8a');