// Employee Management JavaScript - Comprehensive Version
if (typeof API_BASE === 'undefined') {
    var API_BASE = 'http://localhost:3001/api';
}

let employees = [];
let departments = [];
let deleteEmployeeId = null;

// Load employees and departments on page load
document.addEventListener('DOMContentLoaded', function() {
    // DEBUG: Check if modal elements exist on page load
    const modalOnLoad = document.getElementById('assignRoleModal');
    const formOnLoad = document.getElementById('assignRoleForm');
    console.log('Page Load Check:', {
        assignRoleModal_exists: !!modalOnLoad,
        assignRoleForm_exists: !!formOnLoad,
        total_elements: document.querySelectorAll('*').length,
        body_exists: !!document.body,
        html_exists: !!document.documentElement
    });
    
    // If modal doesn't exist, create it dynamically
    if (!modalOnLoad) {
        console.warn('Modal not found in HTML, creating dynamically...');
        createAssignRoleModalDynamically();
    }
    
    loadDepartments();
    loadEmployees();
    setupEventListeners();
});

// Create assign role modal dynamically if it doesn't exist
function createAssignRoleModalDynamically() {
    const modalHTML = `
    <!-- Assign Role Modal -->
    <div id="assignRoleModal" class="modal">
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>Assign Staff Role</h2>
                <button class="modal-close" data-modal="assignRoleModal">&times;</button>
            </div>
            <form id="assignRoleForm">
                <input type="hidden" id="assignRoleEmployeeId">
                
                <div style="padding: 20px;">
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label style="font-weight: 600; margin-bottom: 8px; display: block; color: #374151;">Employee Name</label>
                        <div id="assignRoleEmployeeName" style="padding: 12px; background: #f3f4f6; border-radius: 6px; color: #374151;">Loading...</div>
                    </div>

                    <div class="form-group" style="margin-bottom: 20px;">
                        <label style="font-weight: 600; margin-bottom: 8px; display: block; color: #374151;">Email</label>
                        <div id="assignRoleEmployeeEmail" style="padding: 12px; background: #f3f4f6; border-radius: 6px; color: #666; font-size: 0.9rem;">Loading...</div>
                    </div>

                    <div class="form-group" style="margin-bottom: 20px;">
                        <label for="assignRoleSelect" style="font-weight: 600; margin-bottom: 8px; display: block; color: #374151;">Select Role *</label>
                        <select id="assignRoleSelect" style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem;" required>
                            <option value="">-- Select a Role --</option>
                            <option value="Supervisor">Supervisor</option>
                            <option value="Manager">Manager</option>
                            <option value="Admin">Admin</option>
                            <option value="Admin Manager">Admin Manager</option>
                        </select>
                    </div>

                    <div class="form-group" style="margin-bottom: 20px;">
                        <label for="assignRoleDepartment" style="font-weight: 600; margin-bottom: 8px; display: block; color: #374151;">Department</label>
                        <select id="assignRoleDepartment" style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem;">
                            <option value="">-- Select Department --</option>
                        </select>
                    </div>

                    <div class="form-group" style="margin-bottom: 20px;">
                        <label for="assignRoleStatus" style="font-weight: 600; margin-bottom: 8px; display: block; color: #374151;">Status</label>
                        <select id="assignRoleStatus" style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem;">
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Disabled">Disabled</option>
                        </select>
                    </div>

                    <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px; border-radius: 4px; margin-bottom: 20px; font-size: 0.9rem; color: #1e40af;">
                        <strong>Note:</strong> This will create/update a staff record for this employee with the selected role in the Staff Management system.
                    </div>
                </div>

                <div class="form-actions" style="padding: 0 20px 20px 20px; display: flex; gap: 10px;">
                    <button type="button" class="btn-cancel" data-modal="assignRoleModal">Cancel</button>
                    <button type="button" class="btn-delete" onclick="removeRoleAssignment()" style="background: #ef4444; color: white; border: none; border-radius: 8px; padding: 12px 20px; cursor: pointer; flex: 1;">Remove Role</button>
                    <button type="submit" class="btn-save" style="flex: 1;">Assign Role</button>
                </div>
            </form>
        </div>
    </div>
    `;
    
    // Insert modal at the end of body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log('Modal created dynamically');
}

