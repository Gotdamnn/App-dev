// Alert Management Page Script - Enhanced

if (typeof API_BASE === 'undefined') {
    var API_BASE = window.location.origin + '/api';
}
let alertsData = [];
let filteredAlerts = [];
let currentSeverityFilter = 'all';
let currentStatusFilter = 'all';
let currentCategoryFilter = 'all';
let searchQuery = '';
let currentPage = 1;
const alertsPerPage = 10;
let selectedAlertId = null;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadAlerts();
});

// Setup event listeners
function setupEventListeners() {
    const severityFilter = document.getElementById('severityFilter');
    const statusFilter = document.getElementById('statusFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    const searchInput = document.getElementById('searchInput');
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    const logoutBtn = document.querySelector('.logout-btn');

    if (severityFilter) {
        severityFilter.addEventListener('change', (e) => {
            currentSeverityFilter = e.target.value;
            currentPage = 1;
            applyFilters();
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            currentStatusFilter = e.target.value;
            currentPage = 1;
            applyFilters();
        });
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            currentCategoryFilter = e.target.value;
            currentPage = 1;
            applyFilters();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            currentPage = 1;
            applyFilters();
        });
    }

    if (prevPage) {
        prevPage.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderAlerts();
            }
        });
    }

    if (nextPage) {
        nextPage.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredAlerts.length / alertsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderAlerts();
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Close modal on overlay click
    const alertDetailModal = document.getElementById('alertDetailModal');
    if (alertDetailModal) {
        alertDetailModal.addEventListener('click', (e) => {
            if (e.target === alertDetailModal) {
                closeAlertModal();
            }
        });
    }
}

// Load alerts from backend
async function loadAlerts() {
    try {
        const response = await fetch(`${API_BASE}/alerts`);
        if (response.ok) {
            const data = await response.json();
            // Map API data to our format
            alertsData = data.map(alert => ({
                id: alert.id,
                title: alert.title || alert.alert_type,
                description: alert.description || `${alert.alert_type}: ${alert.values} (Normal: ${alert.normal_range})`,
                severity: mapSeverity(alert.severity),
                category: alert.category || 'system',
                status: alert.status,
                created_at: alert.created_at,
                source: alert.source || 'System'
            }));
        } else {
            console.error('Failed to load alerts');
            alertsData = [];
        }
    } catch (error) {
        console.error('Error loading alerts:', error);
        alertsData = [];
    }
    
    applyFilters();
}

// Map severity values
function mapSeverity(severity) {
    const severityMap = {
        'critical': 'critical',
        'high': 'critical',
        'medium': 'warning',
        'warning': 'warning',
        'low': 'info',
        'info': 'info'
    };
    return severityMap[severity?.toLowerCase()] || 'info';
}

// Apply all filters
function applyFilters() {
    filteredAlerts = alertsData.filter(alert => {
        // Severity filter
        if (currentSeverityFilter !== 'all' && alert.severity !== currentSeverityFilter) {
            return false;
        }
        
        // Status filter
        if (currentStatusFilter !== 'all' && alert.status !== currentStatusFilter) {
            return false;
        }
        
        // Category filter
        if (currentCategoryFilter !== 'all' && alert.category !== currentCategoryFilter) {
            return false;
        }
        
        // Search filter
        if (searchQuery) {
            const searchFields = [
                alert.title,
                alert.description,
                alert.category,
                alert.source
            ].join(' ').toLowerCase();
            
            if (!searchFields.includes(searchQuery)) {
                return false;
            }
        }
        
        return true;
    });
    
    // Sort by created_at (newest first)
    filteredAlerts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    renderAlerts();
    updateStats();
}

