// ===== REPORTS AND COMPLAINTS MANAGEMENT =====

let currentReportType = 'employee';
let currentReportPage = 1;
let currentReportLimit = 10;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadEmployeeReports();
    loadEmployeeStats();
    
    // Event listeners
    document.getElementById('newReportBtn')?.addEventListener('click', openNewReportModal);
    document.getElementById('submitReportBtn')?.addEventListener('click', submitNewReport);
    
    // Report type toggle
    document.querySelectorAll('input[name="reportType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentReportType = e.target.value;
            toggleReportForm();
        });
    });

    // Tab listeners
    document.getElementById('analyticsTab')?.addEventListener('click', () => {
        // Analytics tab is already working with existing code
    });

    document.getElementById('employeeTab')?.addEventListener('click', () => {
        loadEmployeeReports();
        loadEmployeeStats();
    });

    document.getElementById('departmentTab')?.addEventListener('click', () => {
        loadDepartmentReports();
        loadDepartmentStats();
    });

    // Filter buttons
    document.getElementById('empFilterBtn')?.addEventListener('click', () => {
        currentReportPage = 1;
        loadEmployeeReports();
    });

    document.getElementById('deptFilterBtn')?.addEventListener('click', () => {
        currentReportPage = 1;
        loadDepartmentReports();
    });
});