// Setup event listeners
function setupEventListeners() {
    // Add Employee button
    const addBtn = document.querySelector('.add-employee-btn');
    if (addBtn) {
        addBtn.addEventListener('click', openAddEmployeeModal);
    }

    // Add Employee form submission
    const addForm = document.getElementById('addEmployeeForm');
    if (addForm) {
        addForm.addEventListener('submit', addNewEmployee);
    }

    // Edit Employee form submission
    const editForm = document.getElementById('editEmployeeForm');
    if (editForm) {
        editForm.addEventListener('submit', saveEmployeeChanges);
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
        searchInput.addEventListener('input', filterEmployees);
    }

    // Filter functionality
    const departmentFilter = document.getElementById('departmentFilter');
    const jobTitleFilter = document.getElementById('jobTitleFilter');
    const statusFilter = document.getElementById('statusFilter');
    if (departmentFilter) departmentFilter.addEventListener('change', filterEmployees);
    if (jobTitleFilter) jobTitleFilter.addEventListener('change', filterEmployees);
    if (statusFilter) statusFilter.addEventListener('change', filterEmployees);

    // Logout button
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openLogoutModal();
        });
    }

    // Assign Role form submission
    const assignRoleForm = document.getElementById('assignRoleForm');
    if (assignRoleForm) {
        assignRoleForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await saveRoleAssignment();
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
        populateDepartmentDropdowns();
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}

// Populate department dropdowns
function populateDepartmentDropdowns() {
    const dropdowns = ['addDepartment', 'editDepartment', 'departmentFilter'];
    
    dropdowns.forEach(id => {
        const dropdown = document.getElementById(id);
        if (dropdown) {
            const isFilter = id === 'departmentFilter';
            dropdown.innerHTML = isFilter ? '<option value="">All Departments</option>' : '<option value="">Select Department</option>';
            
            departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.department_id;
                option.textContent = dept.department_name;
                dropdown.appendChild(option);
            });
        }
    });
}

// Load employees from API
async function loadEmployees() {
    try {
        const response = await fetch(`${API_BASE}/employees`);
        if (!response.ok) {
            throw new Error('Failed to fetch employees');
        }
        employees = await response.json();
        renderEmployees(employees);
    } catch (error) {
        console.error('Error loading employees:', error);
        showStatusModal('Error', 'Failed to load employees. Please make sure the server is running.', 'error');
    }
}

