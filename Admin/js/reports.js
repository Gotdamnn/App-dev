// Reports & Analytics + Complaints Page Script

if (typeof API_BASE === 'undefined') {
    var API_BASE = 'http://localhost:3001/api';
}

let activityChart = null;
let departmentChart = null;
let activityData = [];
let topEmployeesChart = null;
let topDepartmentsChart = null;
let currentReportType = 'employee';
let notifications = [];

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Reports page DOMContentLoaded firing...');
    
    initializeDateFilters();
    setupEventListeners();
    loadDashboardData();
    loadActivities();
    initializeCharts();
    
    // Load all reports on page load with a small delay to ensure DOM is ready
    setTimeout(async () => {
        console.log('📊 Loading all reports and stats...');
        try {
            await loadEmployeeReports();
            await loadEmployeeStats();
            await loadDepartmentReports();
            await loadDepartmentStats();
            console.log('✅ All reports loaded');
        } catch (err) {
            console.error('❌ Error loading reports:', err);
        }
    }, 200);
    
    // Setup Bootstrap tab switching with proper event handling
    const empTabLink = document.querySelector('a[href="#employeeReports"]');
    const deptTabLink = document.querySelector('a[href="#departmentReports"]');
    const analyticsTabLink = document.querySelector('a[href="#analytics"]');
    
    if (empTabLink) {
        console.log('✓ Employee tab link found');
        empTabLink.addEventListener('shown.bs.tab', () => {
            console.log('📂 Employee tab shown');
            loadEmployeeReports();
            loadEmployeeStats();
        });
        empTabLink.addEventListener('click', () => {
            // Also load on click for better responsiveness
            setTimeout(() => {
                loadEmployeeReports();
                loadEmployeeStats();
            }, 50);
        });
    } else {
        console.warn('⚠️ Employee tab link not found');
    }
    
    if (deptTabLink) {
        console.log('✓ Department tab link found');
        deptTabLink.addEventListener('shown.bs.tab', () => {
            console.log('📂 Department tab shown');
            loadDepartmentReports();
            loadDepartmentStats();
        });
        deptTabLink.addEventListener('click', () => {
            // Also load on click for better responsiveness
            setTimeout(() => {
                loadDepartmentReports();
                loadDepartmentStats();
            }, 50);
        });
    } else {
        console.warn('⚠️ Department tab link not found');
    }
    
    if (analyticsTabLink) {
        console.log('✓ Analytics tab link found');
        analyticsTabLink.addEventListener('shown.bs.tab', () => {
            loadActivities();
        });
    } else {
        console.warn('⚠️ Analytics tab link not found');
    }
    
    // Load modal data
    setTimeout(() => {
        loadEmployeesForDropdown();
        loadDepartmentsForDropdown();
    }, 250);
    
    // Load notifications
    loadNotifications();
    // Refresh notifications every 30 seconds
    setInterval(loadNotifications, 30000);
    
    console.log('✅ Reports page initialization complete');
});

// ===== ANALYTICS SECTION =====

async function loadActivities() {
    try {
        const response = await fetch(`${API_BASE}/reports/activities`);
        if (response.ok) {
            const data = await response.json();
            activityData = data.map(act => ({
                id: act.id,
                activity: act.activity_type,
                user: act.user_name,
                department: act.department,
                timestamp: new Date(act.created_at),
                status: act.status === 'success' ? 'active' : 'inactive'
            }));
            renderActivityTable(activityData);
        } else {
            console.error('Failed to load activities');
            activityData = [];
            renderActivityTable([]);
        }
    } catch (error) {
        console.error('Error loading activities:', error);
        activityData = [];
        renderActivityTable([]);
    }
}

