
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Upload, User, Settings, LogOut, Camera, MapPin, Briefcase, GraduationCap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `profile-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      toast({
        title: "Success!",
        description: "Photo uploaded successfully",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const ProfileSetupSection = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="border-purple-200/20 bg-gradient-to-br from-purple-50/10 to-pink-50/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <User className="h-5 w-5" />
            Complete Your Executive Profile
          </CardTitle>
          <CardDescription>
            Set up your profile to start connecting with other executives
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src="/placeholder-avatar.jpg" />
              <AvatarFallback className="bg-purple-100 text-purple-700">
                <User className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div>
              <Label
                htmlFor="photo-upload"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Camera className="h-4 w-4" />
                {isUploading ? 'Uploading...' : 'Upload Photo'}
              </Label>
              <Input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={isUploading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-3 h-4 w-4 text-purple-400" />
                <Input id="company" placeholder="Your company name" className="pl-10" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input id="position" placeholder="Your executive position" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="education">Education</Label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-3 h-4 w-4 text-purple-400" />
                <Input id="education" placeholder="Your highest education" className="pl-10" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-purple-400" />
                <Input id="location" placeholder="Your location" className="pl-10" />
              </div>
            </div>
          </div>

          <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
            Save Profile
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800">
      <div className="container mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <div className="flex items-center space-x-3">
            <Heart className="h-8 w-8 text-pink-400" />
            <h1 className="text-3xl font-bold text-white">Executive Dashboard</h1>
          </div>
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/10 backdrop-blur-sm">
            <TabsTrigger value="profile" className="text-white data-[state=active]:bg-white/20">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="matches" className="text-white data-[state=active]:bg-white/20">
              <Heart className="h-4 w-4 mr-2" />
              Matches
            </TabsTrigger>
            <TabsTrigger value="photos" className="text-white data-[state=active]:bg-white/20">
              <Upload className="h-4 w-4 mr-2" />
              Photos
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-white data-[state=active]:bg-white/20">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <TabsContent value="profile" className="space-y-6">
              <ProfileSetupSection />
            </TabsContent>

            <TabsContent value="matches" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border-purple-200/20 bg-white/10 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Your Matches</CardTitle>
                    <CardDescription className="text-purple-200">
                      Connect with other executives in your area
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12 text-purple-200">
                      <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Complete your profile to start seeing matches</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="photos" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border-purple-200/20 bg-white/10 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Photo Management</CardTitle>
                    <CardDescription className="text-purple-200">
                      Upload and manage your profile photos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed border-purple-300/50 rounded-lg p-8 text-center">
                      <Upload className="h-12 w-12 mx-auto mb-4 text-purple-300" />
                      <Label
                        htmlFor="photo-upload-main"
                        className="cursor-pointer text-purple-200 hover:text-white transition-colors"
                      >
                        Click to upload photos or drag and drop
                      </Label>
                      <Input
                        id="photo-upload-main"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border-purple-200/20 bg-white/10 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Account Settings</CardTitle>
                    <CardDescription className="text-purple-200">
                      Manage your account preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-white">Email Notifications</Label>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">Enabled</Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Privacy Settings</Label>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">Private</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
