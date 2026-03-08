// PatientPulse Dashboard - Enhanced JavaScript
// Handles dashboard interactions, global search, and auto-refresh

// Only declare API_BASE if not already declared
if (typeof API_BASE === 'undefined') {
    var API_BASE = 'http://localhost:3001/api';
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

// ===== NOTIFICATION SYSTEM =====



// End of dashboard functions