function initializeDateFilters() {
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    
    if (startDate && endDate) {
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        endDate.value = formatDate(today);
        startDate.value = formatDate(thirtyDaysAgo);
    }
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function setupEventListeners() {
    const logoutBtn = document.querySelector('.logout-btn');
    const applyDateFilter = document.getElementById('applyDateFilter');
    const activitySearch = document.getElementById('activitySearch');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    if (applyDateFilter) {
        applyDateFilter.addEventListener('click', applyFilters);
    }
    
    if (activitySearch) {
        activitySearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = activityData.filter(act => 
                (act.activity || '').toLowerCase().includes(query) ||
                (act.user || '').toLowerCase().includes(query) ||
                (act.department || '').toLowerCase().includes(query)
            );
            renderActivityTable(filtered);
        });
    }
    
    // Report section listeners
    const newReportBtn = document.getElementById('newReportBtn');
    if (newReportBtn) newReportBtn.addEventListener('click', openNewReportModal);
    
    const empFilterBtn = document.getElementById('empFilterBtn');
    if (empFilterBtn) empFilterBtn.addEventListener('click', () => loadEmployeeReports());
    
    const deptFilterBtn = document.getElementById('deptFilterBtn');
    if (deptFilterBtn) deptFilterBtn.addEventListener('click', () => loadDepartmentReports());
    
    // Report type radio buttons
    document.querySelectorAll('input[name="reportType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentReportType = e.target.value;
            toggleReportForm();
        });
    });
    
    // Chart period buttons
    document.querySelectorAll('.chart-option-btn[data-period]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.chart-option-btn[data-period]').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            updateActivityChart(e.target.dataset.period);
        });
    });
    
    // Chart type buttons
    document.querySelectorAll('.chart-option-btn[data-type]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.chart-option-btn[data-type]').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            updateDepartmentChart(e.target.dataset.type);
        });
    });
}

async function loadDashboardData() {
    try {
        const patientsRes = await fetch(`${API_BASE}/patients`);
        if (patientsRes.ok) {
            const patients = await patientsRes.json();
            const totalEl = document.getElementById('totalPatients');
            if (totalEl) totalEl.textContent = patients.length;
        }
        
        const employeesRes = await fetch(`${API_BASE}/employees`);
        if (employeesRes.ok) {
            const employees = await employeesRes.json();
            const activeEmployees = employees.filter(e => e.employment_status === 'Active' || !e.employment_status);
            const totalEl = document.getElementById('totalEmployees');
            if (totalEl) totalEl.textContent = activeEmployees.length;
        }
        
        const departmentsRes = await fetch(`${API_BASE}/departments`);
        if (departmentsRes.ok) {
            const departments = await departmentsRes.json();
            const activeDepts = departments.filter(d => d.status === 'Active' || !d.status);
            const totalEl = document.getElementById('totalDepartments');
            if (totalEl) totalEl.textContent = activeDepts.length;
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function initializeCharts() {
    initActivityChart();
    initDepartmentChart();
}

function initActivityChart() {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;
    
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const data = {
        labels: labels,
        datasets: [
            {
                label: 'Patient Registrations',
                data: [65, 78, 90, 81, 86, 95],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4
            },
            {
                label: 'Alerts Generated',
                data: [28, 48, 40, 19, 36, 27],
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                fill: true,
                tension: 0.4
            },
            {
                label: 'System Events',
                data: [45, 52, 61, 49, 58, 69],
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                fill: true,
                tension: 0.4
            }
        ]
    };
    
    activityChart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { usePointStyle: true, padding: 20 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0, 0, 0, 0.05)' }
                },
                x: {
                    grid: { display: false }
                }
            },
            interaction: { intersect: false, mode: 'index' }
        }
    });
}

