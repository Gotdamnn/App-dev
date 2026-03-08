// Staff Management JavaScript
if (typeof API_BASE === 'undefined') {
    var API_BASE = 'http://localhost:3001/api';
}

let staffMembers = [];
let departments = [];
let currentPage = 1;
const itemsPerPage = 10;
let selectedRole = 'all';
let currentEditingStaffId = null;
let currentPermissions = {};
let currentDeleteStaffId = null;
let currentDeleteStaffName = null;
let currentUser = null; // Current logged-in user from localStorage

// Default permissions based on role
const rolePermissions = {
    'Super Admin': [
        'view_staff', 'add_staff', 'edit_staff', 'delete_staff', 'manage_permissions',
        'view_patient', 'add_patient', 'edit_patient', 'delete_patient',
        'view_device', 'add_device', 'edit_device', 'delete_device',
        'view_department', 'add_department', 'edit_department', 'delete_department',
        'view_reports', 'export_reports', 'view_analytics',
        'view_settings', 'edit_settings', 'view_audit_logs', 'manage_backup'
    ],
    'Admin': [
        'view_staff', 'edit_staff',
        'view_patient', 'add_patient', 'edit_patient', 'delete_patient',
        'view_device', 'add_device', 'edit_device', 'delete_device',
        'view_department', 'add_department', 'edit_department',
        'view_reports', 'export_reports', 'view_analytics',
        'view_settings', 'view_audit_logs'
    ],
    'Manager': [
        'view_staff',
        'view_patient', 'add_patient', 'edit_patient',
        'view_device', 'add_device', 'edit_device',
        'view_department',
        'view_reports'
    ],
    'Supervisor': [
        'view_patient', 'edit_patient',
        'view_device',
        'view_reports'
    ]
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Load current user from localStorage
    const userSession = localStorage.getItem('userSession');
    if (userSession) {
        try {
            currentUser = JSON.parse(userSession);
            console.log('Current user loaded:', currentUser.name || currentUser.email);
        } catch (err) {
            console.error('Failed to parse user session:', err);
        }
    }
    
    loadDepartments();
    loadStaffMembers();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Add Staff button
    const addBtn = document.querySelector('.add-staff-btn');
    if (addBtn) {
        addBtn.addEventListener('click', openAddStaffModal);
    }

    // Role tabs
    document.querySelectorAll('.role-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            selectedRole = this.dataset.role;
            currentPage = 1;
            loadStaffMembers();
        });
    });

    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            currentPage = 1;
            loadStaffMembers();
        });
    }

    // Filter selects
    document.getElementById('roleFilter')?.addEventListener('change', function() {
        currentPage = 1;
        loadStaffMembers();
    });

    document.getElementById('statusFilter')?.addEventListener('change', function() {
        currentPage = 1;
        loadStaffMembers();
    });

    // Staff form submission
    const addForm = document.getElementById('addStaffForm');
    if (addForm) {
        addForm.addEventListener('submit', addNewStaffMember);
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

    // Role select change to update permissions
    document.getElementById('staffRole')?.addEventListener('change', function() {
        updatePermissionsDisplay(this.value);
    });

    // Save permissions button
    document.getElementById('savePermissionsBtn')?.addEventListener('click', savePermissions);

    // Delete confirmation button
    document.getElementById('deleteConfirmBtn')?.addEventListener('click', confirmDeleteStaff);

    // Pagination buttons
    document.getElementById('prevBtn')?.addEventListener('click', function() {
        if (currentPage > 1) {
            currentPage--;
            loadStaffMembers();
        }
    });

    document.getElementById('nextBtn')?.addEventListener('click', function() {
        currentPage++;
        loadStaffMembers();
    });
}

