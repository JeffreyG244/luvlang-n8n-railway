import React from 'react';
import { Button } from '@/components/ui/button';

const Auth = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8">Join LuvLang</h1>
        <p className="text-xl mb-8">Authentication coming soon...</p>
        <Button className="bg-pink-600 hover:bg-pink-700">
          Get Early Access
        </Button>
      </div>
    </div>
  );
};

export default Auth;