function initDepartmentChart() {
    const ctx = document.getElementById('departmentChart');
    if (!ctx) return;
    
    const data = {
        labels: ['Emergency', 'ICU', 'General Ward', 'Cardiology', 'Neurology', 'Pediatrics'],
        datasets: [{
            label: 'Patient Count',
            data: [24, 12, 45, 18, 15, 22],
            backgroundColor: ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4'],
            borderRadius: 8,
            borderSkipped: false
        }]
    };
    
    departmentChart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function updateActivityChart(period) {
    if (!activityChart) return;
    
    let labels, data1, data2, data3;
    
    if (period === '12months') {
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        data1 = [65, 78, 90, 81, 86, 95, 88, 92, 87, 94, 101, 108];
        data2 = [28, 48, 40, 19, 36, 27, 32, 24, 35, 29, 22, 18];
        data3 = [45, 52, 61, 49, 58, 69, 55, 63, 58, 67, 72, 78];
    } else {
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        data1 = [65, 78, 90, 81, 86, 95];
        data2 = [28, 48, 40, 19, 36, 27];
        data3 = [45, 52, 61, 49, 58, 69];
    }
    
    activityChart.data.labels = labels;
    activityChart.data.datasets[0].data = data1;
    activityChart.data.datasets[1].data = data2;
    activityChart.data.datasets[2].data = data3;
    activityChart.update();
}

function updateDepartmentChart(type) {
    if (!departmentChart) return;
    
    const ctx = document.getElementById('departmentChart');
    departmentChart.destroy();
    
    const data = {
        labels: ['Emergency', 'ICU', 'General Ward', 'Cardiology', 'Neurology', 'Pediatrics'],
        datasets: [{
            label: 'Patient Count',
            data: [24, 12, 45, 18, 15, 22],
            backgroundColor: ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4'],
            borderRadius: type === 'bar' ? 8 : 0,
            borderSkipped: false
        }]
    };
    
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: type === 'pie',
                position: 'right',
                labels: { usePointStyle: true, padding: 15 }
            }
        }
    };
    
    if (type === 'bar') {
        options.scales = {
            y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
            x: { grid: { display: false } }
        };
    }
    
    departmentChart = new Chart(ctx, {
        type: type,
        data: data,
        options: options
    });
}