// Load departments
async function loadDepartments() {
    try {
        const response = await fetch(`${API_BASE}/departments`);
        if (!response.ok) throw new Error('Failed to fetch departments');

        departments = await response.json();

        // Update department filters
        const deptFilter = document.getElementById('staffDepartment');
        if (deptFilter) {
            departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.department_id;
                option.textContent = dept.department_name;
                deptFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}

// Load staff members
async function loadStaffMembers() {
    try {
        // Fetch from API
        const response = await fetch(`${API_BASE}/staff`);
        if (!response.ok) throw new Error('Failed to fetch staff');
        
        staffMembers = await response.json();

        // Load permissions for each staff member
        for (let staff of staffMembers) {
            const permResponse = await fetch(`${API_BASE}/staff/${staff.id}/permissions`);
            if (permResponse.ok) {
                staff.permissions = await permResponse.json();
            } else {
                staff.permissions = rolePermissions[staff.role] || [];
            }
        }

        // Apply filters
        let filtered = staffMembers;

        // Role filter
        if (selectedRole !== 'all') {
            filtered = filtered.filter(s => s.role === selectedRole);
        }

        // Search filter
        const searchTerm = document.getElementById('searchInput')?.value?.toLowerCase() || '';
        if (searchTerm) {
            filtered = filtered.filter(s =>
                s.name.toLowerCase().includes(searchTerm) ||
                s.email.toLowerCase().includes(searchTerm) ||
                s.role.toLowerCase().includes(searchTerm)
            );
        }

        // Role filter from dropdown
        const roleFilterValue = document.getElementById('roleFilter')?.value || '';
        if (roleFilterValue) {
            filtered = filtered.filter(s => s.role === roleFilterValue);
        }

        // Status filter
        const statusFilterValue = document.getElementById('statusFilter')?.value || '';
        if (statusFilterValue) {
            filtered = filtered.filter(s => s.status === statusFilterValue);
        }

        // Pagination
        const totalPages = Math.ceil(filtered.length / itemsPerPage);
        if (currentPage > totalPages && totalPages > 0) {
            currentPage = totalPages;
        }

        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedItems = filtered.slice(start, end);

        // Update staff count
        document.getElementById('staffCount').textContent = `Total: ${filtered.length} staff members`;

        // Update page info
        document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages || 1}`;

        // Enable/disable pagination buttons
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        if (prevBtn) prevBtn.disabled = currentPage === 1;
        if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

        // Render table
        renderStaffTable(paginatedItems);
    } catch (error) {
        console.error('Error loading staff members:', error);
    }
}

// Generate mock staff data
function generateMockStaffData() {
    const mockStaff = [
        {
            id: 1,
            name: 'John Administrator',
            email: 'john.admin@hospital.com',
            role: 'Super Admin',
            department: 'Administration',
            status: 'Active',
            permissions: rolePermissions['Super Admin'],
            avatar: 'JA'
        },
        {
            id: 2,
            name: 'Sarah Manager',
            email: 'sarah.manager@hospital.com',
            role: 'Admin',
            department: 'IT',
            status: 'Active',
            permissions: rolePermissions['Admin'],
            avatar: 'SM'
        },
        {
            id: 3,
            name: 'Michael Johnson',
            email: 'michael.johnson@hospital.com',
            role: 'Manager',
            department: 'HR',
            status: 'Active',
            permissions: rolePermissions['Manager'],
            avatar: 'MJ'
        },
        {
            id: 4,
            name: 'Emily Davis',
            email: 'emily.davis@hospital.com',
            role: 'Supervisor',
            department: 'Nursing',
            status: 'Active',
            permissions: rolePermissions['Supervisor'],
            avatar: 'ED'
        },
        {
            id: 5,
            name: 'Robert Wilson',
            email: 'robert.wilson@hospital.com',
            role: 'Admin',
            department: 'Medical Records',
            status: 'Inactive',
            permissions: rolePermissions['Admin'],
            avatar: 'RW'
        }
    ];

    if (staffMembers.length === 0) {
        staffMembers = mockStaff;
    }
}

// Get department name from ID
function getDepartmentName(deptId) {
    if (!deptId) return 'N/A';
    const dept = departments.find(d => d.department_id == deptId);
    return dept ? dept.department_name : (typeof deptId === 'string' ? deptId : 'N/A');
}

// Render staff table
function renderStaffTable(items) {
    const tbody = document.getElementById('staffTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    items.forEach(staff => {
        const row = document.createElement('tr');

        const permissions = staff.permissions || rolePermissions[staff.role] || [];

        row.innerHTML = `
            <td><input type="checkbox"></td>
            <td>
                <div class="staff-name">
                    <div class="staff-avatar">${staff.avatar}</div>
                    <span>${staff.name}</span>
                </div>
            </td>
            <td>${staff.email}</td>
            <td><span class="role-badge ${staff.role.toLowerCase().replace(/\s+/g, '-')}">${staff.role}</span></td>
            <td>${getDepartmentName(staff.department)}</td>
            <td><span class="status-badge ${staff.status.toLowerCase()}">${staff.status}</span></td>
            <td>
                <a class="permissions-link" onclick="openPermissionsModal(${staff.id}, '${staff.name}')">
                    ${permissions.length} permissions
                </a>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit" onclick="openEditStaffModal(${staff.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" data-staff-id="${staff.id}" title="Delete Staff Member">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;

        tbody.appendChild(row);
    });
    
    // Add event listeners to delete buttons
    const deleteButtons = document.querySelectorAll('.action-btn.delete');
    console.log(`Attaching event listeners to ${deleteButtons.length} delete buttons`);
    
    deleteButtons.forEach((btn, index) => {
        // Remove any existing listeners first
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        // Add fresh listener
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const staffId = parseInt(this.dataset.staffId);
            console.log(`Delete button clicked for staff ID: ${staffId}`);
            deleteStaffMember(staffId);
        });
    });
}

