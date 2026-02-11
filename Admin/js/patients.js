// Patient Management Page Script with API Integration

const API_BASE = 'http://localhost:3001/api';
let allPatients = [];
let pendingDeletePatientId = null;

// Show status modal instead of browser alert
function showStatusModal(title, message, isSuccess = true) {
    const modal = document.getElementById('statusModal');
    const titleEl = document.getElementById('statusTitle');
    const messageEl = document.getElementById('statusMessage');
    
    if (modal && titleEl && messageEl) {
        titleEl.textContent = title;
        titleEl.style.color = isSuccess ? '#10b981' : '#ef4444';
        messageEl.textContent = message;
        modal.classList.add('show');
        modal.style.display = 'flex';
    }
}

// Show confirm modal for delete actions
function showConfirmModal(title, message, patientId) {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmTitle');
    const messageEl = document.getElementById('confirmMessage');
    
    if (modal && titleEl && messageEl) {
        titleEl.textContent = title;
        messageEl.textContent = message;
        pendingDeletePatientId = patientId;
        modal.classList.add('show');
        modal.style.display = 'flex';
    }
}

// Close confirm modal
function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
    pendingDeletePatientId = null;
}

// Confirm delete action
function confirmDelete() {
    if (pendingDeletePatientId !== null) {
        deletePatientFromDB(pendingDeletePatientId);
    }
    closeConfirmModal();
}

// Show view patient modal
function showViewPatientModal(patient) {
    const modal = document.getElementById('viewPatientModal');
    if (!modal) return;
    
    const lastVisit = patient.last_visit ? new Date(patient.last_visit).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : 'N/A';
    
    const temp = patient.body_temperature ? parseFloat(patient.body_temperature).toFixed(1) + '°C' : 'N/A';
    const statusClass = patient.status === 'active' ? 'active' : 'inactive';
    
    document.getElementById('viewPatientName').textContent = patient.name;
    document.getElementById('viewPatientId').textContent = patient.patient_id || patient.id;
    document.getElementById('viewPatientEmail').textContent = patient.email || 'N/A';
    document.getElementById('viewPatientStatus').textContent = patient.status === 'active' ? 'Active' : 'Inactive';
    document.getElementById('viewPatientStatus').className = 'status-badge ' + statusClass;
    document.getElementById('viewPatientTemp').textContent = temp;
    document.getElementById('viewPatientLastVisit').textContent = lastVisit;
    
    modal.classList.add('show');
    modal.style.display = 'flex';
}

