// Department Management JavaScript - Enhanced Version
if (typeof API_BASE === 'undefined') {
    var API_BASE = window.location.origin + '/api';
}

let departments = [];
let employees = [];
let deleteDepartmentId = null;

// Load data on page load
document.addEventListener('DOMContentLoaded', function() {
    loadDepartments();
    loadEmployees();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Add Department button
    const addBtn = document.querySelector('.add-department-btn');
    if (addBtn) {
        addBtn.addEventListener('click', openAddDepartmentModal);
    }

    // Add Department form submission
    const addForm = document.getElementById('addDepartmentForm');
    if (addForm) {
        addForm.addEventListener('submit', addNewDepartment);
    }

    // Edit Department form submission
    const editForm = document.getElementById('editDepartmentForm');
    if (editForm) {
        editForm.addEventListener('submit', saveDepartmentChanges);
    }

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

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterDepartments);
    }

    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterDepartments);
    }

    // Logout button
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openLogoutModal();
        });
    }
}

// Load departments from API
async function loadDepartments() {
    try {
        const response = await fetch(`${API_BASE}/departments`);
        if (!response.ok) {
            throw new Error('Failed to fetch departments');
        }
        const data = await response.json();
        departments = data.departments || [];
        renderDepartments(departments);
        updateStatsSummary();
        populateParentDepartmentDropdowns();
    } catch (error) {
        console.error('Error loading departments:', error);
        showStatusModal('Error', 'Failed to load departments. Please make sure the server is running.', 'error');
    }
}

// Load employees for department head dropdown
async function loadEmployees() {
    try {
        const response = await fetch(`${API_BASE}/employees`);
        if (!response.ok) {
            throw new Error('Failed to fetch employees');
        }
        employees = await response.json();
        populateDepartmentHeadDropdowns();
    } catch (error) {
        console.error('Error loading employees:', error);
    }
}

// Populate department head dropdowns
function populateDepartmentHeadDropdowns() {
    const addSelect = document.getElementById('addDepartmentHead');
    const editSelect = document.getElementById('editDepartmentHead');

    const options = '<option value="">Select Head</option>' + 
        employees
            .filter(emp => emp.employment_status === 'Active')
            .map(emp => `<option value="${emp.employee_id}">${emp.first_name} ${emp.last_name} (${emp.job_title || 'Staff'})</option>`)
            .join('');

    if (addSelect) addSelect.innerHTML = options;
    if (editSelect) editSelect.innerHTML = options;
}

// Populate parent department dropdowns
function populateParentDepartmentDropdowns() {
    const addSelect = document.getElementById('addParentDepartment');
    const editSelect = document.getElementById('editParentDepartment');

    const options = '<option value="">None (Top-level)</option>' + 
        departments.map(dept => `<option value="${dept.department_id}">${dept.department_name}</option>`).join('');

    if (addSelect) addSelect.innerHTML = options;
    if (editSelect) editSelect.innerHTML = options;
}

