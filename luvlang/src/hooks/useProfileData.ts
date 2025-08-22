
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface ProfileData {
  bio: string;
  values: string;
  lifeGoals: string;
  greenFlags: string;
}

export const useProfileData = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData>({
    bio: '',
    values: '',
    lifeGoals: '',
    greenFlags: ''
  });
  const [profileExists, setProfileExists] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadProfile = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('bio, photo_urls')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return;
      }

      if (data) {
        setProfileExists(true);
        setProfileData({
          bio: data.bio || '',
          values: '',
          lifeGoals: '',
          greenFlags: ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async (showSuccessToast = true) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to save your profile.',
        variant: 'destructive'
      });
      return { success: false };
    }

    if (isSaving) {
      return { success: false };
    }

    setIsSaving(true);
    try {
      const profilePayload = {
        user_id: user.id,
        email: user.email || '',
        bio: profileData.bio,
        photo_urls: [],
        updated_at: new Date().toISOString()
      };

      let result;
      if (profileExists) {
        result = await supabase
          .from('profiles')
          .update(profilePayload)
          .eq('user_id', user.id);
      } else {
        result = await supabase
          .from('profiles')
          .insert([{
            ...profilePayload,
            created_at: new Date().toISOString()
          }]);
      }

      if (result.error) {
        console.error('Database error:', result.error);
        toast({
          title: 'Save Failed',
          description: 'Failed to save profile. Please try again.',
          variant: 'destructive'
        });
        return { success: false };
      }

      setProfileExists(true);
      
      if (showSuccessToast) {
        toast({
          title: 'Profile Saved',
          description: 'Your profile has been saved successfully!',
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Unexpected Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive'
      });
      return { success: false };
    } finally {
      setIsSaving(false);
    }
  };

  const updateProfileField = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const isBasicProfileComplete = () => {
    return profileData.bio.length >= 50 && 
           profileData.values.length >= 50 && 
           profileData.lifeGoals.length >= 50 && 
           profileData.greenFlags.length >= 50;
  };

  return {
    profileData,
    profileExists,
    isLoading,
    isSaving,
    loadProfile,
    saveProfile,
    updateProfileField,
    isBasicProfileComplete
  };
};