// Close view patient modal
function closeViewPatientModal() {
    const modal = document.getElementById('viewPatientModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

// Close status modal
function closeStatusModal() {
    const modal = document.getElementById('statusModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadPatients();
});

// Setup event listeners
function setupEventListeners() {
    const searchInput = document.querySelector('.search-input') || document.querySelector('.search-box input');
    const statusFilter = document.querySelector('.status-filter') || (document.querySelectorAll('.filter-select').length > 0 ? document.querySelectorAll('.filter-select')[0] : null);
    const tempFilter = document.querySelector('.temp-filter') || (document.querySelectorAll('.filter-select').length > 1 ? document.querySelectorAll('.filter-select')[1] : null);
    const logoutBtn = document.querySelector('.logout-btn');
    const addPatientBtn = document.querySelector('.add-patient-btn');
    const editModal = document.getElementById('editPatientModal');
    const addModal = document.getElementById('addPatientModal');
    const addForm = document.getElementById('addPatientForm');
    const editForm = document.getElementById('editPatientForm');

    if (searchInput) {
        searchInput.addEventListener('input', filterPatients);
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', filterPatients);
    }

    if (tempFilter) {
        tempFilter.addEventListener('change', filterPatients);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Add Patient Button
    if (addPatientBtn) {
        addPatientBtn.addEventListener('click', function() {
            openAddPatientModal();
        });
    }

    // Add Patient Form
    if (addForm) {
        addForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await addNewPatient();
        });
    }

    // Edit Patient Form
    if (editForm) {
        editForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await savePatientChanges();
        });
    }

    // Close modals
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal');
            const modal = document.getElementById(modalId);
            if (modal) {
                closeModal(modalId);
            }
        });
    });

    // Cancel buttons
    document.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal');
            const modal = document.getElementById(modalId);
            if (modal) {
                closeModal(modalId);
            }
        });
    });

    // Close modals by clicking outside
    if (addModal) {
        addModal.addEventListener('click', function(e) {
            if (e.target === addModal) {
                closeModal('addPatientModal');
            }
        });
    }

    if (editModal) {
        editModal.addEventListener('click', function(e) {
            if (e.target === editModal) {
                closeModal('editPatientModal');
            }
        });
    }

    // Status modal click outside to close
    const statusModal = document.getElementById('statusModal');
    if (statusModal) {
        statusModal.addEventListener('click', function(e) {
            if (e.target === statusModal) {
                closeStatusModal();
            }
        });
    }

    // Add event delegation for action buttons
    document.addEventListener('click', function(e) {
        const viewBtn = e.target.closest('.view-btn') || e.target.closest('.action-btn.view');
        const editBtn = e.target.closest('.edit-btn') || e.target.closest('.action-btn.edit');
        const deleteBtn = e.target.closest('.delete-btn') || e.target.closest('.action-btn.delete');

        if (viewBtn) {
            const row = viewBtn.closest('tr');
            const patientId = row.dataset.patientId;
            const patientData = allPatients.find(p => p.id === parseInt(patientId));
            if (patientData) {
                showViewPatientModal(patientData);
            }
        }

        if (editBtn) {
            const row = editBtn.closest('tr');
            const patientId = row.dataset.patientId;
            const patientData = allPatients.find(p => p.id === parseInt(patientId));
            if (patientData) {
                openEditModal(patientData);
            }
        }

        if (deleteBtn) {
            const row = deleteBtn.closest('tr');
            const patientName = row.querySelector('.patient-name').textContent;
            const patientId = row.dataset.patientId;
            showConfirmModal('Confirm Delete', 'Are you sure you want to delete ' + patientName + '?', parseInt(patientId));
        }
    });
}

// Load patients from backend
async function loadPatients() {
    try {
        const response = await fetch(`${API_BASE}/patients`);
        if (response.ok) {
            allPatients = await response.json();
            renderPatients(allPatients);
        } else {
            console.error('Failed to load patients');
        }
    } catch (error) {
        console.error('Error loading patients:', error);
    }
}

