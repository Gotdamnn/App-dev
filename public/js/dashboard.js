// PatientPulse Dashboard - Enhanced JavaScript
// Handles dashboard interactions, global search, and auto-refresh

// Only declare API_BASE if not already declared
if (typeof API_BASE === 'undefined') {
    // Dynamically set API_BASE based on current domain
    var API_BASE = window.location.origin + '/api';
}

const REFRESH_INTERVAL = 15000; // 15 seconds
let refreshTimer = null;
let searchDebounceTimer = null;
const startTime = new Date();

// Check if we're on the dashboard page
const isDashboardPage = document.querySelector('.stats-cards') !== null && 
                        document.getElementById('totalPatients') !== null;

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize dashboard features if on dashboard page
    if (isDashboardPage) {
        initializeDashboard();
    }
    
    // Setup logout modal on all pages
    setupLogoutModal();
});

function initializeDashboard() {
    // Load initial data
    loadDashboardStats();
    loadRecentActivity();
    loadAlertCount();
    updateLastUpdated();
    
    // Setup event listeners
    setupRefreshButton();
    setupGlobalSearch();
    initializeNotifications();
    
    // Start auto-refresh
    startAutoRefresh();
    
    // Update uptime every second
    setInterval(updateUptime, 1000);
}

// ===== DASHBOARD STATS =====
async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_BASE}/dashboard/summary`);
        if (!response.ok) throw new Error('Failed to fetch summary');
        
        const data = await response.json();
        
        // Update patients
        document.getElementById('totalPatients').textContent = data.patients?.total || 0;
        document.getElementById('activePatients').textContent = data.patients?.active || 0;
        
        // Update employees
        document.getElementById('totalEmployees').textContent = data.employees?.total || 0;
        document.getElementById('activeEmployees').textContent = data.employees?.active || 0;
        
        // Update departments
        document.getElementById('totalDepartments').textContent = data.departments?.total || 0;
        document.getElementById('activeDepartments').textContent = data.departments?.active || 0;
        
        // Update devices
        document.getElementById('totalDevices').textContent = data.devices?.total || 0;
        document.getElementById('onlineDevices').textContent = data.devices?.online || 0;
        document.getElementById('offlineDevices').textContent = (data.devices?.total || 0) - (data.devices?.online || 0);
        document.getElementById('lastSyncTime').textContent = formatTimeAgo(new Date());
        
        // Update critical alerts
        document.getElementById('criticalAlerts').textContent = data.alerts?.critical || 0;
        
        // Update server status
        document.getElementById('serverStatus').textContent = 'Online';
        document.getElementById('dbStatus').textContent = 'Connected';
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        document.getElementById('serverStatus').textContent = 'Error';
        document.getElementById('serverStatus').classList.add('error');
    }
}

// ===== RECENT ACTIVITY =====
async function loadRecentActivity() {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    try {
        const response = await fetch(`${API_BASE}/dashboard/activity`);
        if (!response.ok) throw new Error('Failed to fetch activity');
        
        const activities = await response.json();
        
        if (activities.length === 0) {
            activityList.innerHTML = `
                <li>
                    <span class="activity-dot dot-blue"></span>
                    <div class="activity-details">
                        <div class="activity-title">No recent activity</div>
                        <div class="activity-meta">Add patients or devices to see activity</div>
                    </div>
                </li>
            `;
            return;
        }
        
        activityList.innerHTML = activities.slice(0, 8).map(activity => `
            <li>
                <span class="activity-dot ${getDotClass(activity.type)}"></span>
                <div class="activity-details">
                    <div class="activity-title">${escapeHtml(activity.title)}</div>
                    <div class="activity-meta">
                        ${activity.user ? `<span class="activity-user">${escapeHtml(activity.user)}</span> · ` : ''}
                        ${escapeHtml(activity.description)} · ${formatTimeAgo(new Date(activity.timestamp))}
                    </div>
                </div>
            </li>
        `).join('');
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
        activityList.innerHTML = `
            <li>
                <span class="activity-dot dot-red"></span>
                <div class="activity-details">
                    <div class="activity-title">Error loading activity</div>
                    <div class="activity-meta">Could not connect to server</div>
                </div>
            </li>
        `;
    }
}

// ===== ALERT COUNT =====
async function loadAlertCount() {
    try {
        const response = await fetch(`${API_BASE}/alerts`);
        if (!response.ok) throw new Error('Failed to fetch alerts');
        
        const alerts = await response.json();
        const activeAlerts = alerts.filter(a => a.status === 'active').length;
        
        const badge = document.getElementById('alertBadge');
        if (badge) {
            badge.textContent = activeAlerts;
            badge.style.display = activeAlerts > 0 ? 'flex' : 'none';
        }
    } catch (error) {
        console.error('Error loading alert count:', error);
    }
}

// ===== GLOBAL SEARCH =====
function setupGlobalSearch() {
    const searchInput = document.getElementById('globalSearch');
    const searchResults = document.getElementById('searchResults');
    
    if (!searchInput || !searchResults) return;
    
    searchInput.addEventListener('input', function(e) {
        const query = e.target.value.trim();
        
        // Clear previous timer
        if (searchDebounceTimer) {
            clearTimeout(searchDebounceTimer);
        }
        
        if (query.length < 2) {
            searchResults.classList.remove('active');
            return;
        }
        
        // Debounce search
        searchDebounceTimer = setTimeout(() => {
            performSearch(query);
        }, 300);
    });
    
    // Close search results when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-container')) {
            searchResults.classList.remove('active');
        }
    });
    
    // Handle keyboard navigation
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            searchResults.classList.remove('active');
            searchInput.blur();
        }
    });
}

async function performSearch(query) {
    const searchResults = document.getElementById('searchResults');
    
    try {
        const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Search failed');
        
        const results = await response.json();
        renderSearchResults(results, query);
        
    } catch (error) {
        console.error('Search error:', error);
        searchResults.innerHTML = `
            <div class="search-no-results">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error performing search</p>
            </div>
        `;
        searchResults.classList.add('active');
    }
}

function renderSearchResults(results, query) {
    const searchResults = document.getElementById('searchResults');
    let html = '';
    
    const hasResults = results.patients?.length || results.employees?.length || 
                       results.departments?.length || results.reports?.length;
    
    if (!hasResults) {
        searchResults.innerHTML = `
            <div class="search-no-results">
                <i class="fas fa-search"></i>
                <p>No results found for "${escapeHtml(query)}"</p>
            </div>
        `;
        searchResults.classList.add('active');
        return;
    }
    
    // Patients
    if (results.patients?.length) {
        html += `<div class="search-category">Patients (${results.patients.length})</div>`;
        results.patients.slice(0, 3).forEach(patient => {
            html += `
                <a href="/patients?id=${patient.id}" class="search-result-item">
                    <div class="search-result-icon patient"><i class="fas fa-user"></i></div>
                    <div class="search-result-info">
                        <h4>${escapeHtml(patient.name)}</h4>
                        <p>ID: PT-${patient.patient_id || patient.id} · ${patient.status || 'Active'}</p>
                    </div>
                </a>
            `;
        });
    }
    
    // Employees
    if (results.employees?.length) {
        html += `<div class="search-category">Employees (${results.employees.length})</div>`;
        results.employees.slice(0, 3).forEach(emp => {
            html += `
                <a href="/employees?id=${emp.employee_id}" class="search-result-item">
                    <div class="search-result-icon employee"><i class="fas fa-user-md"></i></div>
                    <div class="search-result-info">
                        <h4>${escapeHtml(emp.first_name)} ${escapeHtml(emp.last_name)}</h4>
                        <p>${escapeHtml(emp.job_title || emp.position || 'Employee')}</p>
                    </div>
                </a>
            `;
        });
    }
    
    // Departments
    if (results.departments?.length) {
        html += `<div class="search-category">Departments (${results.departments.length})</div>`;
        results.departments.slice(0, 3).forEach(dept => {
            html += `
                <a href="/departments?id=${dept.department_id}" class="search-result-item">
                    <div class="search-result-icon department"><i class="fas fa-building"></i></div>
                    <div class="search-result-info">
                        <h4>${escapeHtml(dept.department_name)}</h4>
                        <p>${escapeHtml(dept.description || 'Department')}</p>
                    </div>
                </a>
            `;
        });
    }
    
    searchResults.innerHTML = html;
    searchResults.classList.add('active');
}

// ===== REFRESH FUNCTIONALITY =====
function setupRefreshButton() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            refreshDashboard();
            
            // Add spinning animation
            const icon = this.querySelector('i');
            if (icon) {
                icon.classList.add('fa-spin');
                setTimeout(() => icon.classList.remove('fa-spin'), 1000);
            }
        });
    }
}

function refreshDashboard() {
    loadDashboardStats();
    loadRecentActivity();
    loadAlertCount();
    updateLastUpdated();
}

function startAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
    refreshTimer = setInterval(refreshDashboard, REFRESH_INTERVAL);
}

// ===== UTILITY FUNCTIONS =====
function updateLastUpdated() {
    const el = document.getElementById('lastUpdateTime');
    if (el) {
        el.textContent = new Date().toLocaleTimeString();
    }
}

function updateUptime() {
    const el = document.getElementById('uptime');
    if (el) {
        const diff = Math.floor((new Date() - startTime) / 1000);
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        el.textContent = `${hours}h ${minutes}m ${seconds}s`;
    }
}

function formatTimeAgo(date) {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
}

function getDotClass(type) {
    const classes = {
        'patient': 'dot-green',
        'employee': 'dot-blue',
        'department': 'dot-orange',
        'device': 'dot-purple',
        'alert': 'dot-red',
        'report': 'dot-blue'
    };
    return classes[type] || 'dot-blue';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== LOGOUT MODAL =====
function setupLogoutModal() {
    // Close modal when clicking outside
    const logoutModal = document.getElementById('logoutModal');
    if (logoutModal) {
        logoutModal.addEventListener('click', function(e) {
            if (e.target === logoutModal) {
                closeLogoutModal();
            }
        });
    }
}

function showLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
    }
}

function closeLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

function confirmLogout() {
    localStorage.removeItem('userSession');
    sessionStorage.clear();
    window.location.href = '/login';
}

// ===== CUSTOM MODAL FUNCTION =====
function showConfirmModal(message, onConfirm, onCancel) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog-custom';
    
    dialog.innerHTML = `
        <div class="modal-title-custom">Confirm Action</div>
        <div class="modal-message">${message}</div>
        <div class="modal-buttons">
            <button class="btn-modal btn-modal-secondary" id="cancelBtn">Cancel</button>
            <button class="btn-modal btn-modal-primary" id="confirmBtn">OK</button>
        </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    
    // Add inline styles if not already present
    if (!document.querySelector('#modalCustomStyles')) {
        const style = document.createElement('style');
        style.id = 'modalCustomStyles';
        style.textContent = `
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            
            .modal-dialog-custom {
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                padding: 30px;
                max-width: 500px;
                width: 90%;
                animation: modalSlideIn 0.3s ease-out;
            }
            
            @keyframes modalSlideIn {
                from {
                    transform: scale(0.9);
                    opacity: 0;
                }
                to {
                    transform: scale(1);
                    opacity: 1;
                }
            }
            
            .modal-title-custom {
                font-size: 20px;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 12px;
            }
            
            .modal-message {
                font-size: 16px;
                color: #6b7280;
                margin-bottom: 24px;
                line-height: 1.5;
            }
            
            .modal-buttons {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }
            
            .btn-modal {
                padding: 10px 24px;
                border-radius: 8px;
                border: none;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .btn-modal-secondary {
                background: #f3f4f6;
                color: #374151;
            }
            
            .btn-modal-secondary:hover {
                background: #e5e7eb;
            }
            
            .btn-modal-secondary:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .btn-modal-primary {
                background: #3b82f6;
                color: white;
            }
            
            .btn-modal-primary:hover {
                background: #2563eb;
            }
            
            .btn-modal-primary:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
        `;
        document.head.appendChild(style);
    }
    
    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    let isProcessing = false;
    
    const closeModal = () => {
        overlay.remove();
        document.body.style.overflow = '';
    };
    
    confirmBtn.addEventListener('click', async () => {
        if (isProcessing) return;
        isProcessing = true;
        confirmBtn.disabled = true;
        cancelBtn.disabled = true;
        confirmBtn.textContent = 'Processing...';
        
        try {
            if (onConfirm) await Promise.resolve(onConfirm());
        } finally {
            closeModal();
        }
    });
    
    cancelBtn.addEventListener('click', () => {
        if (onCancel) onCancel();
        closeModal();
    });
}