// Open add staff modal
function openAddStaffModal() {
    currentEditingStaffId = null;
    document.getElementById('modalTitle').textContent = 'Add Staff Member';
    document.getElementById('addStaffForm').reset();
    document.getElementById('staffRole').value = '';
    updatePermissionsDisplay('');
    openModal('addStaffModal');
}

// Open edit staff modal
function openEditStaffModal(staffId) {
    const staff = staffMembers.find(s => s.id === staffId);
    if (!staff) return;

    currentEditingStaffId = staffId;
    document.getElementById('modalTitle').textContent = `Edit Staff Member - ${staff.name}`;
    document.getElementById('staffName').value = staff.name;
    document.getElementById('staffEmail').value = staff.email;
    document.getElementById('staffRole').value = staff.role;
    document.getElementById('staffDepartment').value = staff.department;
    document.getElementById('staffStatus').value = staff.status;

    updatePermissionsDisplay(staff.role);
    openModal('addStaffModal');
}

// Update permissions display based on role
function updatePermissionsDisplay(role) {
    const grid = document.getElementById('permissionsGrid');
    if (!grid) return;

    const permissions = rolePermissions[role] || [];
    grid.innerHTML = '';

    const allPermissions = [
        { value: 'view_staff', label: 'View Staff' },
        { value: 'add_staff', label: 'Add Staff' },
        { value: 'edit_staff', label: 'Edit Staff' },
        { value: 'delete_staff', label: 'Delete Staff' },
        { value: 'manage_permissions', label: 'Manage Permissions' },
        { value: 'view_patient', label: 'View Patients' },
        { value: 'add_patient', label: 'Add Patient' },
        { value: 'edit_patient', label: 'Edit Patient' },
        { value: 'delete_patient', label: 'Delete Patient' },
        { value: 'view_reports', label: 'View Reports' },
        { value: 'export_reports', label: 'Export Reports' }
    ];

    allPermissions.forEach(perm => {
        const label = document.createElement('label');
        label.className = 'permission-item';
        label.innerHTML = `
            <input type="checkbox" value="${perm.value}" class="permission-checkbox" ${permissions.includes(perm.value) ? 'checked' : ''}>
            <span>${perm.label}</span>
        `;
        grid.appendChild(label);
    });
}

// Open permissions modal
function openPermissionsModal(staffId, staffName) {
    const staff = staffMembers.find(s => s.id === staffId);
    if (!staff) return;

    currentEditingStaffId = staffId;
    currentPermissions = Array.isArray(staff.permissions) ? staff.permissions : [];

    document.getElementById('permissionStaffName').textContent = staffName;

    // Load all permission checkboxes
    document.querySelectorAll('.permissions-modal .permission-checkbox').forEach(checkbox => {
        checkbox.checked = currentPermissions.includes(checkbox.value);
    });
    
    // Update counter on open
    updatePermissionCounter();
    
    // Add event listeners to all permission checkboxes for real-time counter update
    document.querySelectorAll('#permissionsModal .permission-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updatePermissionCounter);
    });

    openModal('permissionsModal');
}

// Update the permission counter in real-time
function updatePermissionCounter() {
    const checkedCount = document.querySelectorAll('#permissionsModal .permission-checkbox:checked').length;
    const countEl = document.getElementById('permissionCount');
    if (countEl) {
        countEl.textContent = checkedCount;
        console.log(`Updated permission count: ${checkedCount}`);
    }
}