// Render patients in table
function renderPatients(patients) {
    const tbody = document.querySelector('.patients-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Update patient count
    const patientCountEl = document.getElementById('patientCount');
    if (patientCountEl) {
        patientCountEl.textContent = `${patients.length} patient${patients.length !== 1 ? 's' : ''} found`;
    }

    if (patients.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-users" style="font-size: 48px; margin-bottom: 16px; color: #ccc; display: block;"></i>
                    No patients found. Click "Add Patient" to add your first patient.
                </td>
            </tr>
        `;
        return;
    }

    patients.forEach(patient => {
        const row = createPatientRow(patient);
        tbody.appendChild(row);
    });
}

// Create patient row element
function createPatientRow(patient) {
    const row = document.createElement('tr');
    row.dataset.patientId = patient.id;

    const tempStatus = patient.body_temperature && parseFloat(patient.body_temperature) > 38 ? 'fever' : 'normal';
    const tempClass = tempStatus === 'fever' ? 'fever' : '';

    const statusClass = patient.status === 'active' ? 'active' : 'inactive';
    const statusText = patient.status === 'active' ? 'Active' : 'Inactive';

    const lastVisit = patient.last_visit ? new Date(patient.last_visit).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).replace(/\//g, '/') : 'N/A';

    const tempDisplay = patient.body_temperature ? parseFloat(patient.body_temperature).toFixed(1) + '°C' : 'N/A';

    row.innerHTML = `
        <td><input type="checkbox" class="row-checkbox"></td>
        <td>
            <div class="patient-cell">
                <div class="patient-avatar" style="background-color: ${patient.avatar_color || '#2563eb'}">${patient.name.substring(0, 2).toUpperCase()}</div>
                <div class="patient-info">
                    <div class="patient-name">${patient.name}</div>
                    <div class="patient-email">${patient.email || 'N/A'}</div>
                </div>
            </div>
        </td>
        <td>${patient.patient_id || patient.id}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td><span class="temperature ${tempClass}">${tempDisplay}</span></td>
        <td>${lastVisit}</td>
        <td>
            <div class="action-buttons">
                <button class="action-btn view-btn" title="View"><i class="fas fa-eye"></i></button>
                <button class="action-btn edit-btn" title="Edit"><i class="fas fa-pencil"></i></button>
                <button class="action-btn delete-btn" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
        </td>
    `;

    return row;
}

// Filter patients
function filterPatients() {
    const searchInput = document.querySelector('.search-input') || document.querySelector('.search-box input');
    const statusFilter = document.querySelector('.status-filter') || (document.querySelectorAll('.filter-select').length > 0 ? document.querySelectorAll('.filter-select')[0] : null);
    const tempFilter = document.querySelector('.temp-filter') || (document.querySelectorAll('.filter-select').length > 1 ? document.querySelectorAll('.filter-select')[1] : null);

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const statusValue = statusFilter ? statusFilter.value : 'all';
    const tempValue = tempFilter ? tempFilter.value : 'all';

    let filtered = allPatients.filter(patient => {
        const matchesSearch = !searchTerm || 
            patient.name.toLowerCase().includes(searchTerm) || 
            (patient.email && patient.email.toLowerCase().includes(searchTerm));
        
        let matchesStatus = statusValue === 'all' || statusValue === 'All Status' || patient.status === statusValue.toLowerCase();
        
        let matchesTemp = tempValue === 'all' || tempValue === 'All Temperature';
        if (tempValue === 'fever' || tempValue === 'Fever (>38°C)') {
            matchesTemp = patient.body_temperature > 38;
        }
        if (tempValue === 'normal' || tempValue === 'Normal (36-37°C)') {
            matchesTemp = patient.body_temperature >= 36 && patient.body_temperature <= 37;
        }
        if (tempValue === 'low' || tempValue === 'Low (<36°C)') {
            matchesTemp = patient.body_temperature < 36 && patient.body_temperature > 0;
        }

        return matchesSearch && matchesStatus && matchesTemp;
    });

    renderPatients(filtered);
}

// Open edit modal
function openEditModal(patient) {
    const modal = document.getElementById('editPatientModal');
    if (!modal) return;

    modal.dataset.patientId = patient.id;

    const nameInput = modal.querySelector('#patientName');
    const idInput = modal.querySelector('#patientId');
    const emailInput = modal.querySelector('#patientEmail');
    const statusSelect = modal.querySelector('#patientStatus');
    const tempInput = modal.querySelector('#patientTemp');
    const visitInput = modal.querySelector('#lastVisit');

    if (nameInput) nameInput.value = patient.name;
    if (idInput) idInput.value = patient.patient_id;
    if (emailInput) emailInput.value = patient.email || '';
    if (statusSelect) statusSelect.value = patient.status || 'active';
    if (tempInput) tempInput.value = patient.body_temperature || '';
    if (visitInput) {
        if (patient.last_visit) {
            const date = new Date(patient.last_visit);
            visitInput.value = date.toISOString().split('T')[0];
        } else {
            visitInput.value = '';
        }
    }

    modal.classList.add('show');
    modal.style.display = 'flex';
}

// Open add patient modal
function openAddPatientModal() {
    const modal = document.getElementById('addPatientModal');
    if (!modal) return;
    
    const form = document.getElementById('addPatientForm');
    if (form) {
        form.reset();
    }
    
    modal.classList.add('show');
    modal.style.display = 'flex';
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId || 'editPatientModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

// Save patient changes
async function savePatientChanges() {
    const modal = document.getElementById('editPatientModal');
    const patientId = parseInt(modal.dataset.patientId);
    
    const nameInput = modal.querySelector('#patientName');
    const emailInput = modal.querySelector('#patientEmail');
    const statusSelect = modal.querySelector('#patientStatus');
    const tempInput = modal.querySelector('#patientTemp');
    const visitInput = modal.querySelector('#lastVisit');

    const updatedData = {
        name: nameInput.value,
        email: emailInput.value || null,
        status: statusSelect.value,
        body_temperature: tempInput.value ? parseFloat(tempInput.value) : null,
        last_visit: visitInput.value || null
    };

    try {
        const response = await fetch(`${API_BASE}/patients/${patientId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        });

        if (response.ok) {
            const updatedPatient = await response.json();
            const index = allPatients.findIndex(p => p.id === patientId);
            if (index !== -1) {
                allPatients[index] = updatedPatient;
            }
            filterPatients();
            closeModal('editPatientModal');
            showStatusModal('Success', 'Patient updated successfully!', true);
        } else {
            showStatusModal('Error', 'Error updating patient', false);
        }
    } catch (error) {
        console.error('Error updating patient:', error);
        showStatusModal('Error', 'Error updating patient: ' + error.message, false);
    }
}

