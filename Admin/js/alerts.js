// Alert Management Page Script with API Integration

const API_BASE = 'http://localhost:3001/api';
let alertsData = [];
let currentFilter = 'all';
let currentSort = 'timestamp';

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadAlerts();
});

// Setup event listeners
function setupEventListeners() {
    const statusFilter = document.getElementById('statusFilter');
    const sortBy = document.getElementById('sortBy');
    const logoutBtn = document.querySelector('.logout-btn');

    if (statusFilter) {
        statusFilter.addEventListener('change', function(e) {
            currentFilter = e.target.value;
            renderAlerts();
        });
    }

    if (sortBy) {
        sortBy.addEventListener('change', function(e) {
            currentSort = e.target.value;
            renderAlerts();
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Add event delegation for action buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.action-btn.resolve')) {
            const btn = e.target.closest('.action-btn.resolve');
            const row = btn.closest('tr');
            const alertId = parseInt(row.dataset.alertId);
            markAlertResolved(alertId);
        }

        if (e.target.closest('.action-btn.details')) {
            const btn = e.target.closest('.action-btn.details');
            const row = btn.closest('tr');
            const alertId = parseInt(row.dataset.alertId);
            viewAlertDetails(alertId);
        }
    });
}

// Load alerts from backend
async function loadAlerts() {
    try {
        const response = await fetch(`${API_BASE}/alerts`);
        if (response.ok) {
            alertsData = await response.json();
            renderAlerts();
        } else {
            console.error('Failed to load alerts');
        }
    } catch (error) {
        console.error('Error loading alerts:', error);
    }
}

// Render alerts based on filter and sort
function renderAlerts() {
    let filtered = filterAlerts(alertsData);
    let sorted = sortAlerts(filtered);

    const tbody = document.querySelector('.alerts-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    sorted.forEach(alert => {
        const row = createAlertRow(alert);
        tbody.appendChild(row);
    });

    updateAlertCounts();
}

// Filter alerts
function filterAlerts(alerts) {
    if (currentFilter === 'all') {
        return alerts;
    }
    return alerts.filter(alert => alert.status === currentFilter || alert.severity === currentFilter);
}

// Sort alerts
function sortAlerts(alerts) {
    const sorted = [...alerts];

    switch (currentSort) {
        case 'timestamp':
            sorted.sort((a, b) => {
                const timeA = new Date(a.created_at);
                const timeB = new Date(b.created_at);
                return timeB - timeA; // Newest first
            });
            break;
        case 'severity':
            const severityOrder = { critical: 1, medium: 2, low: 3 };
            sorted.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
            break;
        case 'patient':
            sorted.sort((a, b) => (a.patient_name || '').localeCompare(b.patient_name || ''));
            break;
    }

    return sorted;
}

// Create alert row element
function createAlertRow(alert) {
    const row = document.createElement('tr');
    row.classList.add('alert-row', alert.severity);
    row.dataset.alertId = alert.id;

    const iconClass = alert.severity === 'critical' ? 'critical-icon' : 
                     alert.severity === 'medium' ? 'medium-icon' : 'resolved-icon';

    const statusClass = alert.status === 'active' ? 'active' : 'resolved';

    const timestamp = new Date(alert.created_at);
    const dateStr = timestamp.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
    const timeStr = timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const iconMapping = {
        'High Temperature': 'fas fa-thermometer-full',
        'Low Temperature': 'fas fa-thermometer-half',
        'High Heart Rate': 'fas fa-heart',
        'Low Heart Rate': 'fas fa-heart',
        'High Blood Pressure': 'fas fa-tint',
        'Low Blood Pressure': 'fas fa-tint',
        'Low Oxygen Saturation': 'fas fa-lungs',
        'Irregular Heart Rate': 'fas fa-heart-pulse'
    };

    const iconClass2 = iconMapping[alert.alert_type] || 'fas fa-exclamation-circle';

    row.innerHTML = `
        <td>
            <div class="alert-patient">
                <div class="alert-icon ${iconClass}">
                    <i class="${iconClass2}"></i>
                </div>
                <div class="alert-info">
                    <div class="patient-name">${alert.patient_name || 'Unknown'}</div>
                    <div class="alert-type">${alert.alert_type}</div>
                    <span class="severity-badge ${alert.severity}">${alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}</span>
                </div>
            </div>
        </td>
        <td>
            <div class="timestamp">${dateStr}</div>
            <div class="time">${timeStr}</div>
        </td>
        <td>
            <div class="values">${alert.values}</div>
            <div class="normal-range">${alert.normal_range}</div>
        </td>
        <td>
            <span class="status-badge ${statusClass}">${alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}</span>
        </td>
        <td>
            <div class="action-buttons">
                ${alert.status === 'active' ? '<button class="action-btn resolve" title="Mark Resolved"><i class="fas fa-check"></i></button>' : ''}
                <button class="action-btn details" title="View Details"><i class="fas fa-eye"></i></button>
            </div>
        </td>
    `;

    return row;
}

// Mark alert as resolved
async function markAlertResolved(alertId) {
    const alert = alertsData.find(a => a.id === alertId);
    if (alert) {
        try {
            const response = await fetch(`${API_BASE}/alerts/${alertId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    alert_type: alert.alert_type,
                    severity: alert.severity,
                    values: alert.values,
                    normal_range: alert.normal_range,
                    status: 'resolved',
                    icon_class: alert.icon_class
                })
            });

            if (response.ok) {
                alert.status = 'resolved';
                renderAlerts();
            }
        } catch (error) {
            console.error('Error marking alert as resolved:', error);
            alert.status = 'resolved';
            renderAlerts();
        }
    }
}

// View alert details
function viewAlertDetails(alertId) {
    const alert = alertsData.find(a => a.id === alertId);
    if (alert) {
        alert('Alert Details:\n\nPatient: ' + (alert.patient_name || 'Unknown') + '\nAlert Type: ' + alert.alert_type + 
              '\nSeverity: ' + alert.severity.toUpperCase() + '\nTimestamp: ' + new Date(alert.created_at).toLocaleString() + 
              '\nCurrent Values: ' + alert.values + '\nNormal Range: ' + alert.normal_range + 
              '\nStatus: ' + alert.status.toUpperCase());
    }
}

// Update alert counts on stat cards
function updateAlertCounts() {
    const activeCount = alertsData.filter(a => a.status === 'active').length;
    const criticalCount = alertsData.filter(a => a.severity === 'critical' && a.status === 'active').length;
    const resolvedCount = alertsData.filter(a => a.status === 'resolved').length;
    const mediumCount = alertsData.filter(a => a.severity === 'medium' && a.status === 'active').length;

    const statCards = document.querySelectorAll('.alert-stat-card');
    if (statCards.length >= 4) {
        statCards[0].querySelector('.stat-number').textContent = activeCount;
        statCards[1].querySelector('.stat-number').textContent = criticalCount;
        statCards[2].querySelector('.stat-number').textContent = resolvedCount;
        statCards[3].querySelector('.stat-number').textContent = mediumCount;
    }
}

// Logout functionality
function handleLogout() {
    if (confirm('Are you sure you want to log out?')) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'login.html';
    }
}
