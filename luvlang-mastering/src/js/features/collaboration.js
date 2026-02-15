/**
 * COLLABORATION SYSTEM
 * Share projects, get client approval, real-time sync
 * Works with Supabase for persistence and real-time features
 */

import { eventBus, Events } from '../core/event-bus.js';
import { appState } from '../core/app-state.js';
import { resolveContainer, showToast, escapeHtml, log } from '../shared/utils.js';

class CollaborationManager {
    constructor(container, supabaseClient) {
        this.container = resolveContainer(container);
        this.supabase = supabaseClient;
        this.currentProject = null;
        this.currentUser = null;
        this.collaborators = [];
        this.comments = [];
        this.realtimeChannel = null;
        this.cursorPositions = new Map();
        this._cursorDebounceTimer = null;
        this._reconnectAttempts = 0;
        this._maxReconnectAttempts = 5;
        this._boundHandlers = {};
        this._eventUnsubs = [];

        if (this.container) {
            this.init();
        }
    }

    /**
     * Initialize collaboration manager
     */
    async init() {
        this.render();
        this.bindEvents();

        // Get current user if authenticated
        if (this.supabase) {
            const { data: { user } } = await this.supabase.auth.getUser();
            this.currentUser = user;
        }
    }

    /**
     * Render collaboration panel
     */
    render() {
        this.container.innerHTML = `
            <div class="collaboration-panel">
                <div class="collab-header">
                    <div class="collab-title">
                        <span class="icon">👥</span>
                        <span>COLLABORATION</span>
                    </div>
                    <div class="collab-status" id="collab-status">
                        <span class="status-dot offline"></span>
                        <span>Offline</span>
                    </div>
                </div>

                <div class="project-section">
                    <div class="section-label">Project</div>
                    <div class="project-info" id="project-info">
                        <span class="no-project">No project loaded</span>
                    </div>
                    <div class="project-actions">
                        <button class="btn-create-project" id="btn-create-project">
                            <span>+ New Project</span>
                        </button>
                        <button class="btn-load-project" id="btn-load-project">
                            <span>📂 Open</span>
                        </button>
                    </div>
                </div>

                <div class="share-section">
                    <div class="section-label">Share</div>
                    <div class="share-controls">
                        <input type="email" id="share-email" placeholder="Enter email to share..." class="share-input">
                        <select id="share-permission" class="share-select">
                            <option value="view">Can View</option>
                            <option value="comment">Can Comment</option>
                            <option value="edit">Can Edit</option>
                        </select>
                        <button class="btn-share" id="btn-share" disabled>
                            <span>Share</span>
                        </button>
                    </div>
                    <div class="share-link-section">
                        <button class="btn-generate-link" id="btn-generate-link" disabled>
                            <span>🔗 Generate Share Link</span>
                        </button>
                        <div class="share-link-display" id="share-link-display" style="display: none;">
                            <input type="text" id="share-link-input" readonly>
                            <button class="btn-copy-link" id="btn-copy-link">Copy</button>
                        </div>
                    </div>
                </div>

                <div class="collaborators-section">
                    <div class="section-label">Collaborators</div>
                    <div class="collaborators-list" id="collaborators-list">
                        <div class="no-collaborators">No collaborators yet</div>
                    </div>
                </div>

                <div class="comments-section">
                    <div class="section-label">
                        <span>Comments</span>
                        <span class="comment-count" id="comment-count">0</span>
                    </div>
                    <div class="comments-list" id="comments-list">
                        <div class="no-comments">No comments yet</div>
                    </div>
                    <div class="add-comment">
                        <input type="text" id="comment-input" placeholder="Add a comment at current position..." class="comment-input">
                        <button class="btn-add-comment" id="btn-add-comment" disabled>
                            <span>💬</span>
                        </button>
                    </div>
                </div>

                <div class="approval-section" id="approval-section" style="display: none;">
                    <div class="section-label">Approval Status</div>
                    <div class="approval-status" id="approval-status">
                        <span class="status-pending">⏳ Pending Review</span>
                    </div>
                    <div class="approval-actions">
                        <button class="btn-request-approval" id="btn-request-approval">
                            <span>📤 Request Approval</span>
                        </button>
                        <button class="btn-approve" id="btn-approve" style="display: none;">
                            <span>✅ Approve</span>
                        </button>
                        <button class="btn-request-changes" id="btn-request-changes" style="display: none;">
                            <span>🔄 Request Changes</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Bind event handlers (stored for cleanup)
     */
    bindEvents() {
        const createBtn = this.container.querySelector('#btn-create-project');
        const loadBtn = this.container.querySelector('#btn-load-project');
        const shareBtn = this.container.querySelector('#btn-share');
        const generateLinkBtn = this.container.querySelector('#btn-generate-link');
        const copyLinkBtn = this.container.querySelector('#btn-copy-link');
        const addCommentBtn = this.container.querySelector('#btn-add-comment');
        const shareEmailInput = this.container.querySelector('#share-email');
        const commentInput = this.container.querySelector('#comment-input');

        // Store bound handlers for removal in destroy()
        this._boundHandlers.create = () => this.createProject();
        this._boundHandlers.load = () => this.showLoadDialog();
        this._boundHandlers.share = () => this.shareProject();
        this._boundHandlers.generateLink = () => this.generateShareLink();
        this._boundHandlers.copyLink = () => this.copyShareLink();
        this._boundHandlers.addComment = () => this.addComment();
        this._boundHandlers.shareEmailInput = () => {
            shareBtn.disabled = !shareEmailInput.value || !this.currentProject;
        };
        this._boundHandlers.commentKeydown = (e) => {
            if (e.key === 'Enter' && commentInput.value) this.addComment();
        };
        this._boundHandlers.commentInput = () => {
            addCommentBtn.disabled = !commentInput.value || !this.currentProject;
        };
        this._boundHandlers.audioProgress = (data) => {
            this.currentTime = data.currentTime;
        };

        if (createBtn) createBtn.addEventListener('click', this._boundHandlers.create);
        if (loadBtn) loadBtn.addEventListener('click', this._boundHandlers.load);
        if (shareBtn) shareBtn.addEventListener('click', this._boundHandlers.share);
        if (generateLinkBtn) generateLinkBtn.addEventListener('click', this._boundHandlers.generateLink);
        if (copyLinkBtn) copyLinkBtn.addEventListener('click', this._boundHandlers.copyLink);
        if (addCommentBtn) addCommentBtn.addEventListener('click', this._boundHandlers.addComment);

        if (shareEmailInput) {
            shareEmailInput.addEventListener('input', this._boundHandlers.shareEmailInput);
        }

        if (commentInput) {
            commentInput.addEventListener('keydown', this._boundHandlers.commentKeydown);
            commentInput.addEventListener('input', this._boundHandlers.commentInput);
        }

        // Listen for audio position changes (store unsub for cleanup)
        const unsub = eventBus.on(Events.AUDIO_PROGRESS, this._boundHandlers.audioProgress);
        if (typeof unsub === 'function') this._eventUnsubs.push(unsub);
    }

    /**
     * Create a new project
     */
    async createProject() {
        if (!this.supabase) {
            console.warn('[Collaboration] Supabase not configured');
            showToast('Please configure Supabase for collaboration features');
            return;
        }

        const projectName = prompt('Enter project name:');
        if (!projectName) return;

        try {
            // Get current audio state
            const _audioState = appState.get('audio');
            const eqState = appState.get('eq');
            const dynamicsState = appState.get('dynamics');

            const { data, error } = await this.supabase
                .from('projects')
                .insert({
                    name: projectName,
                    owner_id: this.currentUser?.id,
                    settings: {
                        eq: eqState,
                        dynamics: dynamicsState
                    },
                    audio_key: null, // Would be set after uploading audio
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            this.currentProject = data;
            this.updateProjectInfo();
            this.enableControls();
            this.subscribeToRealtime();

            eventBus.emit(Events.COLLAB_CONNECT, { project: data });
            showToast(`Project "${projectName}" created`);

        } catch (error) {
            console.error('[Collaboration] Failed to create project:', error);
            showToast('Failed to create project');
        }
    }

    /**
     * Show load project dialog
     */
    async showLoadDialog() {
        if (!this.supabase || !this.currentUser) {
            showToast('Please sign in to load projects');
            return;
        }

        try {
            // Get user's projects
            const { data: ownedProjects } = await this.supabase
                .from('projects')
                .select('*')
                .eq('owner_id', this.currentUser.id);

            // Get shared projects
            const { data: sharedProjects } = await this.supabase
                .from('project_shares')
                .select('project_id, projects(*)')
                .eq('email', this.currentUser.email);

            const allProjects = [
                ...(ownedProjects || []),
                ...(sharedProjects || []).map(s => s.projects)
            ];

            if (allProjects.length === 0) {
                showToast('No projects found');
                return;
            }

            // Simple select for now (would be a modal in production)
            const projectList = allProjects.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
            const choice = prompt(`Select a project:\n${projectList}\n\nEnter number:`);

            if (choice) {
                const index = parseInt(choice) - 1;
                if (index >= 0 && index < allProjects.length) {
                    await this.loadProject(allProjects[index]);
                }
            }
        } catch (error) {
            console.error('[Collaboration] Failed to load projects:', error);
        }
    }

    /**
     * Load a project
     */
    async loadProject(project) {
        this.currentProject = project;

        // Apply settings
        if (project.settings) {
            if (project.settings.eq) {
                appState.set('eq', project.settings.eq, false);
            }
            if (project.settings.dynamics) {
                appState.set('dynamics', project.settings.dynamics, false);
            }
        }

        // Load collaborators
        await this.loadCollaborators();

        // Load comments
        await this.loadComments();

        this.updateProjectInfo();
        this.enableControls();
        this.subscribeToRealtime();

        eventBus.emit(Events.COLLAB_CONNECT, { project });
        showToast(`Loaded "${project.name}"`);
    }

    /**
     * Load project collaborators
     */
    async loadCollaborators() {
        if (!this.currentProject) return;

        try {
            const { data } = await this.supabase
                .from('project_shares')
                .select('*')
                .eq('project_id', this.currentProject.id);

            this.collaborators = data || [];
            this.updateCollaboratorsList();
        } catch (error) {
            console.error('[Collaboration] Failed to load collaborators:', error);
        }
    }

    /**
     * Load project comments
     */
    async loadComments() {
        if (!this.currentProject) return;

        try {
            const { data } = await this.supabase
                .from('project_comments')
                .select('*')
                .eq('project_id', this.currentProject.id)
                .order('created_at', { ascending: true });

            this.comments = data || [];
            this.updateCommentsList();
        } catch (error) {
            console.error('[Collaboration] Failed to load comments:', error);
        }
    }

    /**
     * Share project with user
     */
    async shareProject() {
        if (!this.currentProject) return;

        const email = this.container.querySelector('#share-email').value;
        const permission = this.container.querySelector('#share-permission').value;

        try {
            const { data, error } = await this.supabase
                .from('project_shares')
                .insert({
                    project_id: this.currentProject.id,
                    email: email,
                    permission: permission
                })
                .select()
                .single();

            if (error) throw error;

            this.collaborators.push(data);
            this.updateCollaboratorsList();
            this.container.querySelector('#share-email').value = '';

            showToast(`Shared with ${email}`);

        } catch (error) {
            console.error('[Collaboration] Failed to share:', error);
            showToast('Failed to share project');
        }
    }

    /**
     * Generate share link
     */
    async generateShareLink() {
        if (!this.currentProject) return;

        const shareId = this.generateShareId();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        try {
            const { data: _data, error } = await this.supabase
                .from('project_shares')
                .insert({
                    project_id: this.currentProject.id,
                    share_link: shareId,
                    permission: 'view',
                    expires_at: expiresAt.toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            const shareUrl = `${window.location.origin}/?share=${shareId}`;

            const linkDisplay = this.container.querySelector('#share-link-display');
            const linkInput = this.container.querySelector('#share-link-input');

            linkInput.value = shareUrl;
            linkDisplay.style.display = 'flex';

        } catch (error) {
            console.error('[Collaboration] Failed to generate link:', error);
        }
    }

    /**
     * Generate unique share ID
     */
    generateShareId() {
        return 'xxxx-xxxx-xxxx'.replace(/x/g, () =>
            Math.floor(Math.random() * 16).toString(16)
        );
    }

    /**
     * Copy share link to clipboard (modern Clipboard API)
     */
    async copyShareLink() {
        const linkInput = this.container.querySelector('#share-link-input');
        if (!linkInput) return;

        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(linkInput.value);
            } else {
                // Fallback for older browsers
                linkInput.select();
                document.execCommand('copy');
            }
            showToast('Link copied to clipboard');
        } catch (error) {
            showToast('Failed to copy link');
        }
    }

    /**
     * Add a comment
     */
    async addComment() {
        if (!this.currentProject) return;

        const commentInput = this.container.querySelector('#comment-input');
        const text = commentInput.value.trim();

        if (!text) return;

        const currentTime = this.currentTime || 0;

        try {
            const { data, error } = await this.supabase
                .from('project_comments')
                .insert({
                    project_id: this.currentProject.id,
                    user_id: this.currentUser?.id,
                    user_email: this.currentUser?.email || 'Anonymous',
                    timestamp_seconds: currentTime,
                    comment: text,
                    status: 'open'
                })
                .select()
                .single();

            if (error) throw error;

            this.comments.push(data);
            this.updateCommentsList();
            commentInput.value = '';

            eventBus.emit(Events.COLLAB_COMMENT, { comment: data });

        } catch (error) {
            console.error('[Collaboration] Failed to add comment:', error);
        }
    }

    /**
     * Subscribe to realtime updates with reconnection logic
     */
    subscribeToRealtime() {
        if (!this.supabase || !this.currentProject) return;

        // Unsubscribe from previous channel
        if (this.realtimeChannel) {
            this.supabase.removeChannel(this.realtimeChannel);
        }

        this._reconnectAttempts = 0;

        // Subscribe to project changes
        this.realtimeChannel = this.supabase
            .channel(`project:${this.currentProject.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'project_comments',
                filter: `project_id=eq.${this.currentProject.id}`
            }, (payload) => {
                if (payload.new.user_id !== this.currentUser?.id) {
                    this.comments.push(payload.new);
                    this.updateCommentsList();
                    showToast('New comment received');
                }
            })
            .on('presence', { event: 'sync' }, () => {
                const presenceState = this.realtimeChannel.presenceState();
                this.updatePresence(presenceState);
            })
            .on('broadcast', { event: 'cursor' }, (payload) => {
                this.updateCursor(payload.payload);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    this._reconnectAttempts = 0;
                    await this.realtimeChannel.track({
                        user_id: this.currentUser?.id,
                        email: this.currentUser?.email,
                        online_at: new Date().toISOString()
                    });
                    this.updateConnectionStatus(true);
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    this.updateConnectionStatus(false);
                    this._attemptReconnect();
                } else if (status === 'CLOSED') {
                    this.updateConnectionStatus(false);
                }
            });
    }

    /**
     * Attempt reconnection with exponential backoff
     */
    _attemptReconnect() {
        if (this._reconnectAttempts >= this._maxReconnectAttempts) {
            log.warn('Realtime reconnection failed after max attempts');
            showToast('Connection lost. Please refresh to reconnect.', { type: 'error' });
            return;
        }

        const delay = Math.min(1000 * Math.pow(2, this._reconnectAttempts), 30000);
        this._reconnectAttempts++;

        log.info(`Reconnecting in ${delay}ms (attempt ${this._reconnectAttempts})`);

        clearTimeout(this._reconnectTimer);
        this._reconnectTimer = setTimeout(() => {
            this.subscribeToRealtime();
        }, delay);
    }

    /**
     * Broadcast cursor position (debounced to prevent flooding)
     */
    broadcastCursor(position) {
        if (!this.realtimeChannel) return;

        clearTimeout(this._cursorDebounceTimer);
        this._cursorDebounceTimer = setTimeout(() => {
            this.realtimeChannel.send({
                type: 'broadcast',
                event: 'cursor',
                payload: {
                    user_id: this.currentUser?.id,
                    position: position
                }
            });
        }, 50);
    }

    /**
     * Update cursor from other user
     */
    updateCursor(data) {
        if (data.user_id !== this.currentUser?.id) {
            this.cursorPositions.set(data.user_id, data.position);
            eventBus.emit(Events.COLLAB_CURSOR, {
                userId: data.user_id,
                position: data.position
            });
        }
    }

    /**
     * Update presence from realtime
     */
    updatePresence(presenceState) {
        const onlineUsers = Object.values(presenceState)
            .flat()
            .filter(user => user.user_id !== this.currentUser?.id);

        this.collaborators.forEach(collab => {
            collab.online = onlineUsers.some(u => u.email === collab.email);
        });

        this.updateCollaboratorsList();
    }

    /**
     * Update project info display
     */
    updateProjectInfo() {
        const infoEl = this.container.querySelector('#project-info');
        if (!infoEl || !this.currentProject) return;

        infoEl.innerHTML = `
            <div class="project-name">${escapeHtml(this.currentProject.name)}</div>
            <div class="project-date">Created: ${escapeHtml(new Date(this.currentProject.created_at).toLocaleDateString())}</div>
        `;
    }

    /**
     * Update collaborators list
     */
    updateCollaboratorsList() {
        const listEl = this.container.querySelector('#collaborators-list');
        if (!listEl) return;

        if (this.collaborators.length === 0) {
            listEl.innerHTML = '<div class="no-collaborators">No collaborators yet</div>';
            return;
        }

        listEl.innerHTML = this.collaborators.map(collab => `
            <div class="collaborator-item">
                <div class="collaborator-status ${collab.online ? 'online' : ''}"></div>
                <div class="collaborator-info">
                    <span class="collaborator-email">${escapeHtml(collab.email)}</span>
                    <span class="collaborator-permission">${escapeHtml(collab.permission)}</span>
                </div>
                <button class="btn-remove-collaborator" data-id="${escapeHtml(String(collab.id))}">✕</button>
            </div>
        `).join('');

        // Bind remove buttons
        listEl.querySelectorAll('.btn-remove-collaborator').forEach(btn => {
            btn.addEventListener('click', () => {
                this.removeCollaborator(btn.dataset.id);
            });
        });
    }

    /**
     * Remove collaborator
     */
    async removeCollaborator(id) {
        try {
            await this.supabase
                .from('project_shares')
                .delete()
                .eq('id', id);

            this.collaborators = this.collaborators.filter(c => c.id !== id);
            this.updateCollaboratorsList();
        } catch (error) {
            console.error('[Collaboration] Failed to remove collaborator:', error);
        }
    }

    /**
     * Update comments list
     */
    updateCommentsList() {
        const listEl = this.container.querySelector('#comments-list');
        const countEl = this.container.querySelector('#comment-count');

        if (!listEl) return;

        if (countEl) {
            countEl.textContent = this.comments.length;
        }

        if (this.comments.length === 0) {
            listEl.innerHTML = '<div class="no-comments">No comments yet</div>';
            return;
        }

        listEl.innerHTML = this.comments.map(comment => `
            <div class="comment-item" data-timestamp="${comment.timestamp_seconds}">
                <div class="comment-header">
                    <span class="comment-user">${escapeHtml(comment.user_email)}</span>
                    <span class="comment-time" data-seconds="${comment.timestamp_seconds}"
                          role="button" tabindex="0"
                          aria-label="Jump to ${this.formatTimestamp(comment.timestamp_seconds)}">
                        ${this.formatTimestamp(comment.timestamp_seconds)}
                    </span>
                </div>
                <div class="comment-text">${escapeHtml(comment.comment)}</div>
                <div class="comment-status ${escapeHtml(comment.status)}">${escapeHtml(comment.status)}</div>
            </div>
        `).join('');

        // Click/keyboard to jump to timestamp
        listEl.querySelectorAll('.comment-time').forEach(timeEl => {
            const jumpToTime = () => {
                const seconds = parseFloat(timeEl.dataset.seconds);
                eventBus.emit(Events.AUDIO_SEEK, { time: seconds });
            };
            timeEl.addEventListener('click', jumpToTime);
            timeEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    jumpToTime();
                }
            });
        });
    }

    /**
     * Format timestamp as MM:SS
     */
    formatTimestamp(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Update connection status
     */
    updateConnectionStatus(connected) {
        const statusEl = this.container.querySelector('#collab-status');
        if (!statusEl) return;

        statusEl.innerHTML = connected
            ? '<span class="status-dot online"></span><span>Connected</span>'
            : '<span class="status-dot offline"></span><span>Offline</span>';
    }

    /**
     * Enable share controls
     */
    enableControls() {
        const generateLinkBtn = this.container.querySelector('#btn-generate-link');
        if (generateLinkBtn) generateLinkBtn.disabled = false;

        const addCommentBtn = this.container.querySelector('#btn-add-comment');
        const commentInput = this.container.querySelector('#comment-input');
        if (addCommentBtn && commentInput) {
            addCommentBtn.disabled = !commentInput.value;
        }
    }

    /**
     * Save current state to project
     */
    async saveProjectState() {
        if (!this.currentProject || !this.supabase) return;

        try {
            const settings = {
                eq: appState.get('eq'),
                dynamics: appState.get('dynamics'),
                master: appState.get('master'),
                stereo: appState.get('stereo')
            };

            await this.supabase
                .from('projects')
                .update({ settings })
                .eq('id', this.currentProject.id);

        } catch (error) {
            console.error('[Collaboration] Failed to save state:', error);
        }
    }

    /**
     * Cleanup all resources
     */
    destroy() {
        // Clear timers
        clearTimeout(this._cursorDebounceTimer);
        clearTimeout(this._reconnectTimer);

        // Unsubscribe from realtime
        if (this.realtimeChannel) {
            this.supabase?.removeChannel(this.realtimeChannel);
            this.realtimeChannel = null;
        }

        // Remove event bus subscriptions
        for (const unsub of this._eventUnsubs) {
            unsub();
        }
        this._eventUnsubs = [];

        // Remove DOM event listeners
        if (this.container) {
            const h = this._boundHandlers;
            const qs = (sel) => this.container.querySelector(sel);

            const createBtn = qs('#btn-create-project');
            const loadBtn = qs('#btn-load-project');
            const shareBtn = qs('#btn-share');
            const generateLinkBtn = qs('#btn-generate-link');
            const copyLinkBtn = qs('#btn-copy-link');
            const addCommentBtn = qs('#btn-add-comment');
            const shareEmailInput = qs('#share-email');
            const commentInput = qs('#comment-input');

            if (createBtn) createBtn.removeEventListener('click', h.create);
            if (loadBtn) loadBtn.removeEventListener('click', h.load);
            if (shareBtn) shareBtn.removeEventListener('click', h.share);
            if (generateLinkBtn) generateLinkBtn.removeEventListener('click', h.generateLink);
            if (copyLinkBtn) copyLinkBtn.removeEventListener('click', h.copyLink);
            if (addCommentBtn) addCommentBtn.removeEventListener('click', h.addComment);
            if (shareEmailInput) shareEmailInput.removeEventListener('input', h.shareEmailInput);
            if (commentInput) {
                commentInput.removeEventListener('keydown', h.commentKeydown);
                commentInput.removeEventListener('input', h.commentInput);
            }

            this.container.innerHTML = '';
        }

        this._boundHandlers = {};
        this.cursorPositions.clear();
        this.comments = [];
        this.collaborators = [];
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CollaborationManager };
}

if (typeof window !== 'undefined') {
    window.CollaborationManager = CollaborationManager;
}

export { CollaborationManager };