// ===== NOTIFICATION SYSTEM =====
let notificationsList = [];
let currentFilter = 'all';

// Initialize notifications on dashboard load
function initializeNotifications() {
    setupNotificationBellListener();
    loadNotifications();
    startNotificationListener();
}

// Setup notification bell click listener
function setupNotificationBellListener() {
    const notificationBell = document.getElementById('notificationBell');
    if (notificationBell) {
        notificationBell.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleNotificationPanel();
        });
    }
    
    // Close panel when clicking outside
    document.addEventListener('click', function(e) {
        const panel = document.getElementById('notificationPanel');
        const bell = document.getElementById('notificationBell');
        if (panel && bell && !panel.contains(e.target) && !bell.contains(e.target)) {
            closeNotificationPanel();
        }
    });
}

// Toggle notification panel visibility
function toggleNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    if (panel) {
        panel.classList.toggle('active');
    }
}

// Close notification panel
function closeNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    if (panel) {
        panel.classList.remove('active');
    }
}

// Load notifications from backend notifications table
async function loadNotifications() {
    try {
        // Fetch notifications from backend with cache-busting
        const response = await fetch(`${API_BASE}/notifications?t=${Date.now()}`, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        if (response.ok) {
            const notifications = await response.json();
            // Map notifications from database
            notificationsList = notifications.map(notif => ({
                id: notif.id,
                title: notif.title,
                message: notif.message,
                type: notif.type,
                icon: notif.icon || 'fas fa-bell',
                timestamp: new Date(notif.created_at),
                read: notif.read,
                category: notif.category || 'System'
            }));
        } else {
            notificationsList = [];
        }
    } catch (error) {
        console.log('Loading notifications from backend:', error.message);
        notificationsList = [];
    }
    
    updateNotificationUI();
}

// Get sample notifications for demo
function getSampleNotifications() {
    return [
        {
            id: 1,
            title: 'New Patient Created',
            message: 'Patient John Doe has been registered',
            type: 'created',
            icon: 'fas fa-user-plus',
            timestamp: new Date(Date.now() - 5 * 60000),
            read: false,
            category: 'Design'
        },
        {
            id: 2,
            title: 'Device Status Updated',
            message: 'Device Mon-001 is now online',
            type: 'updated',
            icon: 'fas fa-laptop',
            timestamp: new Date(Date.now() - 15 * 60000),
            read: false,
            category: 'Engineering'
        },
        {
            id: 3,
            title: 'Employee Deleted',
            message: 'Employee ID EMP-045 has been removed',
            type: 'deleted',
            icon: 'fas fa-user-times',
            timestamp: new Date(Date.now() - 30 * 60000),
            read: true,
            category: 'Design'
        },
        {
            id: 4,
            title: 'Department Updated',
            message: 'Cardiology department info updated',
            type: 'updated',
            icon: 'fas fa-building',
            timestamp: new Date(Date.now() - 1 * 3600000),
            read: true,
            category: 'Engineering'
        },
        {
            id: 5,
            title: 'New Alert Created',
            message: 'High priority alert: Server temperature high',
            type: 'created',
            icon: 'fas fa-exclamation-triangle',
            timestamp: new Date(Date.now() - 2 * 3600000),
            read: true,
            category: 'Engineering'
        }
    ];
}

// Update notification UI
function updateNotificationUI() {
    const badge = document.getElementById('notificationBadge');
    const notificationList = document.getElementById('notificationList');
    
    // Update badge
    const unreadCount = notificationsList.filter(n => !n.read).length;
    if (badge) {
        badge.textContent = unreadCount;
        if (unreadCount > 0) {
            badge.classList.add('active');
        } else {
            badge.classList.remove('active');
        }
    }
    
    // Update notification list
    renderNotifications(currentFilter);
}

// Render notifications based on filter
function renderNotifications(filter) {
    const notificationList = document.getElementById('notificationList');
    if (!notificationList) return;
    
    currentFilter = filter;
    
    let filteredNotifications = notificationsList;
    if (filter !== 'all') {
        filteredNotifications = notificationsList.filter(n => n.type === filter);
    }
    
    if (filteredNotifications.length === 0) {
        notificationList.innerHTML = `
            <div class="notification-empty">
                <i class="fas fa-inbox"></i>
                <p>No ${filter === 'all' ? '' : filter + ' '} notifications</p>
            </div>
        `;
        return;
    }
    
    notificationList.innerHTML = filteredNotifications.map(notification => `
        <div class="notification-item ${notification.read ? '' : 'unread'}" onclick="markNotificationAsRead(${notification.id})">
            <div class="notification-icon ${notification.type}">
                <i class="${notification.icon}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${escapeHtml(notification.title)}</div>
                <div class="notification-message">${escapeHtml(notification.message)}</div>
                <div class="notification-meta">
                    <span class="notification-badge ${notification.type}">${notification.type}</span>
                    <span>${formatTimeAgo(new Date(notification.timestamp))}</span>
                </div>
            </div>
        </div>
    `).join('');
    
    // Update filter buttons
    updateFilterButtons();
}

// Update filter button states
function updateFilterButtons() {
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase() === currentFilter) {
            btn.classList.add('active');
        }
    });
}