// Render alerts
function renderAlerts() {
    const alertsGrid = document.getElementById('alertsGrid');
    const alertsEmpty = document.getElementById('alertsEmpty');
    const alertsCount = document.getElementById('alertsCount');
    const paginationInfo = document.getElementById('paginationInfo');
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    
    if (!alertsGrid) return;
    
    // Calculate pagination
    const totalAlerts = filteredAlerts.length;
    const totalPages = Math.ceil(totalAlerts / alertsPerPage);
    const startIndex = (currentPage - 1) * alertsPerPage;
    const endIndex = Math.min(startIndex + alertsPerPage, totalAlerts);
    const paginatedAlerts = filteredAlerts.slice(startIndex, endIndex);
    
    // Update count
    if (alertsCount) {
        alertsCount.textContent = `Showing ${totalAlerts} alert${totalAlerts !== 1 ? 's' : ''}`;
    }
    
    // Update pagination info
    if (paginationInfo) {
        paginationInfo.textContent = totalAlerts > 0 
            ? `Showing ${startIndex + 1}-${endIndex} of ${totalAlerts}`
            : 'Showing 0-0 of 0';
    }
    
    // Update pagination buttons
    if (prevPage) prevPage.disabled = currentPage === 1;
    if (nextPage) nextPage.disabled = currentPage >= totalPages;
    
    // Render alerts or empty state
    if (paginatedAlerts.length === 0) {
        alertsGrid.innerHTML = '';
        if (alertsEmpty) alertsEmpty.style.display = 'block';
    } else {
        if (alertsEmpty) alertsEmpty.style.display = 'none';
        alertsGrid.innerHTML = paginatedAlerts.map(alert => createAlertCard(alert)).join('');
    }
}

// Create alert card HTML
function createAlertCard(alert) {
    const timeAgo = getTimeAgo(alert.created_at);
    const severityIcon = getSeverityIcon(alert.severity);
    const isResolved = alert.status === 'resolved';
    
    return `
        <div class="alert-card" data-alert-id="${alert.id}">
            <div class="alert-icon-wrapper ${alert.severity}">
                <i class="${severityIcon}"></i>
            </div>
            <div class="alert-content">
                <div class="alert-header">
                    <h4 class="alert-title">${escapeHtml(alert.title)}</h4>
                    <span class="alert-badge ${alert.severity}">
                        <i class="fas fa-circle"></i>
                        ${alert.severity}
                    </span>
                    ${isResolved ? '<span class="alert-badge resolved"><i class="fas fa-check"></i>Resolved</span>' : ''}
                </div>
                <p class="alert-description">${escapeHtml(alert.description)}</p>
                <div class="alert-meta">
                    <span class="alert-category">
                        <i class="${getCategoryIcon(alert.category)}"></i>
                        ${capitalizeFirst(alert.category)}
                    </span>
                    <span class="alert-meta-item">
                        <i class="fas fa-clock"></i>
                        ${timeAgo}
                    </span>
                    <span class="alert-meta-item">
                        <i class="fas fa-location-dot"></i>
                        ${escapeHtml(alert.source || 'System')}
                    </span>
                </div>
            </div>
            <div class="alert-actions">
                ${!isResolved ? `
                    <button class="btn-resolve" onclick="markAsResolved(${alert.id})">
                        <i class="fas fa-check"></i>
                        Resolve
                    </button>
                ` : `
                    <button class="btn-resolve resolved" disabled>
                        <i class="fas fa-check-double"></i>
                        Resolved
                    </button>
                `}
                <button class="btn-view" onclick="viewAlertDetails(${alert.id})" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-delete-alert" onclick="deleteAlert(${alert.id})" title="Delete Alert">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

// Get severity icon
function getSeverityIcon(severity) {
    const icons = {
        critical: 'fas fa-exclamation-triangle',
        warning: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle'
    };
    return icons[severity] || icons.info;
}

// Get category icon
function getCategoryIcon(category) {
    const icons = {
        system: 'fas fa-server',
        security: 'fas fa-shield-alt',
        device: 'fas fa-microchip',
        patient: 'fas fa-user-injured'
    };
    return icons[category] || 'fas fa-tag';
}

// Get time ago string
function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Update stats
function updateStats() {
    const totalCount = document.getElementById('totalAlertsCount');
    const criticalCount = document.getElementById('criticalAlertsCount');
    const warningCount = document.getElementById('warningAlertsCount');
    const infoCount = document.getElementById('infoAlertsCount');
    
    const activeAlerts = alertsData.filter(a => a.status === 'active');
    
    if (totalCount) totalCount.textContent = alertsData.length;
    if (criticalCount) criticalCount.textContent = activeAlerts.filter(a => a.severity === 'critical').length;
    if (warningCount) warningCount.textContent = activeAlerts.filter(a => a.severity === 'warning').length;
    if (infoCount) infoCount.textContent = activeAlerts.filter(a => a.severity === 'info').length;
}

// Mark alert as resolved
async function markAsResolved(alertId) {
    const alert = alertsData.find(a => a.id === alertId);
    if (!alert) return;
    
    try {
        // Try API call first
        const response = await fetch(`${API_BASE}/alerts/${alertId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...alert, status: 'resolved' })
        });
        
        if (response.ok) {
            alert.status = 'resolved';
        } else {
            // Fallback to local update
            alert.status = 'resolved';
        }
    } catch (error) {
        console.error('Error resolving alert:', error);
        // Fallback to local update
        alert.status = 'resolved';
    }
    
    applyFilters();
}