// Render employees to table
function renderEmployees(employeeList) {
    const tbody = document.getElementById('employeesTableBody');
    if (!tbody) return;

    // Update employee count
    const employeeCountEl = document.getElementById('employeeCount');
    if (employeeCountEl) {
        employeeCountEl.textContent = `${employeeList.length} employee${employeeList.length !== 1 ? 's' : ''} found`;
    }

    if (employeeList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #6b7280;">
                    <i class="fas fa-user-tie" style="font-size: 3rem; margin-bottom: 16px; display: block; opacity: 0.5;"></i>
                    No employees found. Click "Add Employee" to get started.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = employeeList.map(employee => {
        const fullName = `${employee.first_name || ''} ${employee.middle_name || ''} ${employee.last_name || ''}`.replace(/\s+/g, ' ').trim();
        const initials = getInitials(fullName);
        const jobClass = employee.job_title ? employee.job_title.toLowerCase().replace(/\s+/g, '-') : 'other';
        const statusClass = employee.employment_status ? employee.employment_status.toLowerCase().replace(/\s+/g, '-') : 'active';
        
        return `
            <tr>
                <td><input type="checkbox" class="employee-checkbox" data-id="${employee.employee_id}"></td>
                <td>
                    <div class="employee-cell">
                        <div class="employee-avatar">${initials}</div>
                        <div class="employee-info">
                            <div class="employee-name">${fullName}</div>
                            <div class="employee-email">${employee.email || 'No email'}</div>
                        </div>
                    </div>
                </td>
                <td>${employee.employee_number || 'N/A'}</td>
                <td>${employee.department_name || 'N/A'}</td>
                <td><span class="role-badge ${jobClass}">${employee.job_title || 'N/A'}</span></td>
                <td><span class="status-badge ${statusClass}">${employee.employment_status || 'N/A'}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" title="View Details" onclick="viewEmployee(${employee.employee_id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" title="Edit Employee" onclick="editEmployee(${employee.employee_id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn assign" title="Assign/Remove Staff Role" onclick="assignRoleToEmployee(${employee.employee_id})">
                            <i class="fas fa-user-shield"></i>
                        </button>
                        <button class="action-btn delete" title="Delete Employee" onclick="deleteEmployee(${employee.employee_id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Filter employees
function filterEmployees() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const departmentFilter = document.getElementById('departmentFilter')?.value || '';
    const jobTitleFilter = document.getElementById('jobTitleFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';

    const filtered = employees.filter(employee => {
        const fullName = `${employee.first_name || ''} ${employee.middle_name || ''} ${employee.last_name || ''}`.toLowerCase();
        
        const matchesSearch = 
            fullName.includes(searchTerm) ||
            (employee.employee_number && employee.employee_number.toLowerCase().includes(searchTerm)) ||
            (employee.email && employee.email.toLowerCase().includes(searchTerm)) ||
            (employee.department_name && employee.department_name.toLowerCase().includes(searchTerm));
        
        const matchesDepartment = !departmentFilter || employee.department_id == departmentFilter;
        const matchesJobTitle = !jobTitleFilter || employee.job_title === jobTitleFilter;
        const matchesStatus = !statusFilter || employee.employment_status === statusFilter;

        return matchesSearch && matchesDepartment && matchesJobTitle && matchesStatus;
    });

    renderEmployees(filtered);
}

// Get initials from name
function getInitials(name) {
    if (!name) return 'EM';
    const parts = name.trim().split(' ').filter(p => p);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

// Format date for display
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Format date for input field
function formatDateForInput(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
}

// Open Add Employee Modal
function openAddEmployeeModal() {
    const modal = document.getElementById('addEmployeeModal');
    const form = document.getElementById('addEmployeeForm');
    if (form) form.reset();
    
    // Set default hire date to today
    const hireDateInput = document.getElementById('addHireDate');
    if (hireDateInput) {
        hireDateInput.value = new Date().toISOString().split('T')[0];
    }
    
    if (modal) modal.classList.add('show');
}

// Add new employee
async function addNewEmployee(e) {
    e.preventDefault();

    const employeeData = {
        first_name: document.getElementById('addFirstName').value.trim(),
        middle_name: document.getElementById('addMiddleName').value.trim() || null,
        last_name: document.getElementById('addLastName').value.trim(),
        gender: document.getElementById('addGender').value,
        date_of_birth: document.getElementById('addDateOfBirth').value,
        email: document.getElementById('addEmail').value.trim(),
        phone_number: document.getElementById('addPhone').value.trim(),
        address: document.getElementById('addAddress').value.trim() || null,
        department_id: document.getElementById('addDepartment').value || null,
        job_title: document.getElementById('addJobTitle').value,
        employment_type: document.getElementById('addEmploymentType').value,
        hire_date: document.getElementById('addHireDate').value,
        employment_status: document.getElementById('addEmploymentStatus').value
    };

    // Validate required fields
    if (!employeeData.first_name || !employeeData.last_name || !employeeData.email) {
        showStatusModal('Error', 'Please fill in all required fields.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/employees`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(employeeData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add employee');
        }

        const newEmployee = await response.json();
        closeModal('addEmployeeModal');
        showStatusModal('Success', `Employee "${employeeData.first_name} ${employeeData.last_name}" has been added successfully!`, 'success');
        loadEmployees();
    } catch (error) {
        console.error('Error adding employee:', error);
        showStatusModal('Error', error.message || 'Failed to add employee. Please try again.', 'error');
    }
}

// Edit employee
function editEmployee(id) {
    const employee = employees.find(e => e.employee_id === id);
    if (!employee) {
        showStatusModal('Error', 'Employee not found.', 'error');
        return;
    }

    // Populate form fields
    document.getElementById('editEmployeeDbId').value = employee.employee_id;
    document.getElementById('editEmployeeId').value = employee.employee_id;
    document.getElementById('editEmployeeNumber').value = employee.employee_number || '';
    document.getElementById('editFirstName').value = employee.first_name || '';
    document.getElementById('editMiddleName').value = employee.middle_name || '';
    document.getElementById('editLastName').value = employee.last_name || '';
    document.getElementById('editGender').value = employee.gender || '';
    document.getElementById('editDateOfBirth').value = formatDateForInput(employee.date_of_birth);
    document.getElementById('editEmail').value = employee.email || '';
    document.getElementById('editPhone').value = employee.phone_number || '';
    document.getElementById('editAddress').value = employee.address || '';
    document.getElementById('editDepartment').value = employee.department_id || '';
    document.getElementById('editJobTitle').value = employee.job_title || '';
    document.getElementById('editEmploymentType').value = employee.employment_type || '';
    document.getElementById('editHireDate').value = formatDateForInput(employee.hire_date);
    document.getElementById('editEmploymentStatus').value = employee.employment_status || '';

    const modal = document.getElementById('editEmployeeModal');
    if (modal) modal.classList.add('show');
}

// Save employee changes
async function saveEmployeeChanges(e) {
    e.preventDefault();

    const id = document.getElementById('editEmployeeDbId').value;
    
    const employeeData = {
        first_name: document.getElementById('editFirstName').value.trim(),
        middle_name: document.getElementById('editMiddleName').value.trim() || null,
        last_name: document.getElementById('editLastName').value.trim(),
        gender: document.getElementById('editGender').value,
        date_of_birth: document.getElementById('editDateOfBirth').value,
        email: document.getElementById('editEmail').value.trim(),
        phone_number: document.getElementById('editPhone').value.trim(),
        address: document.getElementById('editAddress').value.trim() || null,
        department_id: document.getElementById('editDepartment').value || null,
        job_title: document.getElementById('editJobTitle').value,
        employment_type: document.getElementById('editEmploymentType').value,
        hire_date: document.getElementById('editHireDate').value,
        employment_status: document.getElementById('editEmploymentStatus').value
    };

    if (!employeeData.first_name || !employeeData.last_name || !employeeData.email) {
        showStatusModal('Error', 'Please fill in all required fields.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/employees/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(employeeData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update employee');
        }

        closeModal('editEmployeeModal');
        showStatusModal('Success', `Employee "${employeeData.first_name} ${employeeData.last_name}" has been updated successfully!`, 'success');
        loadEmployees();
    } catch (error) {
        console.error('Error updating employee:', error);
        showStatusModal('Error', error.message || 'Failed to update employee. Please try again.', 'error');
    }
}

// View employee details
function viewEmployee(id) {
    const employee = employees.find(e => e.employee_id === id);
    if (!employee) {
        showStatusModal('Error', 'Employee not found.', 'error');
        return;
    }

    const fullName = `${employee.first_name || ''} ${employee.middle_name || ''} ${employee.last_name || ''}`.replace(/\s+/g, ' ').trim();
    const initials = getInitials(fullName);
    const jobClass = employee.job_title ? employee.job_title.toLowerCase().replace(/\s+/g, '-') : 'other';
    const statusClass = employee.employment_status ? employee.employment_status.toLowerCase().replace(/\s+/g, '-') : 'active';

    // Update view modal
    document.getElementById('viewEmployeeAvatar').textContent = initials;
    document.getElementById('viewEmployeeName').textContent = fullName;
    
    const jobBadge = document.getElementById('viewEmployeeJobBadge');
    jobBadge.textContent = employee.job_title || 'N/A';
    jobBadge.className = `role-badge ${jobClass}`;
    
    const statusBadge = document.getElementById('viewEmployeeStatusBadge');
    statusBadge.textContent = employee.employment_status || 'N/A';
    statusBadge.className = `status-badge ${statusClass}`;

    // Identification
    document.getElementById('viewEmployeeId').textContent = employee.employee_id || 'N/A';
    document.getElementById('viewEmployeeNumber').textContent = employee.employee_number || 'N/A';

    // Personal Info
    document.getElementById('viewFullName').textContent = fullName;
    document.getElementById('viewGender').textContent = employee.gender || 'N/A';
    document.getElementById('viewDateOfBirth').textContent = formatDate(employee.date_of_birth);

    // Contact Info
    document.getElementById('viewEmail').textContent = employee.email || 'N/A';
    document.getElementById('viewPhone').textContent = employee.phone_number || 'N/A';
    document.getElementById('viewAddress').textContent = employee.address || 'N/A';

    // Work Info
    document.getElementById('viewDepartment').textContent = employee.department_name || 'N/A';
    document.getElementById('viewJobTitle').textContent = employee.job_title || 'N/A';
    document.getElementById('viewEmploymentType').textContent = employee.employment_type || 'N/A';
    document.getElementById('viewHireDate').textContent = formatDate(employee.hire_date);
    document.getElementById('viewEmploymentStatus').textContent = employee.employment_status || 'N/A';

    const modal = document.getElementById('viewEmployeeModal');
    if (modal) modal.classList.add('show');
}

// Delete employee (show confirmation)
function deleteEmployee(id) {
    const employee = employees.find(e => e.employee_id === id);
    if (!employee) {
        showStatusModal('Error', 'Employee not found.', 'error');
        return;
    }

    const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
    deleteEmployeeId = id;
    document.getElementById('confirmMessage').textContent = `Are you sure you want to permanently delete "${fullName}"? This action cannot be undone. The employee record will be completely removed from the system.`;
    
    const modal = document.getElementById('confirmModal');
    if (modal) modal.classList.add('show');
}

// Confirm delete - deletes the entire employee
async function confirmDelete() {
    if (!deleteEmployeeId) return;

    try {
        const response = await fetch(`${API_BASE}/employees/${deleteEmployeeId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete employee');
        }

        closeConfirmModal();
        showStatusModal('Success', 'Employee has been deleted successfully!', 'success');
        loadEmployees();
    } catch (error) {
        console.error('Error deleting employee:', error);
        closeConfirmModal();
        showStatusModal('Error', 'Failed to delete employee. Please try again.', 'error');
    } finally {
        deleteEmployeeId = null;
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
    deleteEmployeeId = null;
}

function closeViewEmployeeModal() {
    const modal = document.getElementById('viewEmployeeModal');
    if (modal) modal.classList.remove('show');
}

// ===== ROLE ASSIGNMENT FUNCTIONS =====
// Assign role to employee - opens modal
function assignRoleToEmployee(employeeId) {
    const employee = employees.find(e => e.employee_id === employeeId);
    if (!employee) {
        showStatusModal('Error', 'Employee not found.', 'error');
        return;
    }

    // Use setTimeout with longer delay to ensure DOM is fully rendered
    setTimeout(() => {
        // Get all modal and form elements
        const assignRoleForm = document.getElementById('assignRoleForm');
        const assignRoleEmployeeId = document.getElementById('assignRoleEmployeeId');
        const assignRoleEmployeeName = document.getElementById('assignRoleEmployeeName');
        const assignRoleEmployeeEmail = document.getElementById('assignRoleEmployeeEmail');
        const assignRoleSelect = document.getElementById('assignRoleSelect');
        const assignRoleStatus = document.getElementById('assignRoleStatus');
        const assignRoleDepartment = document.getElementById('assignRoleDepartment');
        const assignRoleModal = document.getElementById('assignRoleModal');

        console.log('Checking for modal elements:', {
            assignRoleForm: !!assignRoleForm,
            assignRoleEmployeeId: !!assignRoleEmployeeId,
            assignRoleEmployeeName: !!assignRoleEmployeeName,
            assignRoleEmployeeEmail: !!assignRoleEmployeeEmail,
            assignRoleSelect: !!assignRoleSelect,
            assignRoleStatus: !!assignRoleStatus,
            assignRoleDepartment: !!assignRoleDepartment,
            assignRoleModal: !!assignRoleModal
        });

        // Validate all elements exist
        const missingElements = [];
        if (!assignRoleForm) missingElements.push('assignRoleForm');
        if (!assignRoleEmployeeId) missingElements.push('assignRoleEmployeeId');
        if (!assignRoleEmployeeName) missingElements.push('assignRoleEmployeeName');
        if (!assignRoleEmployeeEmail) missingElements.push('assignRoleEmployeeEmail');
        if (!assignRoleSelect) missingElements.push('assignRoleSelect');
        if (!assignRoleStatus) missingElements.push('assignRoleStatus');
        if (!assignRoleDepartment) missingElements.push('assignRoleDepartment');
        if (!assignRoleModal) missingElements.push('assignRoleModal');

        if (missingElements.length > 0) {
            console.error('Missing elements:', missingElements);
            console.error('Total elements in document:', document.querySelectorAll('*').length);
            showStatusModal('Error', `Modal elements not found: ${missingElements.join(', ')}. Please refresh the page.`, 'error');
            return;
        }

        const fullName = `${employee.first_name || ''} ${employee.middle_name || ''} ${employee.last_name || ''}`.replace(/\s+/g, ' ').trim();

        // Set employee info
        assignRoleEmployeeId.value = employee.employee_id;
        assignRoleEmployeeName.textContent = fullName;
        assignRoleEmployeeEmail.textContent = employee.email || 'No email';

        // Reset form
        assignRoleSelect.value = '';
        assignRoleStatus.value = 'Active';
        
        // Set department if available
        if (employee.department_id) {
            assignRoleDepartment.value = employee.department_id;
        } else {
            assignRoleDepartment.value = '';
        }

        // Populate department dropdown if it exists
        if (departments && departments.length > 0) {
            const currentDept = assignRoleDepartment.value;
            assignRoleDepartment.innerHTML = '<option value="">-- Select Department --</option>';
            departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.department_id;
                option.textContent = dept.department_name;
                assignRoleDepartment.appendChild(option);
            });
            if (currentDept) assignRoleDepartment.value = currentDept;
        }

        // Open modal
        assignRoleModal.classList.add('show');
    }, 100);
}

// Save role assignment
async function saveRoleAssignment() {
    const employeeId = document.getElementById('assignRoleEmployeeId').value;
    const role = document.getElementById('assignRoleSelect').value;
    const department = document.getElementById('assignRoleDepartment').value;
    const status = document.getElementById('assignRoleStatus').value;

    if (!role) {
        showStatusModal('Error', 'Please select a role.', 'error');
        return;
    }

    const employee = employees.find(e => e.employee_id === parseInt(employeeId));
    if (!employee) {
        showStatusModal('Error', 'Employee not found.', 'error');
        return;
    }

    const roleData = {
        employeeId: employeeId,
        employeeName: `${employee.first_name || ''} ${employee.middle_name || ''} ${employee.last_name || ''}`.replace(/\s+/g, ' ').trim(),
        employeeEmail: employee.email,
        role: role,
        department: department || employee.department_name || '',
        status: status
    };

    try {
        const response = await fetch(`${API_BASE}/employees/${employeeId}/assign-role`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(roleData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to assign role');
        }

        const result = await response.json();
        closeModal('assignRoleModal');
        showStatusModal('Success', `Role "${role}" has been assigned to ${roleData.employeeName} and they now appear in Staff Management!`, 'success');
        loadEmployees();
    } catch (error) {
        console.error('Error assigning role:', error);
        showStatusModal('Error', error.message || 'Failed to assign role. Please try again.', 'error');
    }
}

// Remove role assignment
async function removeRoleAssignment() {
    const employeeId = document.getElementById('assignRoleEmployeeId').value;
    const employee = employees.find(e => e.employee_id === parseInt(employeeId));
    
    if (!employee) {
        showStatusModal('Error', 'Employee not found.', 'error');
        return;
    }

    const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim();

    try {
        // Remove staff role assignment by calling the API to remove staff record
        const response = await fetch(`${API_BASE}/staff/email/${encodeURIComponent(employee.email)}`, {
            method: 'DELETE'
        });

        if (!response.ok && response.status !== 404) {
            throw new Error('Failed to remove staff assignment');
        }

        closeModal('assignRoleModal');
        showStatusModal('Success', `Staff role assignment removed from ${fullName}. They are no longer in Staff Management.`, 'success');
        loadEmployees();
    } catch (error) {
        console.error('Error removing staff assignment:', error);
        showStatusModal('Error', 'Failed to remove staff assignment. Please try again.', 'error');
    }
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