// Filter notifications by type
function filterNotifications(type) {
    renderNotifications(type);
}

// Mark notification as read
function markNotificationAsRead(id) {
    const notification = notificationsList.find(n => n.id === id);
    if (notification && !notification.read) {
        notification.read = true;
        
        // Send to backend
        fetch(`${API_BASE}/notifications/${id}/read`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        }).catch(err => console.log('Could not sync with backend:', err));
        
        updateNotificationUI();
    }
}

// Clear all notifications  
async function clearAllNotifications() {
    showConfirmModal(
        'Are you sure you want to clear all notifications?',
        async () => {
            try {
                console.log('Starting clear notifications...');
                
                // First, clear the UI immediately
                notificationsList = [];
                updateNotificationUI();
                console.log('UI cleared, notificationsList is now:', notificationsList);
                
                // Then send to backend with cache-busting
                const response = await fetch(`${API_BASE}/notifications?t=${Date.now()}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache'
                    },
                    cache: 'no-store'
                });
                
                console.log('Delete request completed, status:', response.status);
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('Backend cleared:', result);
                    
                    // Close notification panel
                    closeNotificationPanel();
                    
                    // Show success message
                    showNotificationToast('✓ Success', 'All notifications have been cleared', 'deleted');
                    
                    // Reload to verify backend is clear
                    loadNotifications();
                } else {
                    console.error('Failed to clear notifications on backend, status:', response.status);
                    const errorText = await response.text();
                    console.error('Error response:', errorText);
                    // Reload notifications from backend in case of error
                    loadNotifications();
                    showNotificationToast('Error', 'Failed to clear notifications', 'error');
                }
            } catch (err) {
                console.error('Error clearing notifications:', err);
                // Reload notifications from backend in case of error
                loadNotifications();
                showNotificationToast('Error', 'An error occurred while clearing notifications', 'error');
            }
        }
    );
}

// Start listening for new notifications (by polling notifications)
function startNotificationListener() {
    let lastCheckTime = new Date();
    
    // Poll for new notifications every 10 seconds
    setInterval(async () => {
        try {
            const response = await fetch(`${API_BASE}/notifications?t=${Date.now()}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            if (response.ok) {
                const notifications = await response.json();
                const newNotifications = notifications.map(notif => ({
                    id: notif.id,
                    title: notif.title,
                    message: notif.message,
                    type: notif.type,
                    icon: notif.icon || 'fas fa-bell',
                    timestamp: new Date(notif.created_at),
                    read: notif.read,
                    category: notif.category || 'System'
                }));
                
                // Check for new notifications
                const existingIds = notificationsList.map(n => n.id);
                const addedNotifications = newNotifications.filter(n => !existingIds.includes(n.id));
                
                if (addedNotifications && addedNotifications.length > 0) {
                    // Add new notifications to the list
                    notificationsList = [...addedNotifications, ...notificationsList];
                    updateNotificationUI();
                    
                    // Show toast for each new notification
                    addedNotifications.forEach(notif => {
                        showNotificationToast(notif.title, notif.message, notif.type);
                    });
                }
                lastCheckTime = new Date();
            }
        } catch (error) {
            // Silently fail if backend is not available
            console.log('Notification polling failed:', error.message);
        }
    }, 10000);
}

// Add new notification (can be called from other parts of the app)
function addNotification(title, message, type = 'created', category = 'General') {
    const newNotification = {
        id: notificationsList.length + 1,
        title: title,
        message: message,
        type: type,
        icon: getIconForType(type),
        timestamp: new Date(),
        read: false,
        category: category
    };
    
    notificationsList.unshift(newNotification);
    updateNotificationUI();
    
    // Show toast notification
    showNotificationToast(title, message, type);
}

// Get appropriate icon based on notification type
function getIconForType(type) {
    const icons = {
        'created': 'fas fa-plus-circle',
        'updated': 'fas fa-edit',
        'deleted': 'fas fa-trash-alt',
        'default': 'fas fa-bell'
    };
    return icons[type] || icons['default'];
}

// Show toast notification
function showNotificationToast(title, message, type) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `notification-toast notification-toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="${getIconForType(type)}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${escapeHtml(title)}</div>
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    // Add toast styles if not already present
    if (!document.querySelector('#notificationToastStyles')) {
        const style = document.createElement('style');
        style.id = 'notificationToastStyles';
        style.textContent = `
            .notification-toast {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                padding: 16px;
                display: flex;
                gap: 12px;
                align-items: flex-start;
                max-width: 400px;
                z-index: 2000;
                animation: slideInRight 0.3s ease;
            }
            @keyframes slideInRight {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            .toast-icon {
                width: 40px;
                height: 40px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                flex-shrink: 0;
            }
            .notification-toast-created .toast-icon {
                background: #dcfce7;
                color: #16a34a;
            }
            .notification-toast-updated .toast-icon {
                background: #e0f2fe;
                color: #0284c7;
            }
            .notification-toast-deleted .toast-icon {
                background: #fee2e2;
                color: #dc2626;
            }
            .toast-content {
                flex: 1;
            }
            .toast-title {
                font-weight: 600;
                color: #1e293b;
                margin-bottom: 2px;
                font-size: 14px;
            }
            .toast-message {
                font-size: 12px;
                color: #64748b;
            }
            .toast-close {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #94a3b8;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .toast-close:hover {
                color: #1e293b;
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    // Auto-remove toast after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
}



// End of dashboard functions