// Update stats summary
function updateStatsSummary() {
    const totalDepts = departments.length;
    const activeDepts = departments.filter(d => d.status === 'Active').length;
    const totalEmployees = departments.reduce((sum, d) => sum + parseInt(d.employee_count || 0), 0);
    const totalBudget = departments.reduce((sum, d) => sum + parseFloat(d.budget_annual || 0), 0);

    document.getElementById('totalDepartments').textContent = totalDepts;
    document.getElementById('activeDepartments').textContent = activeDepts;
    document.getElementById('totalEmployeesInDepts').textContent = totalEmployees;
    document.getElementById('totalBudget').textContent = formatCurrency(totalBudget);
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Get department icon based on name
function getDepartmentIcon(name) {
    const icons = {
        'emergency': 'fa-ambulance',
        'surgery': 'fa-user-doctor',
        'pediatrics': 'fa-baby',
        'cardiology': 'fa-heart-pulse',
        'neurology': 'fa-brain',
        'radiology': 'fa-x-ray',
        'laboratory': 'fa-flask',
        'pharmacy': 'fa-pills',
        'administration': 'fa-clipboard',
        'it': 'fa-laptop-code',
        'hr': 'fa-users-gear',
        'finance': 'fa-coins'
    };
    
    const lowercaseName = name.toLowerCase();
    for (const [key, icon] of Object.entries(icons)) {
        if (lowercaseName.includes(key)) {
            return icon;
        }
    }
    return 'fa-building';
}

// Render departments as cards
function renderDepartments(departmentList) {
    const grid = document.getElementById('departmentsGrid');
    if (!grid) return;

    // Update department count
    const countEl = document.getElementById('departmentCount');
    if (countEl) {
        countEl.textContent = `${departmentList.length} department${departmentList.length !== 1 ? 's' : ''} found`;
    }

    if (departmentList.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-building"></i>
                <p>No departments found. Click "Add Department" to get started.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = departmentList.map(dept => {
        const icon = getDepartmentIcon(dept.department_name);
        const description = dept.description || 'No description available';
        const employeeCount = dept.employee_count || 0;
        const status = dept.status || 'Active';
        const headName = dept.head_first_name && dept.head_last_name 
            ? `${dept.head_first_name} ${dept.head_last_name}` 
            : 'Not Assigned';
        const location = dept.location_building || 'Not specified';
        
        return `
            <div class="department-card">
                <span class="status-badge ${status.toLowerCase()}">${status}</span>
                <div class="department-header">
                    <div class="department-icon">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="department-actions">
                        <button class="action-btn view" title="View" onclick="viewDepartment(${dept.department_id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" title="Edit" onclick="editDepartment(${dept.department_id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" title="Delete" onclick="deleteDepartment(${dept.department_id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <h3 class="department-name">${dept.department_name}</h3>
                <p class="department-description">${description}</p>
                <div class="department-meta">
                    <span class="meta-item"><i class="fas fa-user-tie"></i> ${headName}</span>
                    <span class="meta-item"><i class="fas fa-map-marker-alt"></i> ${location}</span>
                </div>
                <div class="department-stats">
                    <div class="stat-item">
                        <i class="fas fa-users"></i>
                        <span><span class="stat-value">${employeeCount}</span> employees</span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-dollar-sign"></i>
                        <span><span class="stat-value">${formatCurrency(dept.budget_annual || 0)}</span></span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Filter departments
function filterDepartments() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';

    const filtered = departments.filter(dept => {
        const matchesSearch = dept.department_name.toLowerCase().includes(searchTerm) ||
               (dept.description && dept.description.toLowerCase().includes(searchTerm)) ||
               (dept.location_building && dept.location_building.toLowerCase().includes(searchTerm));
        const matchesStatus = !statusFilter || dept.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    renderDepartments(filtered);
}

// Format date for display
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Format time for display
function formatTime(timeStr) {
    if (!timeStr) return 'N/A';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

// Open Add Department Modal
function openAddDepartmentModal() {
    const modal = document.getElementById('addDepartmentModal');
    const form = document.getElementById('addDepartmentForm');
    if (form) form.reset();
    // Set default values
    document.getElementById('addStatus').value = 'Active';
    document.getElementById('addOperatingDays').value = 'Mon-Fri';
    if (modal) modal.classList.add('show');
}

// Add new department
async function addNewDepartment(e) {
    e.preventDefault();

    const departmentData = {
        department_name: document.getElementById('addDepartmentName').value.trim(),
        description: document.getElementById('addDepartmentDescription').value.trim() || null,
        department_head_id: document.getElementById('addDepartmentHead').value || null,
        status: document.getElementById('addStatus').value,
        parent_department_id: document.getElementById('addParentDepartment').value || null,
        location_building: document.getElementById('addLocationBuilding').value.trim() || null,
        location_floor: document.getElementById('addLocationFloor').value.trim() || null,
        location_room: document.getElementById('addLocationRoom').value.trim() || null,
        contact_email: document.getElementById('addContactEmail').value.trim() || null,
        contact_phone: document.getElementById('addContactPhone').value.trim() || null,
        operating_hours_start: document.getElementById('addOperatingStart').value || null,
        operating_hours_end: document.getElementById('addOperatingEnd').value || null,
        operating_days: document.getElementById('addOperatingDays').value.trim() || 'Mon-Fri',
        budget_annual: parseFloat(document.getElementById('addBudgetAnnual').value) || 0,
        budget_spent: parseFloat(document.getElementById('addBudgetSpent').value) || 0,
        cost_center_code: document.getElementById('addCostCenterCode').value.trim() || null
    };

    if (!departmentData.department_name) {
        showStatusModal('Error', 'Please enter a department name.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/departments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(departmentData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add department');
        }

        closeModal('addDepartmentModal');
        showStatusModal('Success', `Department "${departmentData.department_name}" has been added successfully!`, 'success');
        loadDepartments();
    } catch (error) {
        console.error('Error adding department:', error);
        showStatusModal('Error', error.message || 'Failed to add department. Please try again.', 'error');
    }
}

// Edit department
function editDepartment(id) {
    const department = departments.find(d => d.department_id === id);
    if (!department) {
        showStatusModal('Error', 'Department not found.', 'error');
        return;
    }

    // Populate form fields
    document.getElementById('editDepartmentId').value = department.department_id;
    document.getElementById('editDepartmentName').value = department.department_name || '';
    document.getElementById('editDepartmentDescription').value = department.description || '';
    document.getElementById('editStatus').value = department.status || 'Active';
    
    // Populate parent department dropdown excluding current department
    const editParentSelect = document.getElementById('editParentDepartment');
    editParentSelect.innerHTML = '<option value="">None (Top-level)</option>' + 
        departments
            .filter(d => d.department_id !== id)
            .map(d => `<option value="${d.department_id}" ${d.department_id == department.parent_department_id ? 'selected' : ''}>${d.department_name}</option>`)
            .join('');

    // Populate department head
    const editHeadSelect = document.getElementById('editDepartmentHead');
    editHeadSelect.innerHTML = '<option value="">Select Head</option>' + 
        employees
            .filter(emp => emp.employment_status === 'Active')
            .map(emp => `<option value="${emp.employee_id}" ${emp.employee_id == department.department_head_id ? 'selected' : ''}>${emp.first_name} ${emp.last_name} (${emp.job_title || 'Staff'})</option>`)
            .join('');

    document.getElementById('editLocationBuilding').value = department.location_building || '';
    document.getElementById('editLocationFloor').value = department.location_floor || '';
    document.getElementById('editLocationRoom').value = department.location_room || '';
    document.getElementById('editContactEmail').value = department.contact_email || '';
    document.getElementById('editContactPhone').value = department.contact_phone || '';
    document.getElementById('editOperatingStart').value = department.operating_hours_start || '';
    document.getElementById('editOperatingEnd').value = department.operating_hours_end || '';
    document.getElementById('editOperatingDays').value = department.operating_days || 'Mon-Fri';
    document.getElementById('editBudgetAnnual').value = department.budget_annual || 0;
    document.getElementById('editBudgetSpent').value = department.budget_spent || 0;
    document.getElementById('editCostCenterCode').value = department.cost_center_code || '';

    const modal = document.getElementById('editDepartmentModal');
    if (modal) modal.classList.add('show');
}

// Save department changes
async function saveDepartmentChanges(e) {
    e.preventDefault();

    const id = document.getElementById('editDepartmentId').value;
    const departmentData = {
        department_name: document.getElementById('editDepartmentName').value.trim(),
        description: document.getElementById('editDepartmentDescription').value.trim() || null,
        department_head_id: document.getElementById('editDepartmentHead').value || null,
        status: document.getElementById('editStatus').value,
        parent_department_id: document.getElementById('editParentDepartment').value || null,
        location_building: document.getElementById('editLocationBuilding').value.trim() || null,
        location_floor: document.getElementById('editLocationFloor').value.trim() || null,
        location_room: document.getElementById('editLocationRoom').value.trim() || null,
        contact_email: document.getElementById('editContactEmail').value.trim() || null,
        contact_phone: document.getElementById('editContactPhone').value.trim() || null,
        operating_hours_start: document.getElementById('editOperatingStart').value || null,
        operating_hours_end: document.getElementById('editOperatingEnd').value || null,
        operating_days: document.getElementById('editOperatingDays').value.trim() || 'Mon-Fri',
        budget_annual: parseFloat(document.getElementById('editBudgetAnnual').value) || 0,
        budget_spent: parseFloat(document.getElementById('editBudgetSpent').value) || 0,
        cost_center_code: document.getElementById('editCostCenterCode').value.trim() || null
    };

    if (!departmentData.department_name) {
        showStatusModal('Error', 'Please enter a department name.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/departments/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(departmentData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update department');
        }

        closeModal('editDepartmentModal');
        showStatusModal('Success', `Department "${departmentData.department_name}" has been updated successfully!`, 'success');
        loadDepartments();
    } catch (error) {
        console.error('Error updating department:', error);
        showStatusModal('Error', error.message || 'Failed to update department. Please try again.', 'error');
    }
}

// View department details
async function viewDepartment(id) {
    const department = departments.find(d => d.department_id === id);
    if (!department) {
        showStatusModal('Error', 'Department not found.', 'error');
        return;
    }

    const icon = getDepartmentIcon(department.department_name);
    
    // Header
    document.getElementById('viewDepartmentIcon').innerHTML = `<i class="fas ${icon}"></i>`;
    document.getElementById('viewDepartmentName').textContent = department.department_name;
    
    const statusBadge = document.getElementById('viewDepartmentStatus');
    statusBadge.textContent = department.status || 'Active';
    statusBadge.className = `status-badge ${(department.status || 'Active').toLowerCase()}`;

    // Overview tab
    document.getElementById('viewDepartmentId').textContent = department.department_id;
    document.getElementById('viewParentDepartment').textContent = department.parent_department_name || 'None';
    document.getElementById('viewDepartmentHead').textContent = 
        department.head_first_name && department.head_last_name 
            ? `${department.head_first_name} ${department.head_last_name}` 
            : 'Not Assigned';
    document.getElementById('viewEmployeeCount').textContent = `${department.employee_count || 0} employees`;
    document.getElementById('viewContactEmail').textContent = department.contact_email || '-';
    document.getElementById('viewContactPhone').textContent = department.contact_phone || '-';
    
    const startTime = formatTime(department.operating_hours_start);
    const endTime = formatTime(department.operating_hours_end);
    document.getElementById('viewOperatingHours').textContent = 
        startTime !== 'N/A' && endTime !== 'N/A' ? `${startTime} - ${endTime}` : '-';
    document.getElementById('viewOperatingDays').textContent = department.operating_days || '-';
    document.getElementById('viewDepartmentDescription').textContent = department.description || 'No description';
    document.getElementById('viewCreatedAt').textContent = formatDate(department.created_at);
    document.getElementById('viewUpdatedAt').textContent = formatDate(department.updated_at);

    // Location tab
    document.getElementById('viewLocationBuilding').textContent = department.location_building || '-';
    document.getElementById('viewLocationFloor').textContent = department.location_floor || '-';
    document.getElementById('viewLocationRoom').textContent = department.location_room || '-';

    // Budget tab
    const budgetAnnual = parseFloat(department.budget_annual) || 0;
    const budgetSpent = parseFloat(department.budget_spent) || 0;
    const budgetRemaining = budgetAnnual - budgetSpent;
    const budgetPercent = budgetAnnual > 0 ? Math.round((budgetSpent / budgetAnnual) * 100) : 0;

    document.getElementById('viewBudgetAnnual').textContent = formatCurrency(budgetAnnual);
    document.getElementById('viewBudgetSpent').textContent = formatCurrency(budgetSpent);
    document.getElementById('viewBudgetRemaining').textContent = formatCurrency(budgetRemaining);
    document.getElementById('viewBudgetPercent').textContent = `${budgetPercent}%`;
    
    const progressFill = document.getElementById('viewBudgetProgressFill');
    progressFill.style.width = `${Math.min(budgetPercent, 100)}%`;
    progressFill.className = 'budget-progress-fill';
    if (budgetPercent >= 90) {
        progressFill.classList.add('danger');
    } else if (budgetPercent >= 70) {
        progressFill.classList.add('warning');
    }

    document.getElementById('viewCostCenterCode').textContent = department.cost_center_code || '-';

    // Load employees for this department
    loadDepartmentEmployees(id);

    // Show overview tab by default
    showTab('overview');

    const modal = document.getElementById('viewDepartmentModal');
    if (modal) modal.classList.add('show');
}

// Load employees for a specific department
async function loadDepartmentEmployees(departmentId) {
    const listEl = document.getElementById('viewEmployeesList');
    listEl.innerHTML = '<p class="loading-employees">Loading employees...</p>';

    try {
        const response = await fetch(`${API_BASE}/departments/${departmentId}/employees`);
        if (!response.ok) {
            throw new Error('Failed to fetch employees');
        }
        const deptEmployees = await response.json();

        if (deptEmployees.length === 0) {
            listEl.innerHTML = `
                <div class="no-employees">
                    <i class="fas fa-users-slash"></i>
                    <p>No employees assigned to this department</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = deptEmployees.map(emp => {
            const initials = `${emp.first_name?.charAt(0) || ''}${emp.last_name?.charAt(0) || ''}`;
            const statusClass = (emp.employment_status || 'Active').toLowerCase().replace(' ', '-');
            return `
                <div class="employee-item">
                    <div class="employee-info">
                        <div class="employee-avatar">${initials}</div>
                        <div class="employee-details">
                            <span class="employee-name">${emp.first_name} ${emp.last_name}</span>
                            <span class="employee-role">${emp.job_title || 'Staff'}</span>
                        </div>
                    </div>
                    <span class="employee-status ${statusClass}">${emp.employment_status || 'Active'}</span>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading department employees:', error);
        listEl.innerHTML = '<p class="loading-employees">Failed to load employees</p>';
    }
}

// Show tab
function showTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    const tabContent = document.getElementById(`tab-${tabName}`);
    if (tabContent) {
        tabContent.classList.add('active');
    }

    // Add active class to clicked button
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // Default to first tab button if no event
        document.querySelector('.tab-btn')?.classList.add('active');
    }
}

// Delete department (show confirmation)
function deleteDepartment(id) {
    const department = departments.find(d => d.department_id === id);
    if (!department) {
        showStatusModal('Error', 'Department not found.', 'error');
        return;
    }

    deleteDepartmentId = id;
    document.getElementById('confirmMessage').textContent = `Are you sure you want to delete "${department.department_name}"? This action cannot be undone.`;
    
    const modal = document.getElementById('confirmModal');
    if (modal) modal.classList.add('show');
}

// Confirm delete
async function confirmDelete() {
    if (!deleteDepartmentId) return;

    try {
        const response = await fetch(`${API_BASE}/departments/${deleteDepartmentId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete department');
        }

        closeConfirmModal();
        showStatusModal('Success', 'Department has been deleted successfully!', 'success');
        loadDepartments();
    } catch (error) {
        console.error('Error deleting department:', error);
        closeConfirmModal();
        showStatusModal('Error', error.message || 'Failed to delete department. Please try again.', 'error');
    } finally {
        deleteDepartmentId = null;
    }
}

// Modal functions
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('show');
}

function showStatusModal(title, message, type) {
    const modal = document.getElementById('statusModal');
    const titleEl = document.getElementById('statusTitle');
    const messageEl = document.getElementById('statusMessage');
    
    if (titleEl) {
        titleEl.textContent = title;
        titleEl.style.color = type === 'error' ? '#ef4444' : '#22c55e';
    }
    if (messageEl) messageEl.textContent = message;
    if (modal) modal.classList.add('show');
}

function closeStatusModal() {
    const modal = document.getElementById('statusModal');
    if (modal) modal.classList.remove('show');
}

function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    if (modal) modal.classList.remove('show');
    deleteDepartmentId = null;
}

function closeViewDepartmentModal() {
    const modal = document.getElementById('viewDepartmentModal');
    if (modal) modal.classList.remove('show');
}

// Logout functions
function openLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) modal.classList.add('show');
}

function closeLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) modal.classList.remove('show');
}

function confirmLogout() {
    window.location.href = '/login';
}
