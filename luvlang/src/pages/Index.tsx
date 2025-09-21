import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Heart, Users, Shield, Zap } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800 text-white">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Heart className="h-8 w-8 text-pink-400" />
          <span className="text-2xl font-bold">LuvLang</span>
        </div>
        <div className="space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/auth')}
            className="text-white hover:bg-white/10"
          >
            Sign In
          </Button>
          <Button
            onClick={() => navigate('/auth')}
            className="bg-pink-600 hover:bg-pink-700"
          >
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-pink-200 bg-clip-text text-transparent">
            Find Your Executive Match
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-purple-100 max-w-3xl mx-auto">
            Connect with successful executives who share your values, ambitions, and lifestyle.
            Where professional excellence meets personal connection.
          </p>
          <div className="space-x-4">
            <Button
              size="lg"
              onClick={() => navigate('/auth')}
              className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-lg px-8 py-4"
            >
              Start Your Journey
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 text-lg px-8 py-4"
            >
              Learn More
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto"
        >
          <div className="text-center p-6 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
            <div className="text-3xl font-bold text-pink-400 mb-2">10,000+</div>
            <div className="text-purple-200">Verified Executives</div>
          </div>
          <div className="text-center p-6 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
            <div className="text-3xl font-bold text-pink-400 mb-2">95%</div>
            <div className="text-purple-200">Success Rate</div>
          </div>
          <div className="text-center p-6 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
            <div className="text-3xl font-bold text-pink-400 mb-2">50+</div>
            <div className="text-purple-200">Countries</div>
          </div>
        </motion.div>
      </div>

      {/* Features */}
      <div className="container mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">Why Choose LuvLang?</h2>
          <p className="text-xl text-purple-200 max-w-2xl mx-auto">
            Designed specifically for executives who value both professional success and meaningful relationships.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-center p-8 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20"
          >
            <Users className="h-16 w-16 text-pink-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-4">Executive Network</h3>
            <p className="text-purple-200">
              Connect with C-suite executives, entrepreneurs, and industry leaders who understand your lifestyle.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="text-center p-8 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20"
          >
            <Shield className="h-16 w-16 text-pink-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-4">Privacy First</h3>
            <p className="text-purple-200">
              Your privacy and discretion are paramount. All profiles are verified and confidential.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.0 }}
            className="text-center p-8 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20"
          >
            <Zap className="h-16 w-16 text-pink-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-4">Smart Matching</h3>
            <p className="text-purple-200">
              Our AI-powered algorithm considers your professional status, values, and relationship goals.
            </p>
          </motion.div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-6 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-4xl font-bold mb-6">Ready to Find Your Match?</h2>
          <p className="text-xl text-purple-200 mb-8">
            Join thousands of successful executives who have found meaningful connections through LuvLang.
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/auth')}
            className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-lg px-12 py-4"
          >
            Join LuvLang Today
          </Button>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 border-t border-white/20">
        <div className="text-center text-purple-200">
          <p>&copy; 2024 LuvLang. Connecting executives worldwide.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;