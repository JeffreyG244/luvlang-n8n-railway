import React from 'react';
import { Button } from '@/components/ui/button';

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800 text-white">
      <div className="container mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-8">Executive Dashboard</h1>
        <p className="text-xl mb-8">Welcome to your LuvLang dashboard!</p>
        <Button className="bg-pink-600 hover:bg-pink-700">
          View Matches
        </Button>
      </div>
    </div>
  );
};

export default Dashboard;