// Save permissions
async function savePermissions() {
    const checkboxes = document.querySelectorAll('#permissionsModal .permission-checkbox');
    const newPermissions = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    const staff = staffMembers.find(s => s.id === currentEditingStaffId);
    if (!staff) {
        console.error('Staff member not found');
        return;
    }
    
    console.log(`Saving ${newPermissions.length} permissions for staff ${staff.name} (ID: ${currentEditingStaffId})`);
    console.log('Permissions:', newPermissions);
    
    try {
        const response = await fetch(`${API_BASE}/staff/${currentEditingStaffId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...staff,
                permissions: newPermissions
            })
        });
        
        console.log(`PUT response status: ${response.status}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const responseData = await response.json();
        console.log('Updated permissions successfully:', responseData);
        
        // Update the staff member in memory
        staff.permissions = newPermissions;
        
        // Close modal
        closeModal('permissionsModal');
        
        // Reload staff list to update permission counts in the table
        await loadStaffMembers();
        
        alert('Permissions saved successfully!');
    } catch (error) {
        console.error('Error saving permissions:', error);
        alert('Failed to save permissions: ' + error.message);
    }
}

// Add new staff member
async function addNewStaffMember(e) {
    e.preventDefault();

    const staffData = {
        name: document.getElementById('staffName').value,
        email: document.getElementById('staffEmail').value,
        role: document.getElementById('staffRole').value,
        department: document.getElementById('staffDepartment').value,
        status: document.getElementById('staffStatus').value,
        permissions: rolePermissions[document.getElementById('staffRole').value] || []
    };

    try {
        const url = currentEditingStaffId ? `${API_BASE}/staff/${currentEditingStaffId}` : `${API_BASE}/staff`;
        const method = currentEditingStaffId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(staffData)
        });

        if (!response.ok) {
            throw new Error(`Failed to ${currentEditingStaffId ? 'update' : 'add'} staff member`);
        }

        closeModal('addStaffModal');
        currentPage = 1;
        loadStaffMembers();
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to save staff member: ' + error.message);
    }
}

// Check if current user has permission
function hasPermission(permission) {
    // If no user is logged in, deny access
    if (!currentUser) {
        console.warn('No user logged in, denying permission:', permission);
        return false;
    }
    
    // All admin users (in the admins table) have full permissions
    // Admin panel is restricted to admins only during login
    // For more granular control, add role/permissions to admins table
    console.log(`Permission check: user '${currentUser.name || currentUser.email}' requesting '${permission}' - GRANTED (admin access)`);
    return true;
}

// Delete staff member - show confirmation modal
function deleteStaffMember(staffId) {
    console.log(`deleteStaffMember called with staffId: ${staffId}`);
    
    // Check permission
    if (!hasPermission('delete_staff')) {
        console.warn('Permission denied for delete_staff');
        alert('You do not have permission to delete staff members.');
        return;
    }
    
    const staff = staffMembers.find(s => s.id === staffId);
    if (!staff) {
        console.error(`Staff member with ID ${staffId} not found`);
        return;
    }

    console.log(`Preparing to delete staff member: ${staff.name} (ID: ${staffId})`);
    currentDeleteStaffId = staffId;
    currentDeleteStaffName = staff.name;
    
    // Update modal message
    const messageEl = document.getElementById('deleteConfirmMessage');
    if (messageEl) {
        messageEl.textContent = `Are you sure you want to delete "${staff.name}"? This action cannot be undone.`;
    }
    
    // Reset button state
    const deleteBtn = document.getElementById('deleteConfirmBtn');
    if (deleteBtn) {
        deleteBtn.textContent = 'Delete';
        deleteBtn.disabled = false;
    }
    const cancelBtn = document.getElementById('deleteConfirmCancel');
    if (cancelBtn) {
        cancelBtn.disabled = false;
    }
    
    openModal('deleteConfirmModal');
}

// Confirm and perform deletion
async function confirmDeleteStaff() {
    console.log(`confirmDeleteStaff called for staff ID: ${currentDeleteStaffId}`);
    
    if (!currentDeleteStaffId) {
        console.error('No staff ID set for deletion');
        return;
    }
    
    const deleteBtn = document.getElementById('deleteConfirmBtn');
    if (!deleteBtn) {
        console.error('Delete button not found');
        return;
    }
    
    deleteBtn.textContent = 'Deleting...';
    deleteBtn.disabled = true;
    const cancelBtn = document.getElementById('deleteConfirmCancel');
    if (cancelBtn) cancelBtn.disabled = true;
    
    try {
        console.log(`Sending DELETE request to ${API_BASE}/staff/${currentDeleteStaffId}`);
        const response = await fetch(`${API_BASE}/staff/${currentDeleteStaffId}`, {
            method: 'DELETE'
        });

        console.log(`DELETE response status: ${response.status}`);
        
        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorData}`);
        }

        console.log(`Successfully deleted staff member with ID: ${currentDeleteStaffId}`);
        closeModal('deleteConfirmModal');
        
        currentDeleteStaffId = null;
        currentDeleteStaffName = null;
        
        // Reload the staff list
        loadStaffMembers();
        
        alert('Staff member deleted successfully');
    } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete staff member: ' + error.message);
        
        // Reset button state on error
        deleteBtn.textContent = 'Delete';
        deleteBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;
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

// Logout functions (from dashboard.js)
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
