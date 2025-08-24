import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Settings } from "lucide-react";

const ExecutiveDashboard = () => {
  return (
    <div className="min-h-screen" style={{ 
      background: 'linear-gradient(135deg, #1e1b4b 0%, #581c87 50%, #7c3aed 100%)'
    }}>
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-blue-600 flex items-center justify-center">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-400 to-blue-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">❤️</span>
            </div>
          </div>
          <div>
            <h1 className="text-white text-2xl font-semibold">Executive Dashboard</h1>
            <p className="text-purple-200 text-sm">Your professional dating command center</p>
          </div>
        </div>
        
        {/* Top Right Controls */}
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
            Basic
          </Badge>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 pb-8">
        {/* Welcome Section */}
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-4">
            Welcome back, jeffreytgravescas!
          </h2>
          <p className="text-purple-200 text-lg">
            Ready to find your perfect match? Choose what you'd like to do next.
          </p>
        </div>

        {/* Logo Circle */}
        <div className="flex justify-center mb-16">
          <div className="w-48 h-48 rounded-full bg-purple-600/30 backdrop-blur-sm flex items-center justify-center">
            <div className="w-32 h-32 rounded-2xl bg-black/80 flex flex-col items-center justify-center">
              <div className="w-12 h-12 mb-2">
                <div className="w-full h-full rounded-lg bg-gradient-to-br from-pink-400 to-blue-500 flex items-center justify-center">
                  <span className="text-2xl">❤️</span>
                </div>
              </div>
              <span className="text-white font-semibold tracking-wider">LUV LANG</span>
            </div>
          </div>
        </div>

        {/* Executive Profile Section */}
        <div className="text-center max-w-4xl mx-auto">
          <h3 className="text-4xl font-bold text-white mb-6">
            Complete Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">Executive Profile</span>
          </h3>
          <p className="text-purple-200 text-lg leading-relaxed">
            Set up your professional interests, personality traits, and preferences to find sophisticated matches who share your values and lifestyle.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;