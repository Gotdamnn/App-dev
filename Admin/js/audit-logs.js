// Audit Logs JavaScript
if (typeof API_BASE === 'undefined') {
    var API_BASE = 'http://localhost:3001/api';
}

let auditLogs = [];
let currentPage = 1;
const itemsPerPage = 15;
let currentLogDetails = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadAuditLogs();
    setupEventListeners();
    setupLogoutModal();
});

// Setup event listeners
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentPage = 1;
                loadAuditLogs();
            }, 300);
        });
    }

    // Filter selects
    document.getElementById('actionTypeFilter')?.addEventListener('change', function() {
        currentPage = 1;
        loadAuditLogs();
    });

    document.getElementById('tableFilter')?.addEventListener('change', function() {
        currentPage = 1;
        loadAuditLogs();
    });

    document.getElementById('dateFromFilter')?.addEventListener('change', function() {
        currentPage = 1;
        loadAuditLogs();
    });

    document.getElementById('dateToFilter')?.addEventListener('change', function() {
        currentPage = 1;
        loadAuditLogs();
    });

    // Modal close buttons
    document.querySelectorAll('.modal-close, .btn-cancel').forEach(btn => {
        btn.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal');
            if (modalId) {
                closeModal(modalId);
            }
        });
    });

    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
            }
        });
    });

    // Pagination buttons
    document.getElementById('prevBtn')?.addEventListener('click', function() {
        if (currentPage > 1) {
            currentPage--;
            loadAuditLogs();
        }
    });

    document.getElementById('nextBtn')?.addEventListener('click', function() {
        currentPage++;
        loadAuditLogs();
    });
}

// Generate mock audit logs
function generateMockAuditLogs() {
    const actions = ['Create', 'Update', 'Delete', 'Login', 'Logout', 'View', 'Export'];
    const tables = ['Staff', 'Patients', 'Employees', 'Departments', 'Devices', 'Settings'];
    const admins = [
        'John Administrator',
        'Sarah Manager',
        'Michael Johnson',
        'Emily Davis',
        'Robert Wilson'
    ];

    const mockLogs = [];

    for (let i = 0; i < 100; i++) {
        const action = actions[Math.floor(Math.random() * actions.length)];
        const table = tables[Math.floor(Math.random() * tables.length)];
        const admin = admins[Math.floor(Math.random() * admins.length)];
        const timestamp = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);

        const beforeState = {
            id: Math.floor(Math.random() * 10000),
            name: `Previous ${table} Name`,
            email: `old@example.com`,
            status: 'Active'
        };

        const afterState = {
            id: Math.floor(Math.random() * 10000),
            name: `New ${table} Name`,
            email: `new@example.com`,
            status: action === 'Delete' ? 'Deleted' : 'Active'
        };

        mockLogs.push({
            id: i + 1,
            timestamp: timestamp,
            admin: admin,
            action: action,
            table: table,
            targetId: Math.floor(Math.random() * 50000),
            ipAddress: `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
            beforeState: action === 'Create' ? {} : beforeState,
            afterState: action === 'Delete' ? {} : afterState
        });
    }

    return mockLogs;
}

// Load audit logs
function loadAuditLogs() {
    try {
        // Build query parameters
        const searchTerm = document.getElementById('searchInput')?.value || '';
        const actionType = document.getElementById('actionTypeFilter')?.value || '';
        const table = document.getElementById('tableFilter')?.value || '';
        const dateFrom = document.getElementById('dateFromFilter')?.value || '';
        const dateTo = document.getElementById('dateToFilter')?.value || '';

        // Fetch from API
        const params = new URLSearchParams();
        if (searchTerm) params.append('adminName', searchTerm);
        if (actionType) params.append('action', actionType);
        if (table) params.append('tableName', table);
        if (dateFrom) params.append('dateFrom', dateFrom);
        if (dateTo) params.append('dateTo', dateTo);

        fetch(`${API_BASE}/audit-logs?${params}`)
            .then(response => {
                if (!response.ok) throw new Error('Failed to fetch audit logs');
                return response.json();
            })
            .then(data => {
                // Extract logs array from response
                auditLogs = Array.isArray(data) ? data : (data.logs || []);

                // Sort by timestamp descending
                auditLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

                // Pagination
                const totalPages = Math.ceil(auditLogs.length / itemsPerPage);
                if (currentPage > totalPages && totalPages > 0) {
                    currentPage = totalPages;
                }

                const start = (currentPage - 1) * itemsPerPage;
                const end = start + itemsPerPage;
                const paginatedItems = auditLogs.slice(start, end);

                // Update audit count
                document.getElementById('auditCount').textContent = `Total: ${auditLogs.length} logs`;

                // Update page info
                document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages || 1}`;

                // Enable/disable pagination buttons
                const prevBtn = document.getElementById('prevBtn');
                const nextBtn = document.getElementById('nextBtn');
                if (prevBtn) prevBtn.disabled = currentPage === 1;
                if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

                // Render table
                renderAuditTable(paginatedItems);
            })
            .catch(error => {
                console.error('Error loading audit logs:', error);
                alert('Failed to load audit logs: ' + error.message);
            });
    } catch (error) {
        console.error('Error loading audit logs:', error);
    }
}

