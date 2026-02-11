// dashboard.js
// Handles dashboard interactions with database API

// Only run on dashboard page
const isDashboardPage = document.querySelector('.dashboard-header') !== null;

document.addEventListener('DOMContentLoaded', function () {
    // Only load dashboard stats if on dashboard page
    if (isDashboardPage) {
        loadDashboardStats();
        loadRecentActivity();
        
        // Refresh button
        const refreshBtn = document.querySelector('.refresh button');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function () {
                loadDashboardStats();
                loadRecentActivity();
                updateLastUpdated();
            });
        }

        // Update time on load
        updateLastUpdated();

        // Auto-refresh every 30 seconds
        setInterval(() => {
            loadDashboardStats();
            loadRecentActivity();
            updateLastUpdated();
        }, 30000);
    }

    // Notification bell (works on all pages)
    const notification = document.querySelector('.notification');
    if (notification) {
        notification.addEventListener('click', function () {
            window.location.href = './alerts.html';
        });
    }
});

// Dashboard API base URL
const DASHBOARD_API = 'http://localhost:3001/api';

// Load stats from database
async function loadDashboardStats() {
    try {
        // Fetch patients and devices in parallel
        const [patientsRes, devicesRes] = await Promise.all([
            fetch(`${DASHBOARD_API}/patients`),
            fetch(`${DASHBOARD_API}/devices`)
        ]);

        if (!patientsRes.ok || !devicesRes.ok) {
            throw new Error('Failed to fetch data');
        }

        const patients = await patientsRes.json();
        const devices = await devicesRes.json();

        // Update patient stats
        const totalPatients = patients.length;
        const activePatients = patients.filter(p => p.status === 'active').length;
        
        document.getElementById('totalPatients').textContent = totalPatients;
        document.getElementById('activePatients').textContent = `${activePatients} active`;

        // Update device stats
        const onlineDevices = devices.filter(d => d.status === 'online').length;
        const offlineDevices = devices.filter(d => d.status === 'offline').length;
        const warningDevices = devices.filter(d => d.status === 'warning').length;
        const totalDevices = devices.length;

        document.getElementById('onlineDevices').textContent = onlineDevices;
        document.getElementById('totalDevices').textContent = `${totalDevices} total`;
        document.getElementById('offlineDevices').textContent = offlineDevices;
        document.getElementById('warningDevices').textContent = `${warningDevices} warning`;

        // Update system status
        document.getElementById('systemStatus').textContent = 'Online';

        console.log('Dashboard stats updated successfully');

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        document.getElementById('systemStatus').textContent = 'Error';
        document.getElementById('totalPatients').textContent = '--';
        document.getElementById('onlineDevices').textContent = '--';
        document.getElementById('offlineDevices').textContent = '--';
    }
}

// Load recent activity from database
async function loadRecentActivity() {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;

    try {
        // Fetch patients and devices
        const [patientsRes, devicesRes] = await Promise.all([
            fetch(`${DASHBOARD_API}/patients`),
            fetch(`${DASHBOARD_API}/devices`)
        ]);

        if (!patientsRes.ok || !devicesRes.ok) {
            throw new Error('Failed to fetch activity data');
        }

        const patients = await patientsRes.json();
        const devices = await devicesRes.json();

        // Create activity items from patients and devices
        const activities = [];

        // Add patient activities
        patients.forEach(patient => {
            activities.push({
                type: 'patient',
                title: 'Patient registered',
                meta: `${patient.name} - ID: PT-${patient.patient_id || patient.id}`,
                date: new Date(patient.created_at),
                dotClass: 'dot-green',
                status: patient.status
            });
        });

        // Add device activities
        devices.forEach(device => {
            const isOnline = device.status === 'online';
            const isWarning = device.status === 'warning';
            activities.push({
                type: 'device',
                title: isOnline ? 'Device connected' : (isWarning ? 'Device warning' : 'Device offline'),
                meta: `${device.name} - ${device.location || 'Unknown location'}`,
                date: new Date(device.created_at || device.last_data_time),
                dotClass: isOnline ? 'dot-blue' : (isWarning ? 'dot-orange' : 'dot-red'),
                status: device.status
            });
        });

        // Sort by date (newest first) and take top 6
        activities.sort((a, b) => b.date - a.date);
        const recentActivities = activities.slice(0, 6);

        // Render activities
        if (recentActivities.length === 0) {
            activityList.innerHTML = `
                <li>
                    <span class="activity-dot dot-blue"></span>
                    <div class="activity-details">
                        <div class="activity-title">No recent activity</div>
                        <div class="activity-meta">Add patients or devices to see activity</div>
                    </div>
                </li>
            `;
        } else {
            activityList.innerHTML = recentActivities.map(activity => `
                <li>
                    <span class="activity-dot ${activity.dotClass}"></span>
                    <div class="activity-details">
                        <div class="activity-title">${activity.title}</div>
                        <div class="activity-meta">${activity.meta} · ${formatTimeAgo(activity.date)}</div>
                    </div>
                </li>
            `).join('');
        }

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

// Format time ago
function formatTimeAgo(date) {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
}

// Update last updated time
function updateLastUpdated() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    
    const lastUpdatedEl = document.querySelector('.last-updated');
    if (lastUpdatedEl) {
        lastUpdatedEl.textContent = `Last updated: ${timeString}`;
    }
    
    const lastUpdatedStat = document.getElementById('lastUpdated');
    if (lastUpdatedStat) {
        lastUpdatedStat.textContent = 'Just now';
    }
}

// Logout modal functions
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
    window.location.href = './login.html';
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const logoutModal = document.getElementById('logoutModal');
    if (e.target === logoutModal) {
        closeLogoutModal();
    }
});

