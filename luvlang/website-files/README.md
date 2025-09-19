# LuvLang - Modern Dating App

A modern React-based dating application built with TypeScript, React Router, and Supabase.

## Features

- **Modern React Architecture**: Built with React 18 and TypeScript
- **Client-side Routing**: React Router DOM with protected routes
- **Authentication**: Supabase Auth with email/password and OAuth support
- **Responsive Design**: Tailwind CSS with mobile-first approach
- **State Management**: TanStack React Query for server state
- **Real-time**: Supabase real-time capabilities
- **Error Handling**: React Error Boundary for graceful error handling
- **Toast Notifications**: Sonner for user feedback

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Routing**: React Router DOM v6
- **State Management**: TanStack React Query
- **Backend**: Supabase (Authentication, Database, Storage)
- **Build Tool**: Vite
- **Icons**: Lucide React
- **Notifications**: Sonner

## Project Structure

```
src/
├── components/
│   └── AuthGuard.tsx          # Protected route wrapper
├── lib/
│   └── supabase.ts           # Supabase client configuration
├── pages/
│   ├── Index.tsx             # Landing page
│   ├── Auth.tsx              # Login/Register page
│   └── Dashboard.tsx         # Main app dashboard
├── App.tsx                   # Main app component with routing
├── main.tsx                  # App entry point
├── index.css                 # Global styles
└── vite-env.d.ts            # Vite type definitions
```

## Setup Instructions

1. **Clone and Install**:
   ```bash
   npm install
   ```

2. **Environment Configuration**:
   Copy `.env.example` to `.env` and update with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Development**:
   ```bash
   npm run dev
   ```

4. **Build for Production**:
   ```bash
   npm run build
   ```

## Routes

- `/` - Landing page with app introduction
- `/auth` - Authentication page (login/register)
- `/dashboard` - Protected main app dashboard

## Deployment

The `dist/` folder contains the production build ready for deployment to any static hosting service:

- `_redirects` file included for client-side routing support
- Optimized bundle with code splitting
- All assets properly hashed for caching

## Features to Implement

- User profiles and photo uploads
- Matching algorithm
- Real-time messaging
- Geolocation-based matching
- Push notifications
- Advanced filters and preferences

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request