function renderActivityTable(activities) {
    const tbody = document.getElementById('activityTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = activities.map(act => `
        <tr>
            <td>${escapeHtml(act.activity)}</td>
            <td>${escapeHtml(act.user)}</td>
            <td><span class="dept-badge">${escapeHtml(act.department)}</span></td>
            <td>${formatTimestamp(act.timestamp)}</td>
            <td><span class="status-dot ${act.status}">${capitalizeFirst(act.status)}</span></td>
        </tr>
    `).join('');
}

function formatTimestamp(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function applyFilters() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59);
    
    const filtered = activityData.filter(act => {
        const actDate = new Date(act.timestamp);
        return actDate >= start && actDate <= end;
    });
    
    renderActivityTable(filtered);
    showNotification('Filters applied successfully');
}

function exportCSV() {
    const headers = ['Activity', 'User', 'Department', 'Timestamp', 'Status'];
    const rows = activityData.map(act => [
        act.activity || '',
        act.user || '',
        act.department || '',
        new Date(act.timestamp).toLocaleString(),
        act.status || ''
    ]);
    
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
        csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    downloadFile(csvContent, 'report.csv', 'text/csv');
    showNotification('CSV exported successfully');
}

function exportPDF() {
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>PatientPulse Report</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #333; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                th { background: #f5f5f5; }
            </style>
        </head>
        <body>
            <h1>PatientPulse Analytics Report</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <h3>Recent Activity</h3>
            <table>
                <thead>
                    <tr>
                        <th>Activity</th>
                        <th>User</th>
                        <th>Department</th>
                        <th>Timestamp</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${activityData.map(act => `
                        <tr>
                            <td>${act.activity || ''}</td>
                            <td>${act.user || ''}</td>
                            <td>${act.department || ''}</td>
                            <td>${new Date(act.timestamp).toLocaleString()}</td>
                            <td>${act.status || ''}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ===== COMPLAINTS SECTION =====

async function loadEmployeeReports() {
    const tbody = document.getElementById('employeeReportsBody');
    if (!tbody) {
        console.error('❌ employeeReportsBody element not found');
        return;
    }

    try {
        const search = document.getElementById('empSearch')?.value || '';
        const status = document.getElementById('empStatusFilter')?.value || '';
        const severity = document.getElementById('empSeverityFilter')?.value || '';

        const params = new URLSearchParams({ search, status, severity, page: 1, limit: 10 });
        const url = `${API_BASE}/employee-reports?${params}`;
        console.log('📡 Fetching employee reports from:', url);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Employee reports response:', data);
        
        if (data.success && data.data) {
            console.log(`📊 Displaying ${data.data.length} employee reports`);
            displayEmployeeReports(data.data);
        } else {
            console.warn('⚠️ No success flag or data in response:', data);
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">Error loading reports: ' + (data.error || 'Unknown error') + '</td></tr>';
        }
    } catch (error) {
        console.error('❌ Error loading employee reports:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Error loading reports: ' + error.message + '</td></tr>';
    }
}

function displayEmployeeReports(reports) {
    const tbody = document.getElementById('employeeReportsBody');
    if (!tbody) return;
    
    if (!reports || reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No employee reports found</td></tr>';
        return;
    }

    tbody.innerHTML = reports.map(report => `
        <tr>
            <td>#${report.id}</td>
            <td>${report.employee_name || 'N/A'}</td>
            <td>${report.category || 'N/A'}</td>
            <td><span class="badge severity-${report.severity.toLowerCase()}">${report.severity}</span></td>
            <td><span class="badge status-${report.status.toLowerCase().replace(' ', '-')}">${report.status}</span></td>
            <td>${report.reported_by}</td>
            <td>${new Date(report.created_at).toLocaleDateString()}</td>
            <td><button class="btn btn-sm btn-info" onclick="viewEmployeeReportDetails(${report.id})">View</button></td>
        </tr>
    `).join('');
}

async function loadEmployeeStats() {
    try {
        const response = await fetch(`${API_BASE}/employee-reports-stats/summary`);
        const data = await response.json();

        if (data.success && data.data && data.data.summary) {
            const summary = data.data.summary;
            const el1 = document.getElementById('empTotalReports');
            if (el1) el1.textContent = summary.total_reports || 0;
            const el2 = document.getElementById('empOpenReports');
            if (el2) el2.textContent = summary.open_reports || 0;
            const el3 = document.getElementById('empCriticalReports');
            if (el3) el3.textContent = summary.critical_reports || 0;
            const el4 = document.getElementById('empResolvedReports');
            if (el4) el4.textContent = summary.resolved || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadDepartmentReports() {
    const tbody = document.getElementById('departmentReportsBody');
    if (!tbody) {
        console.error('❌ departmentReportsBody element not found');
        return;
    }

    try {
        const search = document.getElementById('deptSearch')?.value || '';
        const status = document.getElementById('deptStatusFilter')?.value || '';
        const severity = document.getElementById('deptSeverityFilter')?.value || '';

        const params = new URLSearchParams({ search, status, severity, page: 1, limit: 10 });
        const url = `${API_BASE}/department-reports?${params}`;
        console.log('📡 Fetching department reports from:', url);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Department reports response:', data);

        if (data.success && data.data) {
            console.log(`📊 Displaying ${data.data.length} department reports`);
            displayDepartmentReports(data.data);
        } else {
            console.warn('⚠️ No success flag or data in response:', data);
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">Error loading reports: ' + (data.error || 'Unknown error') + '</td></tr>';
        }
    } catch (error) {
        console.error('❌ Error loading department reports:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Error loading reports: ' + error.message + '</td></tr>';
    }
}

function displayDepartmentReports(reports) {
    const tbody = document.getElementById('departmentReportsBody');
    if (!tbody) return;
    
    if (!reports || reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No department reports found</td></tr>';
        return;
    }

    tbody.innerHTML = reports.map(report => `
        <tr>
            <td>#${report.id}</td>
            <td>${report.department_name || 'N/A'}</td>
            <td>${report.category || 'N/A'}</td>
            <td><span class="badge severity-${report.severity.toLowerCase()}">${report.severity}</span></td>
            <td><span class="badge status-${report.status.toLowerCase().replace(' ', '-')}">${report.status}</span></td>
            <td>${report.reported_by}</td>
            <td>${new Date(report.created_at).toLocaleDateString()}</td>
            <td><button class="btn btn-sm btn-info" onclick="viewDepartmentReportDetails(${report.id})">View</button></td>
        </tr>
    `).join('');
}

async function loadDepartmentStats() {
    try {
        const response = await fetch(`${API_BASE}/department-reports-stats/summary`);
        const data = await response.json();

        if (data.success && data.data && data.data.summary) {
            const summary = data.data.summary;
            const el1 = document.getElementById('deptTotalReports');
            if (el1) el1.textContent = summary.total_reports || 0;
            const el2 = document.getElementById('deptOpenReports');
            if (el2) el2.textContent = summary.open_reports || 0;
            const el3 = document.getElementById('deptCriticalReports');
            if (el3) el3.textContent = summary.critical_reports || 0;
            const el4 = document.getElementById('deptResolvedReports');
            if (el4) el4.textContent = summary.resolved || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function viewEmployeeReportDetails(reportId) {
    try {
        const response = await fetch(`${API_BASE}/employee-reports/${reportId}`);
        const data = await response.json();
        if (data.success) displayReportDetails(data.data, 'employee');
    } catch (error) {
        console.error('Error:', error);
    }
}

async function viewDepartmentReportDetails(reportId) {
    try {
        const response = await fetch(`${API_BASE}/department-reports/${reportId}`);
        const data = await response.json();
        if (data.success) displayReportDetails(data.data, 'department');
    } catch (error) {
        console.error('Error:', error);
    }
}

function displayReportDetails(report, type) {
    const modal = document.getElementById('reportDetailsModal');
    if (!modal) return;
    
    const statusOptions = ['Open', 'In Progress', 'Under Review', 'Resolved', 'Closed'];
    const targetField = type === 'employee' 
        ? `<p><strong>Employee:</strong> ${report.employee_name}</p>`
        : `<p><strong>Department:</strong> ${report.department_name}</p>`;

    const content = document.getElementById('reportDetailsContent');
    if (content) {
        content.innerHTML = `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <h5>${report.report_title}</h5>
                ${targetField}
                <p><strong>Category:</strong> ${report.category}</p>
                <p><strong>Severity:</strong> <span class="badge severity-${report.severity.toLowerCase()}">${report.severity}</span></p>
                <p><strong>Status:</strong>
                <select id="reportStatus" class="form-select" style="width: auto; display: inline-block;">
                    ${statusOptions.map(s => `<option value="${s}" ${report.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
                </p>
                <p><strong>Reported By:</strong> ${report.reported_by} (${report.reported_by_email})</p>
                <p><strong>Date:</strong> ${new Date(report.created_at).toLocaleString()}</p>
                <hr>
                <p><strong>Description:</strong></p>
                <p>${report.report_description}</p>
            </div>
        `;
    }
    
    modal.style.display = 'flex';
    
    const updateBtn = document.getElementById('updateReportBtn');
    if (updateBtn) {
        updateBtn.onclick = () => {
            updateReportStatus(report.id, type);
        };
    }
}

async function updateReportStatus(reportId, type) {
    const newStatus = document.getElementById('reportStatus').value;
    const endpoint = type === 'employee' 
        ? `/api/employee-reports/${reportId}`
        : `/api/department-reports/${reportId}`;

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        const data = await response.json();
        if (data.success) {
            closeReportDetailsModal();
            if (type === 'employee') {
                loadEmployeeReports();
                loadEmployeeStats();
            } else {
                loadDepartmentReports();
                loadDepartmentStats();
            }
            showNotification('Report updated successfully!');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error updating report');
    }
}

function toggleReportForm() {
    const empForm = document.getElementById('employeeReportForm');
    const deptForm = document.getElementById('departmentReportForm');

    if (currentReportType === 'employee') {
        if (empForm) empForm.style.display = 'block';
        if (deptForm) deptForm.style.display = 'none';
    } else {
        if (empForm) empForm.style.display = 'none';
        if (deptForm) deptForm.style.display = 'block';
    }
}

function openNewReportModal() {
    const modal = document.getElementById('newReportModal');
    if (modal) modal.style.display = 'flex';
}

function closeNewReportModal() {
    const modal = document.getElementById('newReportModal');
    if (modal) {
        modal.style.display = 'none';
        // Reset form
        document.getElementById('reportEmployee').value = '';
        document.getElementById('reportDepartment').value = '';
        document.getElementById('reportTitle').value = '';
        document.getElementById('reportDescription').value = '';
        document.getElementById('reportCategory').value = 'Conduct';
        document.getElementById('reportSeverity').value = 'Medium';
        document.getElementById('reportedByName').value = '';
        document.getElementById('reportedByEmail').value = '';
    }
}

function closeReportDetailsModal() {
    const modal = document.getElementById('reportDetailsModal');
    if (modal) modal.style.display = 'none';
}

async function loadEmployeesForDropdown() {
    try {
        const response = await fetch(`${API_BASE}/employees`);
        if (response.ok) {
            const employees = await response.json();
            const select = document.getElementById('reportEmployee');
            if (select) {
                const currentValue = select.value;
                const options = employees
                    .filter(emp => emp.employment_status === 'Active' || !emp.employment_status)
                    .map(emp => `<option value="${emp.employee_id}">${emp.first_name} ${emp.last_name}</option>`)
                    .join('');
                select.innerHTML = '<option value="">-- Select an Employee --</option>' + options;
                select.value = currentValue;
            }
        }
    } catch (error) {
        console.error('Error loading employees:', error);
    }
}

async function loadDepartmentsForDropdown() {
    try {
        const response = await fetch(`${API_BASE}/departments`);
        if (response.ok) {
            const departments = await response.json();
            const select = document.getElementById('reportDepartment');
            if (select) {
                const currentValue = select.value;
                const options = departments
                    .filter(dept => dept.status === 'Active' || !dept.status)
                    .map(dept => `<option value="${dept.department_id}">${dept.department_name}</option>`)
                    .join('');
                select.innerHTML = '<option value="">-- Select a Department --</option>' + options;
                select.value = currentValue;
            }
        }
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}

async function submitReport() {
    const reportType = currentReportType;
    const title = document.getElementById('reportTitle').value;
    const description = document.getElementById('reportDescription').value;
    const category = document.getElementById('reportCategory').value;
    const severity = document.getElementById('reportSeverity').value;
    const reportedByName = document.getElementById('reportedByName').value;
    const reportedByEmail = document.getElementById('reportedByEmail').value;

    if (!title || !description || !reportedByName || !reportedByEmail) {
        showNotification('Please fill in all required fields');
        return;
    }

    try {
        let endpoint, payload;

        if (reportType === 'employee') {
            const employeeId = document.getElementById('reportEmployee').value;
            if (!employeeId) {
                showNotification('Please select an employee');
                return;
            }
            endpoint = '/api/employee-reports';
            payload = {
                employee_id: employeeId,
                report_title: title,
                report_description: description,
                category: category,
                severity: severity,
                reported_by: reportedByName,
                reported_by_email: reportedByEmail,
                status: 'Open'
            };
        } else {
            const departmentId = document.getElementById('reportDepartment').value;
            if (!departmentId) {
                showNotification('Please select a department');
                return;
            }
            endpoint = '/api/department-reports';
            payload = {
                department_id: departmentId,
                report_title: title,
                report_description: description,
                category: category,
                severity: severity,
                reported_by: reportedByName,
                reported_by_email: reportedByEmail,
                status: 'Open'
            };
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.success) {
            closeNewReportModal();
            if (reportType === 'employee') {
                loadEmployeeReports();
                loadEmployeeStats();
            } else {
                loadDepartmentReports();
                loadDepartmentStats();
            }
            showNotification('Report submitted successfully!');
        } else {
            showNotification('Error submitting report: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error submitting report');
    }
}

// ===== UTILITY FUNCTIONS =====

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function showNotification(message) {
    console.log('Notification:', message);
    const notif = document.createElement('div');
    notif.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #28a745; color: white; padding: 15px 20px; border-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); z-index: 9999;';
    notif.textContent = message;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = '/login';
    }
}

// ===== NOTIFICATION SYSTEM =====

async function loadNotifications() {
    try {
        const patientsRes = await fetch(`${API_BASE}/patients`);
        const devicesRes = await fetch(`${API_BASE}/devices`);
        
        notifications = [];

        if (patientsRes.ok) {
            const patients = await patientsRes.json();
            patients.forEach(patient => {
                if (patient.status === 'critical') {
                    notifications.push({
                        id: `patient-${patient.id}-critical`,
                        title: `Patient Alert`,
                        message: `${patient.first_name} ${patient.last_name} is <strong>CRITICAL</strong>`,
                        type: 'critical',
                        icon: 'fa-exclamation-triangle',
                        timestamp: new Date()
                    });
                } else if (patient.status === 'warning') {
                    notifications.push({
                        id: `patient-${patient.id}-warning`,
                        title: `Patient Warning`,
                        message: `${patient.first_name} ${patient.last_name} is <strong>WARNING</strong>`,
                        type: 'warning',
                        icon: 'fa-exclamation-circle',
                        timestamp: new Date()
                    });
                }
            });
        }

        if (devicesRes.ok) {
            const devices = await devicesRes.json();
            devices.forEach(device => {
                if (device.status === 'offline') {
                    notifications.push({
                        id: `device-${device.id}-offline`,
                        title: `Device Offline`,
                        message: `<strong>${device.name || device.device_id || 'Unknown Device'}</strong> is OFFLINE`,
                        type: 'critical',
                        icon: 'fa-wifi',
                        timestamp: new Date()
                    });
                } else if (device.status === 'warning') {
                    notifications.push({
                        id: `device-${device.id}-warning`,
                        title: `Device Warning`,
                        message: `<strong>${device.name || device.device_id || 'Unknown Device'}</strong> has low battery`,
                        type: 'warning',
                        icon: 'fa-battery-quarter',
                        timestamp: new Date()
                    });
                }
            });
        }

        updateNotificationBadge();
        renderNotifications();
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        badge.textContent = notifications.length;
        if (notifications.length === 0) {
            badge.style.display = 'none';
        } else {
            badge.style.display = 'flex';
        }
    }
}

function renderNotifications() {
    const body = document.getElementById('notificationsBody');
    if (!body) return;

    if (notifications.length === 0) {
        body.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 20px;">No notifications</p>';
        return;
    }

    const sorted = notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    body.innerHTML = sorted.map(notif => `
        <div class="notification-item ${notif.type}">
            <div class="notification-icon" style="color: ${notif.type === 'critical' ? '#ef4444' : notif.type === 'warning' ? '#f59e0b' : '#3b82f6'}">
                <i class="fas ${notif.icon}"></i>
            </div>
            <div class="notification-content">
                <strong>${notif.title}</strong>
                <div>${notif.message}</div>
                <span>${formatTimeAgo(notif.timestamp)}</span>
            </div>
        </div>
    `).join('');
}

function formatTimeAgo(date) {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function openNotificationsModal() {
    const modal = document.getElementById('notificationsModal');
    if (modal) {
        modal.style.display = 'flex';
        loadNotifications();
    }
}

function closeNotificationsModal() {
    const modal = document.getElementById('notificationsModal');
    if (modal) modal.style.display = 'none';
}

function clearNotifications() {
    notifications = [];
    updateNotificationBadge();
    renderNotifications();
    showNotification('All notifications cleared');
}
