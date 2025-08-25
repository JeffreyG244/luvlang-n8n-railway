import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { profileFormConfig } from "@/data/profileFormData";
import { supabase } from '../lib/supabase';
import { User, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

const ProfileForm = () => {
  const [formData, setFormData] = useState({});
  const [currentSection, setCurrentSection] = useState(0);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  // Load user and profile data on component mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting user:', userError);
        return;
      }
      
      if (!user) {
        console.log('No authenticated user found');
        setLoading(false);
        return;
      }
      
      setUser(user);
      
      // Load existing profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error loading profile:', profileError);
      } else if (profile) {
        // Map database fields to form fields
        const mappedData = {
          firstName: profile.first_name,
          lastName: profile.last_name,
          age: profile.age?.toString(),
          industry: profile.job_title,
          location: profile.location,
          // Add other mappings as needed
          ...profile.profile_data // If we store extended data as JSON
        };
        setFormData(mappedData);
      }
      
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) {
      alert('Please log in to save your profile');
      return;
    }
    
    try {
      setSaving(true);
      setSaveStatus(null);
      
      // Prepare comprehensive profile data for database and N8N matching
      const profileData = {
        id: user.id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        age: formData.age ? parseInt(formData.age) : null,
        job_title: formData.industry,
        company: formData.company || 'Professional Services',
        location: formData.location,
        bio: formData.bio || `${formData.successLevel || 'Professional'} in ${formData.industry || 'various fields'}. ${formData.personalityType ? `MBTI: ${formData.personalityType}. ` : ''}${formData.coreValues ? `Values: ${formData.coreValues.slice(0,3).join(', ')}.` : ''}`,
        interests: formData.weekendActivities || [],
        education: formData.education || `${formData.successLevel} background`,
        membership_type: 'premium', // All new users get premium
        profile_complete: true,
        is_active: true,
        profile_data: {
          // Core demographics for N8N
          age: formData.age,
          location: formData.location,
          successLevel: formData.successLevel,
          lifestyleLevel: formData.lifestyleLevel,
          industry: formData.industry,
          
          // Psychology for compatibility
          personalityType: formData.personalityType,
          attachmentStyle: formData.attachmentStyle,
          loveLanguage: formData.loveLanguage,
          conflictResolution: formData.conflictResolution,
          communicationStyle: formData.communicationStyle,
          
          // Dating preferences for matching
          sexualOrientation: formData.sexualOrientation,
          relationshipStyle: formData.relationshipStyle,
          interestedIn: formData.interestedIn,
          datingIntentions: formData.datingIntentions,
          dealBreakers: formData.dealBreakers,
          preferredAgeMin: formData.preferredAgeMin,
          preferredAgeMax: formData.preferredAgeMax,
          distancePreference: formData.distancePreference,
          
          // Values and lifestyle for deep matching
          politicalViews: formData.politicalViews,
          religiousViews: formData.religiousViews,
          familyPlans: formData.familyPlans,
          livingArrangement: formData.livingArrangement,
          coreValues: formData.coreValues,
          languages: formData.languages,
          
          // Interests and activities
          weekendActivities: formData.weekendActivities,
          culturalInterests: formData.culturalInterests,
          intellectualPursuits: formData.intellectualPursuits,
          vacationStyle: formData.vacationStyle,
          
          // Timestamps for N8N workflows
          profileCreatedAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          
          // Matching optimization flags
          readyForMatching: true,
          dataCompleteness: Object.keys(formData).length,
          priorityLevel: formData.successLevel === 'business-owner' || formData.successLevel === 'investor' ? 'high' : 'standard'
        },
        updated_at: new Date().toISOString()
      };
      
      // Upsert profile (insert or update)
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData, { 
          onConflict: 'id',
          returning: 'minimal'
        });
      
      if (error) {
        throw error;
      }
      
      // Trigger N8N matching workflow for new complete profiles
      try {
        const webhookUrl = 'https://luvlang.org/webhook/luvlang-match';
        const matchingData = {
          user_id: user.id,
          email: user.email,
          profile_complete: true,
          matching_data: {
            age: profileData.age,
            location: profileData.location,
            industry: profileData.job_title,
            success_level: formData.successLevel,
            personality_type: formData.personalityType,
            interests: formData.weekendActivities,
            dating_intentions: formData.datingIntentions,
            preferred_age_range: {
              min: formData.preferredAgeMin,
              max: formData.preferredAgeMax
            },
            distance_preference: formData.distancePreference,
            values: formData.coreValues,
            lifestyle_level: formData.lifestyleLevel,
            ready_for_matching: true,
            timestamp: new Date().toISOString()
          }
        };
        
        // Send to N8N workflow (non-blocking)
        fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(matchingData)
        }).catch(err => {
          console.log('N8N webhook notification sent (or attempted):', err.message);
        });
        
      } catch (webhookError) {
        console.log('N8N webhook trigger attempted:', webhookError.message);
      }
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
      
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveStatus('error');
      alert(`Failed to save profile: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleMultiselectChange = (fieldId, value, limit) => {
    setFormData(prev => {
      const currentValues = prev[fieldId] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : limit && currentValues.length >= limit
        ? currentValues
        : [...currentValues, value];
      
      return { ...prev, [fieldId]: newValues };
    });
  };

  const renderField = (field) => {
    const value = formData[field.id] || (field.type === 'multiselect' ? [] : '');

    switch (field.type) {
      case 'text':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-white">
              {field.label} {field.required && <span className="text-red-400">*</span>}
            </Label>
            <Input
              id={field.id}
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              className="bg-white/10 border-white/20 text-white placeholder-purple-300"
              required={field.required}
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-white">
              {field.label} {field.required && <span className="text-red-400">*</span>}
            </Label>
            <Select value={value} onValueChange={(val) => handleInputChange(field.id, val)}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options.map((option) => (
                  <SelectItem 
                    key={typeof option === 'string' ? option : option.value} 
                    value={typeof option === 'string' ? option : option.value}
                  >
                    {typeof option === 'string' ? option : option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'multiselect':
        return (
          <div key={field.id} className="space-y-3">
            <Label className="text-white">
              {field.label} {field.required && <span className="text-red-400">*</span>}
            </Label>
            <div className="flex flex-wrap gap-2">
              {field.options.map((option) => {
                const isSelected = value.includes(option);
                const isDisabled = field.limit && !isSelected && value.length >= field.limit;
                
                return (
                  <Badge
                    key={option}
                    variant={isSelected ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-purple-500 text-white border-purple-400' 
                        : isDisabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'bg-white/10 text-purple-200 border-white/20 hover:bg-white/20'
                    }`}
                    onClick={() => !isDisabled && handleMultiselectChange(field.id, option, field.limit)}
                  >
                    {option}
                  </Badge>
                );
              })}
            </div>
            {field.limit && (
              <p className="text-purple-300 text-sm">
                {value.length}/{field.limit} selected
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const currentSectionData = profileFormConfig.sections[currentSection];

  // Show loading spinner while loading user data
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 flex items-center justify-center">
        <Card className="bg-white/5 border-white/10 p-8 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <h2 className="text-xl font-semibold text-white">Loading Your Profile...</h2>
            <p className="text-purple-300">Fetching your information securely</p>
          </div>
        </Card>
      </div>
    );
  }

  // Show authentication required if no user
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 flex items-center justify-center">
        <Card className="bg-white/5 border-white/10 p-8 text-center max-w-md">
          <div className="space-y-4">
            <User className="w-16 h-16 text-purple-400 mx-auto" />
            <h2 className="text-xl font-semibold text-white">Authentication Required</h2>
            <p className="text-purple-300">Please log in to access your profile settings</p>
            <Button 
              onClick={() => window.location.href = '/auth'}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              Go to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with User Info */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Executive Profile Setup</h1>
          <p className="text-purple-200">Welcome {user.email} - Let's build your professional profile</p>
          
          {/* Save Status */}
          {saveStatus && (
            <div className={`mt-4 p-3 rounded-lg flex items-center justify-center space-x-2 ${
              saveStatus === 'success' ? 'bg-green-500/20 border border-green-400/30' : 'bg-red-500/20 border border-red-400/30'
            }`}>
              {saveStatus === 'success' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span className="text-green-300">Profile saved successfully!</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-300">Error saving profile. Please try again.</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Section Navigation */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-2">
            {profileFormConfig.sections.map((section, index) => (
              <Button
                key={section.id}
                variant={index === currentSection ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentSection(index)}
                className={index === currentSection 
                  ? "bg-purple-500 text-white" 
                  : "border-white/20 text-purple-200 hover:bg-white/10"
                }
              >
                {index + 1}. {section.title}
              </Button>
            ))}
          </div>
        </div>

        {/* Current Section */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-2xl">{currentSectionData.title}</CardTitle>
            <CardDescription className="text-purple-200">
              {currentSectionData.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentSectionData.fields.map(renderField)}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setCurrentSection(prev => Math.max(0, prev - 1))}
            disabled={currentSection === 0}
            className="border-white/20 text-purple-200 hover:bg-white/10"
          >
            Previous
          </Button>
          
          <div className="flex space-x-4">
            {/* Save Button */}
            <Button
              onClick={saveProfile}
              disabled={saving}
              variant="outline"
              className="border-green-400/50 text-green-300 hover:bg-green-500/20"
            >
              {saving ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Save className="w-4 h-4" />
                  <span>Save Progress</span>
                </div>
              )}
            </Button>
            
            {/* Next/Complete Button */}
            <Button
              onClick={() => {
                if (currentSection === profileFormConfig.sections.length - 1) {
                  // Save profile when completing
                  saveProfile();
                } else {
                  setCurrentSection(prev => prev + 1);
                }
              }}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              {currentSection === profileFormConfig.sections.length - 1 ? 'Complete Profile' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileForm;