// Render audit logs table
function renderAuditTable(items) {
    const tbody = document.getElementById('auditTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    items.forEach(log => {
        const row = document.createElement('tr');

        const actionClass = log.action.toLowerCase();
        const timestamp = new Date(log.created_at);
        const formattedDate = timestamp.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        row.innerHTML = `
            <td class="timestamp">${formattedDate}</td>
            <td class="admin-name">${log.admin_name}</td>
            <td>
                <span class="action-badge ${actionClass}">
                    ${log.action}
                </span>
            </td>
            <td class="target-table">${log.table_name}</td>
            <td><span class="target-id">#${log.target_id || 'N/A'}</span></td>
            <td><span class="ip-address">${log.ip_address || 'N/A'}</span></td>
            <td>
                <a class="view-details-link" onclick="openDetailsModal(${log.id})">
                    <i class="fas fa-eye"></i> View
                </a>
            </td>
        `;

        tbody.appendChild(row);
    });
}

// Open details modal
function openDetailsModal(logId) {
    const log = auditLogs.find(l => l.id === logId);
    if (!log) return;

    currentLogDetails = log;

    // Populate detail info
    const timestamp = new Date(log.created_at);
    const formattedDate = timestamp.toLocaleString();

    document.getElementById('detailTimestamp').textContent = formattedDate;
    document.getElementById('detailAdmin').textContent = log.admin_name;
    document.getElementById('detailAction').textContent = log.action;
    document.getElementById('detailTable').textContent = log.table_name;
    document.getElementById('detailIp').textContent = log.ip_address || 'N/A';

    // Format and display JSON states
    const beforeCode = document.querySelector('#beforeState code');
    const afterCode = document.querySelector('#afterState code');

    beforeCode.textContent = (log.before_state ? JSON.stringify(log.before_state, null, 2) : '{}');
    afterCode.textContent = (log.after_state ? JSON.stringify(log.after_state, null, 2) : '{}');

    // Generate change summary
    generateChangeSummary(log);

    openModal('detailsModal');
}

// Generate change summary
function generateChangeSummary(log) {
    const container = document.getElementById('changeSummary');
    if (!container) return;

    container.innerHTML = '';

    const action = log.action;
    const before = log.before_state || {};
    const after = log.after_state || {};

    let html = '<h4><i class="fas fa-list-check"></i> Changes Summary</h4>';

    if (action === 'Create') {
        html += '<div class="change-item"><div class="change-label">New Record Created</div>';
        Object.entries(after).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                html += `<div class="change-value"><strong>${key}:</strong> <span class="change-to">${JSON.stringify(value)}</span></div>`;
            }
        });
        html += '</div>';
    } else if (action === 'Delete') {
        html += '<div class="change-item"><div class="change-label">Record Deleted</div>';
        Object.entries(before).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                html += `<div class="change-value"><strong>${key}:</strong> <span class="change-from">${JSON.stringify(value)}</span></div>`;
            }
        });
        html += '</div>';
    } else if (action === 'Update') {
        const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

        allKeys.forEach(key => {
            if (before[key] !== after[key]) {
                html += `
                    <div class="change-item">
                        <div class="change-label">${key}</div>
                        <div class="change-value">
                            From: <span class="change-from">${JSON.stringify(before[key]) || 'empty'}</span><br>
                            To: <span class="change-to">${JSON.stringify(after[key]) || 'empty'}</span>
                        </div>
                    </div>
                `;
            }
        });

        if (allKeys.size === 0 || Array.from(allKeys).every(k => before[k] === after[k])) {
            html += '<div class="change-item"><div class="change-label">No Changes</div></div>';
        }
    } else {
        html += `<div class="change-item"><div class="change-label">${action} Action Performed</div></div>`;
    }

    container.innerHTML = html;
}

// Reset filters
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('actionTypeFilter').value = '';
    document.getElementById('tableFilter').value = '';
    document.getElementById('dateFromFilter').value = '';
    document.getElementById('dateToFilter').value = '';

    currentPage = 1;
    loadAuditLogs();
}

// Export audit logs
function exportAuditLogs() {
    try {
        // Use the API endpoint to export CSV
        window.location.href = `${API_BASE}/audit-logs/export/csv`;
    } catch (error) {
        console.error('Error exporting audit logs:', error);
        alert('Failed to export audit logs');
    }
}

// Modal functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
}

// Logout functions
function showLogoutModal() {
    openModal('logoutModal');
}

function performLogout() {
    window.location.href = 'login.html';
}

// Setup logout modal
function setupLogoutModal() {
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', showLogoutModal);
    }
}
