import React from 'react'
import { supabase } from '../lib/supabase'
import { monitoringSystem } from '../lib/monitoring'

interface SecurityMetrics {
  events_last_24h: number
  failed_logins: number
  unique_ips: number
  active_alerts: number
  backup_status: {
    daily?: { status: string; last_backup?: string; next_backup: string }
    weekly?: { status: string; last_backup?: string; next_backup: string }
    monthly?: { status: string; last_backup?: string; next_backup: string }
  }
}

export const SecurityDashboard: React.FC = () => {
  const [metrics, setMetrics] = React.useState<SecurityMetrics | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    loadSecurityMetrics()
    const interval = setInterval(loadSecurityMetrics, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  const loadSecurityMetrics = async () => {
    try {
      setLoading(true)
      const health = await monitoringSystem.getSystemHealth()
      
      setMetrics({
        events_last_24h: health.security?.events_last_24h || 0,
        failed_logins: health.security?.failed_logins || 0,
        unique_ips: health.security?.unique_ips || 0,
        active_alerts: health.alerts?.active || 0,
        backup_status: health.backup || {}
      })
      
      setError(null)
    } catch (err) {
      console.error('Failed to load security metrics:', err)
      setError('Failed to load security data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'running': return 'text-blue-600 bg-blue-100'
      case 'failed': return 'text-red-600 bg-red-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString()
  }

  const MetricCard: React.FC<{
    title: string
    value: number | string
    trend?: 'up' | 'down' | 'stable'
    color?: string
  }> = ({ title, value, trend, color = 'text-gray-900' }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        {trend && (
          <div className={`text-sm ${
            trend === 'up' ? 'text-red-600' : 
            trend === 'down' ? 'text-green-600' : 
            'text-gray-600'
          }`}>
            {trend === 'up' && '↗'}
            {trend === 'down' && '↘'}
            {trend === 'stable' && '→'}
          </div>
        )}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={loadSecurityMetrics}
            className="mt-2 text-sm text-red-600 underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Security Dashboard</h2>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-gray-600">Live monitoring</span>
        </div>
      </div>

      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Events (24h)"
          value={metrics?.events_last_24h || 0}
          color="text-blue-600"
        />
        <MetricCard
          title="Failed Logins"
          value={metrics?.failed_logins || 0}
          color={metrics?.failed_logins && metrics.failed_logins > 10 ? 'text-red-600' : 'text-gray-900'}
          trend={metrics?.failed_logins && metrics.failed_logins > 10 ? 'up' : 'stable'}
        />
        <MetricCard
          title="Unique IPs"
          value={metrics?.unique_ips || 0}
          color="text-gray-900"
        />
        <MetricCard
          title="Active Alerts"
          value={metrics?.active_alerts || 0}
          color={metrics?.active_alerts && metrics.active_alerts > 0 ? 'text-red-600' : 'text-green-600'}
        />
      </div>

      {/* Backup Status */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Backup Status</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['daily', 'weekly', 'monthly'].map((type) => {
              const backup = metrics?.backup_status[type as keyof typeof metrics.backup_status]
              return (
                <div key={type} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 capitalize">{type}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      getStatusColor(backup?.status || 'unknown')
                    }`}>
                      {backup?.status || 'Unknown'}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>Last: {formatDate(backup?.last_backup)}</p>
                    <p>Next: {formatDate(backup?.next_backup)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Real-time Security Events */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Security Events</h3>
        </div>
        <div className="p-6">
          <SecurityEventsList />
        </div>
      </div>
    </div>
  )
}

const SecurityEventsList: React.FC = () => {
  const [events, setEvents] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    loadRecentEvents()
  }, [])

  const loadRecentEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10)

      if (error) throw error
      setEvents(data || [])
    } catch (err) {
      console.error('Failed to load security events:', err)
    } finally {
      setLoading(false)
    }
  }

  const getEventIcon = (eventType: string, success: boolean) => {
    const baseClasses = "w-4 h-4 rounded-full"
    
    if (eventType === 'login_attempt') {
      return success ? `${baseClasses} bg-green-500` : `${baseClasses} bg-red-500`
    }
    if (eventType === 'suspicious_activity') {
      return `${baseClasses} bg-orange-500`
    }
    return `${baseClasses} bg-blue-500`
  }

  if (loading) {
    return <div className="text-gray-500">Loading events...</div>
  }

  if (events.length === 0) {
    return <div className="text-gray-500">No recent security events</div>
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div key={event.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
          <div className={getEventIcon(event.event_type, event.success)} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">
                {event.event_type.replace('_', ' ').toUpperCase()}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(event.timestamp).toLocaleString()}
              </p>
            </div>
            <p className="text-sm text-gray-600">
              {event.ip_address && `IP: ${event.ip_address}`}
              {event.success ? ' - Success' : ' - Failed'}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}