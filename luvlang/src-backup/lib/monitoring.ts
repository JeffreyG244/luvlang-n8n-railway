import { supabase } from './supabase'
import { securityMonitor } from './security'

export interface AlertConfig {
  id?: string
  alert_type: 'security' | 'performance' | 'error' | 'backup'
  threshold: number
  time_window: number
  enabled: boolean
  webhook_url?: string
  email_recipients?: string[]
}

export interface Alert {
  id?: string
  alert_type: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  triggered_at: string
  resolved_at?: string
  metadata?: Record<string, any>
}

export class MonitoringSystem {
  private alerts: AlertConfig[] = [
    {
      alert_type: 'security',
      threshold: 5,
      time_window: 300000, // 5 minutes
      enabled: true,
      webhook_url: process.env.SECURITY_WEBHOOK_URL
    },
    {
      alert_type: 'performance',
      threshold: 1000, // 1 second response time
      time_window: 600000, // 10 minutes
      enabled: true
    },
    {
      alert_type: 'error',
      threshold: 10,
      time_window: 300000, // 5 minutes
      enabled: true
    }
  ]

  async checkSecurityAlerts(): Promise<void> {
    const securityAlert = this.alerts.find(a => a.alert_type === 'security' && a.enabled)
    if (!securityAlert) return

    try {
      const timeWindow = new Date(Date.now() - securityAlert.time_window).toISOString()
      
      const { data, error } = await supabase
        .from('security_events')
        .select('ip_address, COUNT(*)')
        .eq('success', false)
        .gte('timestamp', timeWindow)
        .group('ip_address')
        .having('COUNT(*)', 'gte', securityAlert.threshold)

      if (error) {
        console.error('Error checking security alerts:', error)
        return
      }

      for (const record of data || []) {
        await this.triggerAlert({
          alert_type: 'security',
          message: `Suspicious activity detected: ${record.count} failed login attempts from IP ${record.ip_address}`,
          severity: 'high',
          triggered_at: new Date().toISOString(),
          metadata: {
            ip_address: record.ip_address,
            failed_attempts: record.count,
            time_window: securityAlert.time_window
          }
        })
      }
    } catch (err) {
      console.error('Error in security alert check:', err)
    }
  }

  async checkBackupAlerts(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('backup_config')
        .select('*')
        .or('status.eq.failed,next_backup.lt.' + new Date().toISOString())

      if (error) {
        console.error('Error checking backup alerts:', error)
        return
      }

      for (const backup of data || []) {
        if (backup.status === 'failed') {
          await this.triggerAlert({
            alert_type: 'backup',
            message: `${backup.backup_type} backup failed`,
            severity: 'high',
            triggered_at: new Date().toISOString(),
            metadata: { backup_type: backup.backup_type }
          })
        } else if (new Date(backup.next_backup) < new Date()) {
          await this.triggerAlert({
            alert_type: 'backup',
            message: `${backup.backup_type} backup is overdue`,
            severity: 'medium',
            triggered_at: new Date().toISOString(),
            metadata: { backup_type: backup.backup_type, due_date: backup.next_backup }
          })
        }
      }
    } catch (err) {
      console.error('Error in backup alert check:', err)
    }
  }

  async triggerAlert(alert: Omit<Alert, 'id'>): Promise<void> {
    try {
      // Log the alert
      const { error } = await supabase
        .from('alerts')
        .insert([alert])

      if (error) {
        console.error('Failed to log alert:', error)
      }

      // Send webhook notification if configured
      const alertConfig = this.alerts.find(a => a.alert_type === alert.alert_type)
      if (alertConfig?.webhook_url) {
        await this.sendWebhookAlert(alertConfig.webhook_url, alert)
      }

      console.warn('ALERT TRIGGERED:', alert)
    } catch (err) {
      console.error('Error triggering alert:', err)
    }
  }

  private async sendWebhookAlert(webhookUrl: string, alert: Omit<Alert, 'id'>): Promise<void> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: `🚨 ${alert.severity.toUpperCase()} ALERT: ${alert.message}`,
          alert_type: alert.alert_type,
          severity: alert.severity,
          timestamp: alert.triggered_at,
          metadata: alert.metadata
        })
      })

      if (!response.ok) {
        console.error('Failed to send webhook alert:', response.statusText)
      }
    } catch (err) {
      console.error('Error sending webhook alert:', err)
    }
  }

  async getSystemHealth(): Promise<any> {
    try {
      const [securityEvents, backupStatus, activeAlerts] = await Promise.all([
        this.getRecentSecurityEvents(),
        this.getBackupHealth(),
        this.getActiveAlerts()
      ])

      return {
        timestamp: new Date().toISOString(),
        security: {
          events_last_24h: securityEvents.total,
          failed_logins: securityEvents.failed_logins,
          unique_ips: securityEvents.unique_ips
        },
        backup: backupStatus,
        alerts: {
          active: activeAlerts.length,
          critical: activeAlerts.filter(a => a.severity === 'critical').length,
          high: activeAlerts.filter(a => a.severity === 'high').length
        }
      }
    } catch (err) {
      console.error('Error getting system health:', err)
      return {
        timestamp: new Date().toISOString(),
        error: 'Failed to retrieve system health'
      }
    }
  }

  private async getRecentSecurityEvents(): Promise<any> {
    const { data, error } = await supabase
      .from('security_events')
      .select('*')
      .gte('timestamp', new Date(Date.now() - 86400000).toISOString()) // 24 hours

    if (error) throw error

    return {
      total: data?.length || 0,
      failed_logins: data?.filter(e => e.event_type === 'login_attempt' && !e.success).length || 0,
      unique_ips: new Set(data?.map(e => e.ip_address)).size || 0
    }
  }

  private async getBackupHealth(): Promise<any> {
    const { data, error } = await supabase
      .from('backup_config')
      .select('*')

    if (error) throw error

    return {
      daily: data?.find(b => b.backup_type === 'daily'),
      weekly: data?.find(b => b.backup_type === 'weekly'),
      monthly: data?.find(b => b.backup_type === 'monthly')
    }
  }

  private async getActiveAlerts(): Promise<Alert[]> {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .is('resolved_at', null)
      .order('triggered_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async startMonitoring(): Promise<void> {
    console.log('Starting monitoring system...')
    
    // Check alerts every 5 minutes
    setInterval(async () => {
      await this.checkSecurityAlerts()
      await this.checkBackupAlerts()
    }, 300000)

    console.log('Monitoring system started')
  }
}

export const monitoringSystem = new MonitoringSystem()