// ===== EMPLOYEE REPORTS =====
async function loadEmployeeReports() {
    try {
        const search = document.getElementById('empSearch')?.value || '';
        const status = document.getElementById('empStatusFilter')?.value || '';
        const severity = document.getElementById('empSeverityFilter')?.value || '';

        const params = new URLSearchParams({
            search,
            status,
            severity,
            page: currentReportPage,
            limit: currentReportLimit
        });

        const response = await fetch(`/api/employee-reports?${params}`);
        const data = await response.json();

        if (data.success) {
            displayEmployeeReports(data.data);
        } else {
            console.error('Error loading reports:', data.error);
            document.getElementById('employeeReportsBody').innerHTML = 
                '<tr><td colspan="8" class="text-center text-danger">Error loading reports</td></tr>';
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function displayEmployeeReports(reports) {
    const tbody = document.getElementById('employeeReportsBody');
    
    if (!reports.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No employee reports found</td></tr>';
        return;
    }

    tbody.innerHTML = reports.map(report => `
        <tr>
            <td>#${report.id}</td>
            <td>${report.employee_name || 'N/A'}</td>
            <td>${report.category || 'N/A'}</td>
            <td>
                <span class="badge severity-${report.severity.toLowerCase()}">
                    ${report.severity}
                </span>
            </td>
            <td>
                <span class="badge status-${report.status.toLowerCase().replace(' ', '-')}">
                    ${report.status}
                </span>
            </td>
            <td>${report.reported_by}</td>
            <td>${new Date(report.created_at).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="viewEmployeeReportDetails(${report.id})">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        </tr>
    `).join('');
}

async function loadEmployeeStats() {
    try {
        const response = await fetch('/api/employee-reports-stats/summary');
        const data = await response.json();

        if (data.success) {
            const summary = data.data.summary;
            document.getElementById('empTotalReports').textContent = summary.total_reports || 0;
            document.getElementById('empOpenReports').textContent = summary.open_reports || 0;
            document.getElementById('empCriticalReports').textContent = summary.critical_reports || 0;
            document.getElementById('empResolvedReports').textContent = summary.resolved || 0;

            // Draw chart for top employees
            drawTopEmployeesChart(data.data.by_employee);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function drawTopEmployeesChart(data) {
    const canvas = document.getElementById('topEmployeesChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const labels = data.slice(0, 10).map(d => d.employee_name);
    const values = data.slice(0, 10).map(d => d.report_count);

    new Chart(ctx, {
        type: 'horizontalBar',
        data: {
            labels,
            datasets: [{
                label: 'Number of Reports',
                data: values,
                backgroundColor: 'rgba(255, 107, 107, 0.8)',
                borderColor: 'rgba(255, 107, 107, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { beginAtZero: true }
            }
        }
    });
}

async function viewEmployeeReportDetails(reportId) {
    try {
        const response = await fetch(`/api/employee-reports/${reportId}`);
        const data = await response.json();

        if (data.success) {
            displayReportDetails(data.data, 'employee');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// ===== DEPARTMENT REPORTS =====
async function loadDepartmentReports() {
    try {
        const search = document.getElementById('deptSearch')?.value || '';
        const status = document.getElementById('deptStatusFilter')?.value || '';
        const severity = document.getElementById('deptSeverityFilter')?.value || '';

        const params = new URLSearchParams({
            search,
            status,
            severity,
            page: currentReportPage,
            limit: currentReportLimit
        });

        const response = await fetch(`/api/department-reports?${params}`);
        const data = await response.json();

        if (data.success) {
            displayDepartmentReports(data.data);
        } else {
            console.error('Error loading reports:', data.error);
            document.getElementById('departmentReportsBody').innerHTML = 
                '<tr><td colspan="8" class="text-center text-danger">Error loading reports</td></tr>';
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function displayDepartmentReports(reports) {
    const tbody = document.getElementById('departmentReportsBody');
    
    if (!reports.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No department reports found</td></tr>';
        return;
    }

    tbody.innerHTML = reports.map(report => `
        <tr>
            <td>#${report.id}</td>
            <td>${report.department_name || 'N/A'}</td>
            <td>${report.category || 'N/A'}</td>
            <td>
                <span class="badge severity-${report.severity.toLowerCase()}">
                    ${report.severity}
                </span>
            </td>
            <td>
                <span class="badge status-${report.status.toLowerCase().replace(' ', '-')}">
                    ${report.status}
                </span>
            </td>
            <td>${report.reported_by}</td>
            <td>${new Date(report.created_at).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="viewDepartmentReportDetails(${report.id})">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        </tr>
    `).join('');
}

async function loadDepartmentStats() {
    try {
        const response = await fetch('/api/department-reports-stats/summary');
        const data = await response.json();

        if (data.success) {
            const summary = data.data.summary;
            document.getElementById('deptTotalReports').textContent = summary.total_reports || 0;
            document.getElementById('deptOpenReports').textContent = summary.open_reports || 0;
            document.getElementById('deptCriticalReports').textContent = summary.critical_reports || 0;
            document.getElementById('deptResolvedReports').textContent = summary.resolved || 0;

            // Draw chart for top departments
            drawTopDepartmentsChart(data.data.by_department);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function drawTopDepartmentsChart(data) {
    const canvas = document.getElementById('topDepartmentsChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const labels = data.slice(0, 10).map(d => d.department_name);
    const values = data.slice(0, 10).map(d => d.report_count);

    new Chart(ctx, {
        type: 'horizontalBar',
        data: {
            labels,
            datasets: [{
                label: 'Number of Reports',
                data: values,
                backgroundColor: 'rgba(255, 130, 34, 0.8)',
                borderColor: 'rgba(255, 130, 34, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { beginAtZero: true }
            }
        }
    });
}

async function viewDepartmentReportDetails(reportId) {
    try {
        const response = await fetch(`/api/department-reports/${reportId}`);
        const data = await response.json();

        if (data.success) {
            displayReportDetails(data.data, 'department');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// ===== COMMON FUNCTIONS =====
function toggleReportForm() {
    const empForm = document.getElementById('employeeReportForm');
    const deptForm = document.getElementById('departmentReportForm');

    if (currentReportType === 'employee') {
        empForm.style.display = 'block';
        deptForm.style.display = 'none';
    } else {
        empForm.style.display = 'none';
        deptForm.style.display = 'block';
    }
}

function openNewReportModal() {
    document.getElementById('newReportModal').style.display = 'flex';
}

function closeNewReportModal() {
    document.getElementById('newReportModal').style.display = 'none';
    // Clear form
    document.getElementById('reportTitle').value = '';
    document.getElementById('reportDescription').value = '';
    document.getElementById('reportedByName').value = '';
    document.getElementById('reportedByEmail').value = '';
}

function closeReportDetailsModal() {
    document.getElementById('reportDetailsModal').style.display = 'none';
}

async function submitNewReport() {
    const title = document.getElementById('reportTitle').value;
    const description = document.getElementById('reportDescription').value;
    const reportedBy = document.getElementById('reportedByName').value;
    const reportedByEmail = document.getElementById('reportedByEmail').value;
    const severity = document.getElementById('reportSeverity').value;
    const category = document.getElementById('reportCategory').value;

    if (!title || !description || !reportedBy || !reportedByEmail) {
        alert('Please fill in all required fields');
        return;
    }

    const endpoint = currentReportType === 'employee' ? '/api/employee-reports' : '/api/department-reports';
    
    const payload = {
        reported_by: reportedBy,
        reported_by_email: reportedByEmail,
        reported_by_type: 'Patient',
        report_title: title,
        report_description: description,
        severity: severity,
        category: category,
        report_type: 'Complaint'
    };

    if (currentReportType === 'employee') {
        payload.employee_name = document.getElementById('reportEmployee').value;
        payload.employee_id = 1; // Should be fetched from dropdown
    } else {
        payload.department_name = document.getElementById('reportDepartment').value;
        payload.department_id = 1; // Should be fetched from dropdown
    }

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.success) {
            alert('Report submitted successfully!');
            closeNewReportModal();
            
            // Reload reports based on current type
            if (currentReportType === 'employee') {
                loadEmployeeReports();
                loadEmployeeStats();
            } else {
                loadDepartmentReports();
                loadDepartmentStats();
            }
        } else {
            alert('Error submitting report: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error submitting report');
    }
}

function displayReportDetails(report, type) {
    const content = document.getElementById('reportDetailsContent');
    
    const statusOptions = ['Open', 'In Progress', 'Under Review', 'Resolved', 'Closed'];
    const statusSelect = `
        <select id="reportStatus" class="form-control" style="margin-bottom: 10px;">
            ${statusOptions.map(s => `<option value="${s}" ${report.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
    `;

    const targetField = type === 'employee' 
        ? `<p><strong>Employee:</strong> ${report.employee_name}</p>`
        : `<p><strong>Department:</strong> ${report.department_name}</p>`;

    content.innerHTML = `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
            <h5>${report.report_title}</h5>
            ${targetField}
            <p><strong>Category:</strong> ${report.category}</p>
            <p><strong>Severity:</strong> <span class="badge severity-${report.severity.toLowerCase()}">${report.severity}</span></p>
            <p><strong>Current Status:</strong></p>
            ${statusSelect}
            <p><strong>Reported By:</strong> ${report.reported_by} (${report.reported_by_email})</p>
            <p><strong>Date Reported:</strong> ${new Date(report.created_at).toLocaleString()}</p>
            <hr>
            <p><strong>Description:</strong></p>
            <p>${report.report_description}</p>
            ${report.investigation_notes ? `<hr><p><strong>Investigation Notes:</strong></p><p>${report.investigation_notes}</p>` : ''}
            ${report.outcome ? `<p><strong>Outcome:</strong> ${report.outcome}</p>` : ''}
        </div>
    `;

    document.getElementById('reportDetailsModal').style.display = 'flex';
    
    // Update button functionality
    document.getElementById('updateReportBtn').onclick = () => {
        updateReportStatus(report.id, type);
    };
}

async function updateReportStatus(reportId, type) {
    const newStatus = document.getElementById('reportStatus').value;
    const endpoint = type === 'employee' 
        ? `/api/employee-reports/${reportId}`
        : `/api/department-reports/${reportId}`;

    try {
        const response = await fetch(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        const data = await response.json();
        if (data.success) {
            alert('Report status updated successfully!');
            closeReportDetailsModal();
            
            // Reload reports
            if (type === 'employee') {
                loadEmployeeReports();
                loadEmployeeStats();
            } else {
                loadDepartmentReports();
                loadDepartmentStats();
            }
        } else {
            alert('Error updating report: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating report');
    }
}

// Modal styling
const style = document.createElement('style');
style.innerHTML = `
    .modal {
        display: none;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
        justify-content: center;
        align-items: center;
    }
    
    .modal.show, .modal > * {
        display: flex;
    }
    
    .modal-content {
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        position: relative;
        z-index: 1001;
        max-height: 90vh;
        overflow-y: auto;
    }
    
    .severity-low { background-color: #28A745; color: white; }
    .severity-medium { background-color: #FFC107; color: black; }
    .severity-high { background-color: #FF922B; color: white; }
    .severity-critical { background-color: #DC3545; color: white; }
    
    .status-open { background-color: #FFC107; color: black; }
    .status-in-progress { background-color: #17A2B8; color: white; }
    .status-under-review { background-color: #6C757D; color: white; }
    .status-resolved { background-color: #28A745; color: white; }
    .status-closed { background-color: #6C757D; color: white; }
`;
document.head.appendChild(style);
