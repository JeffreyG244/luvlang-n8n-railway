import { supabase } from './supabase'

export interface BackupConfig {
  id?: number
  backup_type: 'daily' | 'weekly' | 'monthly'
  last_backup?: string
  next_backup: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  metadata?: Record<string, any>
}

export class BackupManager {
  async scheduleBackup(type: 'daily' | 'weekly' | 'monthly'): Promise<void> {
    try {
      const nextBackup = this.calculateNextBackup(type)
      
      const { error } = await supabase
        .from('backup_config')
        .upsert({
          backup_type: type,
          next_backup: nextBackup,
          status: 'pending'
        })

      if (error) {
        throw new Error(`Failed to schedule ${type} backup: ${error.message}`)
      }

      console.log(`${type} backup scheduled for ${nextBackup}`)
    } catch (err) {
      console.error(`Error scheduling ${type} backup:`, err)
    }
  }

  private calculateNextBackup(type: 'daily' | 'weekly' | 'monthly'): string {
    const now = new Date()
    
    switch (type) {
      case 'daily':
        now.setDate(now.getDate() + 1)
        break
      case 'weekly':
        now.setDate(now.getDate() + 7)
        break
      case 'monthly':
        now.setMonth(now.getMonth() + 1)
        break
    }
    
    return now.toISOString()
  }

  async getBackupStatus(): Promise<BackupConfig[]> {
    try {
      const { data, error } = await supabase
        .from('backup_config')
        .select('*')
        .order('backup_type')

      if (error) {
        throw new Error(`Failed to get backup status: ${error.message}`)
      }

      return data || []
    } catch (err) {
      console.error('Error getting backup status:', err)
      return []
    }
  }

  async updateBackupStatus(type: 'daily' | 'weekly' | 'monthly', status: 'running' | 'completed' | 'failed', metadata?: Record<string, any>): Promise<void> {
    try {
      const updateData: Partial<BackupConfig> = {
        status,
        metadata
      }

      if (status === 'completed') {
        updateData.last_backup = new Date().toISOString()
        updateData.next_backup = this.calculateNextBackup(type)
      }

      const { error } = await supabase
        .from('backup_config')
        .update(updateData)
        .eq('backup_type', type)

      if (error) {
        throw new Error(`Failed to update backup status: ${error.message}`)
      }
    } catch (err) {
      console.error('Error updating backup status:', err)
    }
  }

  async exportUserData(userId: string): Promise<any> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      const { data: userSessions } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)

      return {
        profile,
        sessions: userSessions,
        exported_at: new Date().toISOString()
      }
    } catch (err) {
      console.error('Error exporting user data:', err)
      throw err
    }
  }

  async performDatabaseBackup(): Promise<boolean> {
    try {
      await this.updateBackupStatus('daily', 'running')

      const tables = ['profiles', 'user_sessions', 'security_events', 'app_config']
      const backupData: Record<string, any> = {}

      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select('*')

        if (error) {
          console.warn(`Warning: Could not backup table ${table}:`, error)
          continue
        }

        backupData[table] = data
      }

      const backupMetadata = {
        timestamp: new Date().toISOString(),
        tables_backed_up: Object.keys(backupData),
        total_records: Object.values(backupData).reduce((sum, records: any) => sum + (records?.length || 0), 0)
      }

      await this.updateBackupStatus('daily', 'completed', backupMetadata)
      
      console.log('Database backup completed:', backupMetadata)
      return true
    } catch (err) {
      console.error('Database backup failed:', err)
      await this.updateBackupStatus('daily', 'failed', { error: err.message })
      return false
    }
  }
}

export const backupManager = new BackupManager()