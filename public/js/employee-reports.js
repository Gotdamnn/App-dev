// Employee Reports & Complaints Management

const API_BASE = 'http://localhost:3001/api';

let currentPage = 1;
let currentLimit = 10;
let reportModal = null;
let detailsModal = null;
let currentReportId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Employee Reports page loaded');
    
    try {
        reportModal = new bootstrap.Modal(document.getElementById('reportModal'));
        detailsModal = new bootstrap.Modal(document.getElementById('detailsModal'));
    } catch (e) {
        console.error('Modal initialization error:', e);
    }

    // Event Listeners
    document.getElementById('newReportBtn')?.addEventListener('click', openNewReportModal);
    document.getElementById('submitReportBtn')?.addEventListener('click', submitReport);
    document.getElementById('filterBtn')?.addEventListener('click', applyFilters);
    document.getElementById('resetBtn')?.addEventListener('click', resetFilters);
    document.getElementById('editDetailsBtn')?.addEventListener('click', editReport);
    document.getElementById('resolveBtn')?.addEventListener('click', resolveReport);

    // Load initial data with error handling
    setTimeout(() => {
        console.log('📊 Starting to load initial data...');
        loadReports();
        loadStatistics();
        loadEmployeesDropdown();
        loadDepartmentsDropdown();
    }, 100);
});

