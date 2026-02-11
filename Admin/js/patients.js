// Patient Management Page Script with API Integration

const API_BASE = 'http://localhost:3001/api';
let allPatients = [];

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
    const modal = document.getElementById('editModal') || document.getElementById('editPatientModal');
    const closeBtn = document.querySelector('.modal-close');
    const cancelBtn = document.querySelector('.btn-cancel') || document.querySelector('.modal-cancel-btn');
    const saveBtn = document.querySelector('.btn-save') || document.querySelector('.modal-save-btn');
    const deleteBtn = document.querySelector('.btn-delete') || document.querySelector('.modal-delete-btn');

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

    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', savePatientChanges);
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', deletePatientAction);
    }

    if (modal) {
        window.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
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
            const patientName = row.querySelector('.patient-name').textContent;
            alert('View details for: ' + patientName);
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
            if (confirm('Are you sure you want to delete ' + patientName + '?')) {
                deletePatientFromDB(parseInt(patientId));
            }
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

    patients.forEach(patient => {
        const row = createPatientRow(patient);
        tbody.appendChild(row);
    });
}

// Create patient row element
function createPatientRow(patient) {
    const row = document.createElement('tr');
    row.dataset.patientId = patient.id;

    const tempStatus = patient.body_temperature > 38 ? 'fever' : 'normal';
    const tempClass = tempStatus === 'fever' ? 'fever' : '';

    const statusClass = patient.status === 'active' ? 'active' : 'inactive';
    const statusText = patient.status === 'active' ? 'Active' : 'Inactive';

    const lastVisit = patient.last_visit ? new Date(patient.last_visit).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).replace(/\//g, '/') : 'N/A';

    const tempDisplay = patient.body_temperature ? patient.body_temperature.toFixed(1) + '°C' : 'N/A';

    row.innerHTML = `
        <td>
            <div class="patient-cell">
                <div class="patient-avatar" style="background-color: ${patient.avatar_color || '#2563eb'}">${patient.name.substring(0, 2).toUpperCase()}</div>
                <div class="patient-info">
                    <div class="patient-name">${patient.name}</div>
                    <div class="patient-email">${patient.email || 'N/A'}</div>
                </div>
            </div>
        </td>
        <td>${patient.patient_id}</td>
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
    const modal = document.getElementById('editModal') || document.getElementById('editPatientModal');
    if (!modal) return;

    modal.dataset.patientId = patient.id;

    const nameInput = modal.querySelector('input[name="name"]') || modal.querySelector('#patientName');
    const idInput = modal.querySelector('input[name="patient_id"]') || modal.querySelector('#patientId');
    const statusSelect = modal.querySelector('select[name="status"]') || modal.querySelector('#patientStatus');
    const tempInput = modal.querySelector('input[name="body_temperature"]') || modal.querySelector('#patientTemp');
    const visitInput = modal.querySelector('input[name="last_visit"]') || modal.querySelector('#lastVisit');

    if (nameInput) nameInput.value = patient.name;
    if (idInput) idInput.value = patient.patient_id;
    if (statusSelect) statusSelect.value = patient.status;
    if (tempInput) tempInput.value = patient.body_temperature || '';
    if (visitInput) {
        if (patient.last_visit) {
            const date = new Date(patient.last_visit);
            visitInput.value = date.toISOString().split('T')[0];
        } else {
            visitInput.value = '';
        }
    }

    if (modal.classList) {
        modal.classList.add('show');
    } else {
        modal.style.display = 'flex';
    }
}

// Close modal
function closeModal() {
    const modal = document.getElementById('editModal') || document.getElementById('editPatientModal');
    if (modal) {
        if (modal.classList) {
            modal.classList.remove('show');
        } else {
            modal.style.display = 'none';
        }
    }
}

// Save patient changes
async function savePatientChanges() {
    const modal = document.getElementById('editModal') || document.getElementById('editPatientModal');
    const patientId = parseInt(modal.dataset.patientId);
    
    const nameInput = modal.querySelector('input[name="name"]') || modal.querySelector('#patientName');
    const idInput = modal.querySelector('input[name="patient_id"]') || modal.querySelector('#patientId');
    const statusSelect = modal.querySelector('select[name="status"]') || modal.querySelector('#patientStatus');
    const tempInput = modal.querySelector('input[name="body_temperature"]') || modal.querySelector('#patientTemp');
    const visitInput = modal.querySelector('input[name="last_visit"]') || modal.querySelector('#lastVisit');

    const updatedData = {
        name: nameInput.value,
        patient_id: idInput.value,
        status: statusSelect.value.toLowerCase(),
        body_temperature: tempInput.value ? parseFloat(tempInput.value) : null,
        last_visit: visitInput.value || null,
        email: allPatients.find(p => p.id === patientId)?.email || null
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
            closeModal();
            alert('Patient updated successfully');
        }
    } catch (error) {
        console.error('Error updating patient:', error);
        alert('Error updating patient');
    }
}

// Delete patient action
function deletePatientAction() {
    const modal = document.getElementById('editModal') || document.getElementById('editPatientModal');
    const patientId = parseInt(modal.dataset.patientId);
    if (confirm('Are you sure you want to delete this patient?')) {
        deletePatientFromDB(patientId);
    }
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
            closeModal();
            alert('Patient deleted successfully');
        }
    } catch (error) {
        console.error('Error deleting patient:', error);
        alert('Error deleting patient');
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
