const express = require('express');
const path = require('path');
const app = express();

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Serve static files from dist directory - NO CACHE
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: 0,
  etag: false,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
}));

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    version: 'Executive Dashboard v2.0',
    timestamp: new Date().toISOString()
  });
});

// Handle React Router (send all requests to index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Railway requirement

app.listen(PORT, HOST, () => {
  console.log(`🚂 LuvLang Executive Dashboard server running on ${HOST}:${PORT}`);
  console.log(`🎨 Theme: Deep Purple Gradient Professional`);
  console.log(`📸 Photo Upload: Enabled`);
  console.log(`🔒 Security: Enhanced`);
});