// Load all reports
async function loadReports(page = 1) {
    try {
        const search = document.getElementById('searchInput')?.value || '';
        const status = document.getElementById('statusFilter')?.value || '';
        const severity = document.getElementById('severityFilter')?.value || '';
        const reportType = document.getElementById('reportTypeFilter')?.value || '';

        const params = new URLSearchParams({
            search,
            status,
            severity,
            reportType,
            page,
            limit: currentLimit
        });

        console.log(`📥 Loading reports: ${API_BASE}/employee-reports?${params}`);
        const response = await fetch(`${API_BASE}/employee-reports?${params}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 Reports data received:', data);

        if (data.success && data.data) {
            displayReports(data.data);
            displayPagination(data.pagination);
            currentPage = page;
        } else {
            console.warn('No success flag or data in response:', data);
            displayReports([]);
            showAlert('No reports found', 'info');
        }
    } catch (error) {
        console.error('❌ Error loading reports:', error);
        displayReports([]);
        showAlert('Failed to load reports: ' + error.message, 'danger');
    }
}

// Display reports in table
function displayReports(reports) {
    const tbody = document.getElementById('reportsTableBody');

    if (!reports || reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">No reports found</td></tr>';
        return;
    }

    tbody.innerHTML = reports.map(report => `
        <tr>
            <td><strong>#${report.report_id}</strong></td>
            <td>${report.employee_name || 'N/A'}</td>
            <td>${report.department_name || 'N/A'}</td>
            <td><span class="badge bg-info">${report.report_type}</span></td>
            <td>
                <span class="badge bg-${getSeverityColor(report.severity)}">
                    ${report.severity}
                </span>
            </td>
            <td>
                <span class="badge bg-${getStatusColor(report.status)}">
                    ${report.status}
                </span>
            </td>
            <td>${report.reported_by || 'System'}</td>
            <td>${formatDate(report.report_date)}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="viewReport(${report.report_id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-outline-danger" onclick="deleteReport(${report.report_id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Display pagination
function displayPagination(pagination) {
    const container = document.getElementById('paginationContainer');
    const { page, pages } = pagination;

    let html = '';

    // Previous
    if (page > 1) {
        html += `<li class="page-item"><a class="page-link" onclick="loadReports(${page - 1})">Previous</a></li>`;
    }

    // Page numbers
    for (let i = 1; i <= pages; i++) {
        if (i === page) {
            html += `<li class="page-item active"><span class="page-link">${i}</span></li>`;
        } else if (i === 1 || i === pages || (i >= page - 2 && i <= page + 2)) {
            html += `<li class="page-item"><a class="page-link" onclick="loadReports(${i})">${i}</a></li>`;
        } else if (i === page - 3 || i === page + 3) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    // Next
    if (page < pages) {
        html += `<li class="page-item"><a class="page-link" onclick="loadReports(${page + 1})">Next</a></li>`;
    }

    container.innerHTML = html;
}

// Load statistics
async function loadStatistics() {
    try {
        const response = await fetch(`${API_BASE}/employee-reports-stats/summary`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📈 Statistics loaded:', data);

        if (data.success) {
            const summary = data.data.summary;
            document.getElementById('totalReports').textContent = summary.total_reports || 0;
            document.getElementById('openReports').textContent = summary.open_reports || 0;
            document.getElementById('criticalReports').textContent = summary.critical_reports || 0;
            document.getElementById('resolvedReports').textContent = summary.resolved || 0;
        }
    } catch (error) {
        console.error('❌ Error loading statistics:', error);
    }
}

// Load employees for dropdown
async function loadEmployeesDropdown() {
    try {
        console.log(`📥 Loading employees from ${API_BASE}/employees`);
        const response = await fetch(`${API_BASE}/employees`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const employees = await response.json();
        console.log('✅ Employees loaded:', employees.length, 'records');

        const select = document.getElementById('employeeSelect');
        if (!select) {
            console.error('Employee select element not found');
            return;
        }

        select.innerHTML = '<option value="">Select Employee</option>';
        
        if (Array.isArray(employees)) {
            employees.forEach(emp => {
                try {
                    const option = document.createElement('option');
                    option.value = emp.employee_id;
                    option.dataset.name = `${emp.first_name || ''} ${emp.last_name || ''}`;
                    option.dataset.department = emp.department_id;
                    option.textContent = `${emp.first_name || ''} ${emp.last_name || ''}`;
                    select.appendChild(option);
                } catch (e) {
                    console.warn('Error adding employee option:', e);
                }
            });
        } else {
            console.warn('Employees response is not an array:', employees);
        }

        // Update department when employee changes
        select.addEventListener('change', (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            const deptId = selectedOption.dataset.department;
            if (deptId) {
                const deptSelect = document.getElementById('departmentSelect');
                if (deptSelect) {
                    deptSelect.value = deptId;
                }
            }
        });
    } catch (error) {
        console.error('❌ Error loading employees:', error);
        showAlert('Failed to load employees: ' + error.message, 'warning');
    }
}

// Load departments for dropdown
async function loadDepartmentsDropdown() {
    try {
        console.log(`📥 Loading departments from ${API_BASE}/departments`);
        const response = await fetch(`${API_BASE}/departments`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle both wrapped and unwrapped response formats
        const departments = Array.isArray(data) ? data : data.departments || [];
        console.log('✅ Departments loaded:', departments.length, 'records');

        const select = document.getElementById('departmentSelect');
        if (!select) {
            console.error('Department select element not found');
            return;
        }

        select.innerHTML = '<option value="">Select Department</option>';
        
        if (Array.isArray(departments) && departments.length > 0) {
            departments.forEach(dept => {
                try {
                    const option = document.createElement('option');
                    option.value = dept.department_id;
                    option.dataset.name = dept.department_name;
                    option.textContent = dept.department_name;
                    select.appendChild(option);
                } catch (e) {
                    console.warn('Error adding department option:', e);
                }
            });
        } else {
            console.warn('No departments available or response format issue:', data);
        }
    } catch (error) {
        console.error('❌ Error loading departments:', error);
        showAlert('Failed to load departments: ' + error.message, 'warning');
    }
}

// Open new report modal
function openNewReportModal() {
    currentReportId = null;
    document.getElementById('reportForm').reset();
    document.getElementById('reportModalTitle').textContent = 'New Employee Report';
    reportModal.show();
}

// Submit report
async function submitReport() {
    const form = document.getElementById('reportForm');
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    try {
        const employeeSelect = document.getElementById('employeeSelect');
        const selectedOption = employeeSelect.options[employeeSelect.selectedIndex];
        const departmentSelect = document.getElementById('departmentSelect');
        const deptOption = departmentSelect.options[departmentSelect.selectedIndex];

        const reportData = {
            employee_id: employeeSelect.value,
            employee_name: selectedOption.dataset.name,
            department_id: departmentSelect.value,
            department_name: deptOption.dataset.name,
            report_type: document.getElementById('reportTypeSelect').value,
            category: document.getElementById('categoryInput').value,
            title: document.getElementById('titleInput').value,
            description: document.getElementById('descriptionInput').value,
            reported_by: document.getElementById('reportedByInput').value,
            severity: document.getElementById('severitySelect').value,
            priority: document.getElementById('prioritySelect').value
        };

        const method = currentReportId ? 'PUT' : 'POST';
        const url = currentReportId 
            ? `${API_BASE}/employee-reports/${currentReportId}`
            : `${API_BASE}/employee-reports`;

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportData)
        });

        const data = await response.json();

        if (data.success) {
            showAlert(currentReportId ? 'Report updated successfully' : 'Report created successfully', 'success');
            reportModal.hide();
            loadReports(1);
            loadStatistics();
        } else {
            showAlert('Error submitting report', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to submit report', 'danger');
    }
}

// View report details
async function viewReport(reportId) {
    try {
        const response = await fetch(`${API_BASE}/employee-reports/${reportId}`);
        const data = await response.json();

        if (data.success) {
            const report = data.data;
            currentReportId = reportId;

            const content = `
                <div class="report-details">
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <h6 class="text-muted">Report ID</h6>
                            <p>#${report.report_id}</p>
                        </div>
                        <div class="col-md-6">
                            <h6 class="text-muted">Report Type</h6>
                            <p><span class="badge bg-info">${report.report_type}</span></p>
                        </div>
                    </div>

                    <div class="row mb-3">
                        <div class="col-md-6">
                            <h6 class="text-muted">Employee</h6>
                            <p>${report.employee_name}</p>
                        </div>
                        <div class="col-md-6">
                            <h6 class="text-muted">Department</h6>
                            <p>${report.department_name}</p>
                        </div>
                    </div>

                    <div class="row mb-3">
                        <div class="col-md-4">
                            <h6 class="text-muted">Severity</h6>
                            <p><span class="badge bg-${getSeverityColor(report.severity)}">${report.severity}</span></p>
                        </div>
                        <div class="col-md-4">
                            <h6 class="text-muted">Status</h6>
                            <p><span class="badge bg-${getStatusColor(report.status)}">${report.status}</span></p>
                        </div>
                        <div class="col-md-4">
                            <h6 class="text-muted">Priority</h6>
                            <p><span class="badge bg-warning text-dark">${report.priority}</span></p>
                        </div>
                    </div>

                    <div class="mb-3">
                        <h6 class="text-muted">Title</h6>
                        <p>${report.title}</p>
                    </div>

                    <div class="mb-3">
                        <h6 class="text-muted">Description</h6>
                        <p>${report.description}</p>
                    </div>

                    <div class="row mb-3">
                        <div class="col-md-6">
                            <h6 class="text-muted">Reported By</h6>
                            <p>${report.reported_by || 'System'}</p>
                        </div>
                        <div class="col-md-6">
                            <h6 class="text-muted">Report Date</h6>
                            <p>${formatDate(report.report_date)}</p>
                        </div>
                    </div>

                    ${report.assigned_to ? `
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <h6 class="text-muted">Assigned To</h6>
                                <p>${report.assigned_to}</p>
                            </div>
                            <div class="col-md-6">
                                <h6 class="text-muted">Assigned Date</h6>
                                <p>${report.assigned_date ? formatDate(report.assigned_date) : 'N/A'}</p>
                            </div>
                        </div>
                    ` : ''}

                    ${report.resolution_notes ? `
                        <div class="mb-3">
                            <h6 class="text-muted">Resolution Notes</h6>
                            <p>${report.resolution_notes}</p>
                        </div>
                    ` : ''}

                    ${report.action_taken ? `
                        <div class="mb-3">
                            <h6 class="text-muted">Action Taken</h6>
                            <p>${report.action_taken}</p>
                        </div>
                    ` : ''}
                </div>
            `;

            document.getElementById('detailsContent').innerHTML = content;
            
            // Show/hide action buttons based on status
            if (report.status === 'Resolved' || report.status === 'Closed') {
                document.getElementById('resolveBtn').style.display = 'none';
                document.getElementById('editDetailsBtn').style.display = 'none';
            } else {
                document.getElementById('resolveBtn').style.display = 'block';
                document.getElementById('editDetailsBtn').style.display = 'block';
            }

            detailsModal.show();
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to load report details', 'danger');
    }
}

// Edit report
async function editReport() {
    try {
        const response = await fetch(`${API_BASE}/employee-reports/${currentReportId}`);
        const data = await response.json();

        if (data.success) {
            const report = data.data;

            // Populate form
            document.getElementById('employeeSelect').value = report.employee_id;
            document.getElementById('departmentSelect').value = report.department_id;
            document.getElementById('reportTypeSelect').value = report.report_type;
            document.getElementById('categoryInput').value = report.category;
            document.getElementById('titleInput').value = report.title;
            document.getElementById('descriptionInput').value = report.description;
            document.getElementById('reportedByInput').value = report.reported_by || '';
            document.getElementById('severitySelect').value = report.severity;
            document.getElementById('prioritySelect').value = report.priority;
            document.getElementById('reportId').value = currentReportId;

            document.getElementById('reportModalTitle').textContent = 'Edit Report #' + currentReportId;
            detailsModal.hide();
            reportModal.show();
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to load report for editing', 'danger');
    }
}

// Resolve report
async function resolveReport() {
    const resolutionNotes = prompt('Enter resolution notes:');
    if (!resolutionNotes) return;

    try {
        const response = await fetch(`${API_BASE}/employee-reports/${currentReportId}/resolve`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                resolution_notes: resolutionNotes,
                action_taken: resolutionNotes
            })
        });

        const data = await response.json();

        if (data.success) {
            showAlert('Report marked as resolved', 'success');
            detailsModal.hide();
            loadReports(currentPage);
            loadStatistics();
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to resolve report', 'danger');
    }
}

// Delete report
async function deleteReport(reportId) {
    showConfirmModal(
        'Are you sure you want to delete this report?',
        async () => {
            try {
                const response = await fetch(`${API_BASE}/employee-reports/${reportId}`, {
                    method: 'DELETE'
                });

                const data = await response.json();

                if (data.success) {
                    showAlert('Report deleted successfully', 'success');
                    loadReports(currentPage);
                    loadStatistics();
                }
            } catch (error) {
                console.error('Error:', error);
                showAlert('Failed to delete report', 'danger');
            }
        }
    );
}

// Apply filters
function applyFilters() {
    loadReports(1);
}

// Reset filters
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('severityFilter').value = '';
    document.getElementById('reportTypeFilter').value = '';
    loadReports(1);
}

// Helper functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getSeverityColor(severity) {
    const colors = {
        'Critical': 'danger',
        'High': 'warning',
        'Medium': 'info',
        'Low': 'success'
    };
    return colors[severity] || 'secondary';
}

function getStatusColor(status) {
    const colors = {
        'Open': 'danger',
        'In Progress': 'warning',
        'Under Review': 'info',
        'Resolved': 'success',
        'Closed': 'secondary',
        'On Hold': 'secondary'
    };
    return colors[status] || 'secondary';
}

function showAlert(message, type) {
    // Create or get toast container
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    // Convert type names to match CSS classes
    const typeMap = {
        'danger': 'error',
        'warning': 'warning',
        'success': 'success',
        'info': 'info'
    };

    const toastType = typeMap[type] || type;

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${toastType}`;
    toast.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Show custom confirmation modal
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

// Logout modal
function showLogoutModal() {
    showConfirmModal(
        'Are you sure you want to logout?',
        () => {
            // Perform logout
            fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }).then(() => {
                window.location.href = '/login';
            });
        }
    );
}
