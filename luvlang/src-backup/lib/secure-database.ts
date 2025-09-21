import { supabase } from './supabase'

// Secure database operations with proper RLS enforcement
export class SecureDatabase {
  
  // =================================================================
  // USER PROFILE OPERATIONS (SECURE)
  // =================================================================
  
  async getUserProfile(userId?: string): Promise<any> {
    const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    
    if (!targetUserId) {
      throw new Error('Unauthorized: User not authenticated');
    }

    // Use RLS-protected query - users can only see their own full profile
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        professional_info(*),
        dating_preferences(*)
      `)
      .eq('id', targetUserId)
      .single();

    if (error) {
      console.error('Profile access error:', error);
      throw new Error('Failed to retrieve profile');
    }

    return data;
  }

  async getPublicProfile(userId: string): Promise<any> {
    // Use secure public view that excludes sensitive data
    const { data, error } = await supabase
      .from('public_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Public profile access error:', error);
      return null;
    }

    return data;
  }

  async updateProfile(profileData: any): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Unauthorized: User not authenticated');
    }

    // RLS automatically ensures users can only update their own profile
    const { error } = await supabase
      .from('profiles')
      .update({
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) {
      console.error('Profile update error:', error);
      throw new Error('Failed to update profile');
    }

    return true;
  }

  // =================================================================
  // PHONE VERIFICATION (ULTRA SECURE)
  // =================================================================

  async requestPhoneVerification(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Unauthorized: User not authenticated');
    }

    // Use secure function with rate limiting
    const { data, error } = await supabase.rpc('create_phone_verification', {
      p_phone_number: phoneNumber
    });

    if (error) {
      console.error('Phone verification request error:', error);
      throw new Error('Failed to send verification code');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return {
      success: true,
      message: 'Verification code sent securely'
    };
  }

  async verifyPhoneCode(phoneNumber: string, code: string): Promise<{ success: boolean; message: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Unauthorized: User not authenticated');
    }

    // Use secure verification function
    const { data, error } = await supabase.rpc('verify_phone_code', {
      p_phone_number: phoneNumber,
      p_code: code
    });

    if (error) {
      console.error('Phone verification error:', error);
      throw new Error('Verification failed');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return {
      success: true,
      message: 'Phone verified successfully'
    };
  }

  // =================================================================
  // MESSAGING (SECURE)
  // =================================================================

  async getConversations(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Unauthorized: User not authenticated');
    }

    // RLS ensures users only see their own conversations
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participant1:profiles!conversations_participant1_id_fkey(first_name, profile_image_url),
        participant2:profiles!conversations_participant2_id_fkey(first_name, profile_image_url)
      `)
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('Conversations access error:', error);
      throw new Error('Failed to load conversations');
    }

    return data || [];
  }

  async getMessages(conversationId: string): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Unauthorized: User not authenticated');
    }

    // RLS ensures users only see messages they're part of
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Messages access error:', error);
      throw new Error('Failed to load messages');
    }

    return data || [];
  }

  async sendMessage(conversationId: string, receiverId: string, content: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Unauthorized: User not authenticated');
    }

    // RLS ensures users can only send messages as themselves
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        receiver_id: receiverId,
        content: content.trim(),
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Message send error:', error);
      throw new Error('Failed to send message');
    }

    return true;
  }

  // =================================================================
  // PROFESSIONAL INFO (HIGHLY SECURE)
  // =================================================================

  async updateProfessionalInfo(professionalData: any): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Unauthorized: User not authenticated');
    }

    // Sanitize sensitive professional data
    const sanitizedData = {
      company_name: professionalData.company_name?.trim(),
      job_title: professionalData.job_title?.trim(),
      industry: professionalData.industry?.trim(),
      education_level: professionalData.education_level?.trim(),
      university: professionalData.university?.trim(),
      // Don't store actual salary/net worth - use ranges only
      salary_range: professionalData.salary_range,
      net_worth_range: professionalData.net_worth_range,
      professional_achievements: professionalData.professional_achievements || [],
      updated_at: new Date().toISOString()
    };

    // RLS ensures users can only update their own professional info
    const { error } = await supabase
      .from('professional_info')
      .upsert({
        user_id: user.id,
        ...sanitizedData
      });

    if (error) {
      console.error('Professional info update error:', error);
      throw new Error('Failed to update professional information');
    }

    return true;
  }

  // =================================================================
  // VERIFICATION DOCUMENTS (MAXIMUM SECURITY)
  // =================================================================

  async uploadVerificationDocument(file: File, documentType: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Unauthorized: User not authenticated');
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.');
    }

    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 10MB.');
    }

    // Upload to secure bucket with user-specific path
    const fileName = `${user.id}/${documentType}/${Date.now()}-${file.name}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('verification-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Document upload error:', uploadError);
      throw new Error('Failed to upload document');
    }

    // Store document record with RLS protection
    const { error: dbError } = await supabase
      .from('verification_documents')
      .insert({
        user_id: user.id,
        document_type: documentType,
        document_url: uploadData.path,
        verification_status: 'pending',
        uploaded_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('Document record creation error:', dbError);
      // Clean up uploaded file if database insert fails
      await supabase.storage
        .from('verification-documents')
        .remove([fileName]);
      throw new Error('Failed to save document record');
    }

    return true;
  }

  // =================================================================
  // PRIVACY CONTROLS
  // =================================================================

  async updatePrivacySettings(privacyData: any): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Unauthorized: User not authenticated');
    }

    // RLS ensures users can only update their own privacy settings
    const { error } = await supabase
      .from('dating_preferences')
      .upsert({
        user_id: user.id,
        privacy_level: privacyData.privacy_level || 'private',
        age_min: privacyData.age_min,
        age_max: privacyData.age_max,
        location_preference: privacyData.location_preference,
        income_preference: privacyData.income_preference,
        education_preference: privacyData.education_preference,
        relationship_type: privacyData.relationship_type,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Privacy settings update error:', error);
      throw new Error('Failed to update privacy settings');
    }

    return true;
  }

  // =================================================================
  // AUDIT LOGGING
  // =================================================================

  async logSecurityEvent(action: string, details: any): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Don't fail if audit logging fails, but log the error
    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user?.id,
          action,
          table_name: details.table_name || 'unknown',
          record_id: details.record_id,
          old_data: details.old_data,
          new_data: details.new_data,
          ip_address: details.ip_address,
          user_agent: details.user_agent,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Audit logging error:', error);
    }
  }

  // =================================================================
  // SECURITY VALIDATION
  // =================================================================

  async validateUserAccess(targetUserId: string, action: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }

    // Users can always access their own data
    if (user.id === targetUserId) {
      return true;
    }

    // For viewing other profiles, check if it's allowed
    if (action === 'view_profile') {
      const { data, error } = await supabase.rpc('can_view_profile', {
        target_user_id: targetUserId
      });

      if (error) {
        console.error('Access validation error:', error);
        return false;
      }

      return data === true;
    }

    // Default to deny for other actions
    return false;
  }
}

export const secureDB = new SecureDatabase();