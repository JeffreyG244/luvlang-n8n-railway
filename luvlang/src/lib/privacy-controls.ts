import { supabase } from './supabase'
import { secureDB } from './secure-database'

export interface PrivacySettings {
  privacy_level: 'public' | 'private' | 'anonymous'
  show_age: boolean
  show_location: boolean
  show_professional_info: boolean
  show_education: boolean
  show_income_range: boolean
  allow_messages_from: 'everyone' | 'matches_only' | 'verified_only'
  show_online_status: boolean
  allow_profile_views: boolean
  share_interests: boolean
  show_last_active: boolean
}

export interface DatingPreferences {
  age_min: number
  age_max: number
  location_preference: string
  income_preference: string
  education_preference: string
  relationship_type: 'casual' | 'serious' | 'marriage' | 'networking'
  match_radius: number
}

export class PrivacyManager {
  
  // =================================================================
  // PRIVACY SETTINGS MANAGEMENT
  // =================================================================
  
  async getPrivacySettings(): Promise<PrivacySettings | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('dating_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found is OK
      console.error('Privacy settings fetch error:', error);
      return null;
    }

    return data ? {
      privacy_level: data.privacy_level || 'private',
      show_age: data.show_age ?? true,
      show_location: data.show_location ?? true,
      show_professional_info: data.show_professional_info ?? false,
      show_education: data.show_education ?? true,
      show_income_range: data.show_income_range ?? false,
      allow_messages_from: data.allow_messages_from || 'matches_only',
      show_online_status: data.show_online_status ?? true,
      allow_profile_views: data.allow_profile_views ?? true,
      share_interests: data.share_interests ?? true,
      show_last_active: data.show_last_active ?? false
    } : null;
  }

  async updatePrivacySettings(settings: Partial<PrivacySettings>): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Log privacy change for audit
    await secureDB.logSecurityEvent('privacy_settings_update', {
      table_name: 'dating_preferences',
      record_id: user.id,
      new_data: settings
    });

    const { error } = await supabase
      .from('dating_preferences')
      .upsert({
        user_id: user.id,
        ...settings,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Privacy settings update error:', error);
      throw new Error('Failed to update privacy settings');
    }

    return true;
  }

  // =================================================================
  // PROFILE VISIBILITY CONTROLS
  // =================================================================
  
  async setProfileVisibility(visibility: 'public' | 'private' | 'anonymous'): Promise<boolean> {
    return this.updatePrivacySettings({ privacy_level: visibility });
  }

  async hideFromSearch(hidden: boolean): Promise<boolean> {
    const visibility = hidden ? 'anonymous' : 'private';
    return this.setProfileVisibility(visibility);
  }

  async setOnlineStatusVisibility(visible: boolean): Promise<boolean> {
    return this.updatePrivacySettings({ show_online_status: visible });
  }

  // =================================================================
  // MESSAGING PRIVACY
  // =================================================================
  
  async setMessagePermissions(level: 'everyone' | 'matches_only' | 'verified_only'): Promise<boolean> {
    return this.updatePrivacySettings({ allow_messages_from: level });
  }

  async canUserMessage(senderId: string, receiverId: string): Promise<boolean> {
    // Get receiver's message permissions
    const { data: preferences } = await supabase
      .from('dating_preferences')
      .select('allow_messages_from')
      .eq('user_id', receiverId)
      .single();

    const messagePolicy = preferences?.allow_messages_from || 'matches_only';

    switch (messagePolicy) {
      case 'everyone':
        return true;
        
      case 'verified_only':
        // Check if sender is verified
        const { data: verification } = await supabase
          .from('verification_documents')
          .select('verification_status')
          .eq('user_id', senderId)
          .eq('verification_status', 'verified')
          .limit(1);
        
        return (verification?.length || 0) > 0;
        
      case 'matches_only':
      default:
        // Check if users have matched
        const { data: match } = await supabase
          .from('matches')
          .select('status')
          .or(`and(user1_id.eq.${senderId},user2_id.eq.${receiverId}),and(user1_id.eq.${receiverId},user2_id.eq.${senderId})`)
          .eq('status', 'accepted')
          .limit(1);
        
        return (match?.length || 0) > 0;
    }
  }

  // =================================================================
  // PROFESSIONAL INFO PRIVACY
  // =================================================================
  
  async setProfessionalInfoVisibility(visible: boolean): Promise<boolean> {
    return this.updatePrivacySettings({ show_professional_info: visible });
  }

  async setIncomeVisibility(visible: boolean): Promise<boolean> {
    return this.updatePrivacySettings({ show_income_range: visible });
  }

  async setEducationVisibility(visible: boolean): Promise<boolean> {
    return this.updatePrivacySettings({ show_education: visible });
  }

  // =================================================================
  // DATA ANONYMIZATION
  // =================================================================
  
  async anonymizeProfile(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Set maximum privacy settings
    const anonymousSettings: Partial<PrivacySettings> = {
      privacy_level: 'anonymous',
      show_age: false,
      show_location: false,
      show_professional_info: false,
      show_education: false,
      show_income_range: false,
      allow_messages_from: 'matches_only',
      show_online_status: false,
      allow_profile_views: false,
      share_interests: false,
      show_last_active: false
    };

    return this.updatePrivacySettings(anonymousSettings);
  }

  // =================================================================
  // PROFILE ACCESS CONTROLS
  // =================================================================
  
  async getFilteredProfile(targetUserId: string, viewerId?: string): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    const actualViewerId = viewerId || user?.id;
    
    if (!actualViewerId) {
      throw new Error('Viewer not authenticated');
    }

    // Check if viewer can access this profile
    const canView = await secureDB.validateUserAccess(targetUserId, 'view_profile');
    
    if (!canView) {
      return null;
    }

    // Get privacy settings for target user
    const privacySettings = await this.getPrivacySettingsForUser(targetUserId);
    
    // Get full profile
    const profile = await secureDB.getPublicProfile(targetUserId);
    
    if (!profile) {
      return null;
    }

    // Filter profile based on privacy settings
    return this.filterProfileData(profile, privacySettings, actualViewerId === targetUserId);
  }

  private async getPrivacySettingsForUser(userId: string): Promise<PrivacySettings | null> {
    const { data, error } = await supabase
      .from('dating_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      return null;
    }

    return {
      privacy_level: data.privacy_level || 'private',
      show_age: data.show_age ?? true,
      show_location: data.show_location ?? true,
      show_professional_info: data.show_professional_info ?? false,
      show_education: data.show_education ?? true,
      show_income_range: data.show_income_range ?? false,
      allow_messages_from: data.allow_messages_from || 'matches_only',
      show_online_status: data.show_online_status ?? true,
      allow_profile_views: data.allow_profile_views ?? true,
      share_interests: data.share_interests ?? true,
      show_last_active: data.show_last_active ?? false
    };
  }

  private filterProfileData(profile: any, privacy: PrivacySettings | null, isOwnProfile: boolean): any {
    if (isOwnProfile || !privacy) {
      return profile; // Return full profile for own profile or no privacy settings
    }

    const filtered = { ...profile };

    // Apply privacy filters
    if (!privacy.show_age) {
      delete filtered.age;
    }

    if (!privacy.show_location) {
      delete filtered.location;
    }

    if (!privacy.show_professional_info) {
      delete filtered.job_title;
      delete filtered.company_name;
      delete filtered.industry;
    }

    if (!privacy.show_education) {
      delete filtered.education_level;
      delete filtered.university;
    }

    if (!privacy.show_income_range) {
      delete filtered.salary_range;
      delete filtered.net_worth_range;
    }

    if (!privacy.share_interests) {
      delete filtered.interests;
    }

    if (!privacy.allow_profile_views) {
      // Return minimal profile
      return {
        id: filtered.id,
        first_name: filtered.first_name,
        bio: 'Profile private'
      };
    }

    return filtered;
  }

  // =================================================================
  // GDPR COMPLIANCE
  // =================================================================
  
  async exportUserData(): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Export all user data for GDPR compliance
    const [profile, professional, preferences, messages, matches] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('professional_info').select('*').eq('user_id', user.id),
      supabase.from('dating_preferences').select('*').eq('user_id', user.id),
      supabase.from('messages').select('*').eq('sender_id', user.id),
      supabase.from('matches').select('*').or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    ]);

    return {
      export_date: new Date().toISOString(),
      user_id: user.id,
      profile: profile.data,
      professional_info: professional.data,
      dating_preferences: preferences.data,
      sent_messages: messages.data,
      matches: matches.data
    };
  }

  async deleteAllUserData(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Log data deletion for audit
    await secureDB.logSecurityEvent('user_data_deletion', {
      table_name: 'all_tables',
      record_id: user.id
    });

    // Delete user data in correct order (respecting foreign keys)
    const deletions = [
      supabase.from('messages').delete().eq('sender_id', user.id),
      supabase.from('matches').delete().or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
      supabase.from('phone_verifications').delete().eq('user_id', user.id),
      supabase.from('verification_documents').delete().eq('user_id', user.id),
      supabase.from('professional_info').delete().eq('user_id', user.id),
      supabase.from('dating_preferences').delete().eq('user_id', user.id),
      supabase.from('profiles').delete().eq('id', user.id)
    ];

    try {
      await Promise.all(deletions);
      
      // Delete user account
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      
      if (error) {
        console.error('User account deletion error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Data deletion error:', error);
      return false;
    }
  }
}

export const privacyManager = new PrivacyManager();