// Add new patient
async function addNewPatient() {
    const modal = document.getElementById('addPatientModal');
    const form = document.getElementById('addPatientForm');
    
    const nameInput = form.querySelector('#addPatientName');
    const emailInput = form.querySelector('#addPatientEmail');
    const statusSelect = form.querySelector('#addPatientStatus');
    const tempInput = form.querySelector('#addPatientTemp');
    const visitInput = form.querySelector('#addLastVisit');

    const newPatientData = {
        name: nameInput.value,
        email: emailInput.value,
        status: statusSelect.value,
        body_temperature: parseFloat(tempInput.value),
        last_visit: visitInput.value
    };

    try {
        const response = await fetch(`${API_BASE}/patients`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newPatientData)
        });

        if (response.ok) {
            const newPatient = await response.json();
            allPatients.push(newPatient);
            filterPatients();
            closeModal('addPatientModal');
            showStatusModal('Success', 'Patient added successfully! Patient ID: ' + newPatient.patient_id, true);
        } else {
            const error = await response.json();
            showStatusModal('Error', 'Error adding patient: ' + (error.error || 'Unknown error'), false);
        }
    } catch (error) {
        console.error('Error adding patient:', error);
        showStatusModal('Error', 'Error adding patient: ' + error.message, false);
    }
}

// Delete patient action
function deletePatientAction() {
    const modal = document.getElementById('editPatientModal');
    const patientId = parseInt(modal.dataset.patientId);
    const patient = allPatients.find(p => p.id === patientId);
    const patientName = patient ? patient.name : 'this patient';
    closeModal('editPatientModal');
    showConfirmModal('Confirm Delete', 'Are you sure you want to delete ' + patientName + '?', patientId);
}

// Delete patient from database
async function deletePatientFromDB(patientId) {
    try {
        const response = await fetch(`${API_BASE}/patients/${patientId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            allPatients = allPatients.filter(p => p.id !== patientId);
            filterPatients();
            closeModal('editPatientModal');
            showStatusModal('Success', 'Patient deleted successfully!', true);
        }
    } catch (error) {
        console.error('Error deleting patient:', error);
        showStatusModal('Error', 'Error deleting patient', false);
    }
}

// Logout functionality
function handleLogout() {
    showLogoutModal();
}

// Show logout confirmation modal
function showLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
    }
}

// Close logout modal
function closeLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

// Confirm logout
function confirmLogout() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'login.html';
}