// View alert details
function viewAlertDetails(alertId) {
    const alert = alertsData.find(a => a.id === alertId);
    if (!alert) return;
    
    selectedAlertId = alertId;
    const modal = document.getElementById('alertDetailModal');
    const content = document.getElementById('alertDetailContent');
    const resolveBtn = document.getElementById('modalResolveBtn');
    
    if (!modal || !content) return;
    
    const isResolved = alert.status === 'resolved';
    const timestamp = new Date(alert.created_at);
    
    content.innerHTML = `
        <div class="alert-detail-header">
            <div class="alert-detail-icon ${alert.severity}">
                <i class="${getSeverityIcon(alert.severity)}"></i>
            </div>
            <div class="alert-detail-info">
                <h4>${escapeHtml(alert.title)}</h4>
                <div class="alert-detail-badges">
                    <span class="alert-badge ${alert.severity}">${alert.severity}</span>
                    <span class="alert-badge ${isResolved ? 'resolved' : 'warning'}">${alert.status}</span>
                </div>
            </div>
        </div>
        <div class="alert-detail-body">
            <div class="alert-detail-row">
                <span class="alert-detail-label">Description</span>
                <span class="alert-detail-value">${escapeHtml(alert.description)}</span>
            </div>
            <div class="alert-detail-row">
                <span class="alert-detail-label">Category</span>
                <span class="alert-detail-value">${capitalizeFirst(alert.category)}</span>
            </div>
            <div class="alert-detail-row">
                <span class="alert-detail-label">Source</span>
                <span class="alert-detail-value">${escapeHtml(alert.source || 'System')}</span>
            </div>
            <div class="alert-detail-row">
                <span class="alert-detail-label">Timestamp</span>
                <span class="alert-detail-value">${timestamp.toLocaleString()}</span>
            </div>
        </div>
    `;
    
    // Update resolve button
    if (resolveBtn) {
        if (isResolved) {
            resolveBtn.innerHTML = '<i class="fas fa-check-double"></i> Already Resolved';
            resolveBtn.disabled = true;
            resolveBtn.style.background = '#e5e7eb';
            resolveBtn.style.color = '#6b7280';
        } else {
            resolveBtn.innerHTML = '<i class="fas fa-check"></i> Mark as Resolved';
            resolveBtn.disabled = false;
            resolveBtn.style.background = '#22c55e';
            resolveBtn.style.color = 'white';
        }
    }
    
    modal.classList.add('active');
}

// Close alert modal
function closeAlertModal() {
    const modal = document.getElementById('alertDetailModal');
    if (modal) {
        modal.classList.remove('active');
        selectedAlertId = null;
    }
}

// Resolve from modal
function resolveFromModal() {
    if (selectedAlertId) {
        markAsResolved(selectedAlertId);
        closeAlertModal();
    }
}

// Delete alert
async function deleteAlert(alertId) {
    showConfirmModal(
        'Are you sure you want to delete this alert?',
        async () => {
            try {
                const response = await fetch(`${API_BASE}/alerts/${alertId}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    alertsData = alertsData.filter(a => a.id !== alertId);
                } else {
                    // Fallback to local delete
                    alertsData = alertsData.filter(a => a.id !== alertId);
                }
            } catch (error) {
                console.error('Error deleting alert:', error);
                // Fallback to local delete
                alertsData = alertsData.filter(a => a.id !== alertId);
            }
            
            applyFilters();
        }
    );
}

// Show custom confirmation modal
function showConfirmModal(message, onConfirm, onCancel) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog-custom';
    
    dialog.innerHTML = `
        <div class="modal-title-custom">localhost:3001 says</div>
        <div class="modal-buttons">
            <button class="btn-modal btn-modal-secondary" id="cancelBtn">Cancel</button>
            <button class="btn-modal btn-modal-primary" id="confirmBtn">OK</button>
        </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    
    const closeModal = () => {
        overlay.remove();
        document.body.style.overflow = '';
    };
    
    document.getElementById('confirmBtn').addEventListener('click', () => {
        if (onConfirm) onConfirm();
        closeModal();
    });
    
    document.getElementById('cancelBtn').addEventListener('click', () => {
        if (onCancel) onCancel();
        closeModal();
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
}

// Helper functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Logout functionality
function handleLogout() {
    showLogoutModal();
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
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
}
