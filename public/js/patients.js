// Patient Management Page Script with API Integration

if (typeof API_BASE === 'undefined') {
    var API_BASE = window.location.origin + '/api';
}
let allPatients = [];
let pendingDeletePatientId = null;
let currentViewedPatient = null;

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
}

// Show view patient modal
function showViewPatientModal(patient) {
    const modal = document.getElementById('viewPatientModal');
    if (!modal) return;
    
    currentViewedPatient = patient;
    
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
    document.getElementById('viewPatientAge').textContent = patient.age || 'N/A';
    document.getElementById('viewPatientGender').textContent = patient.gender || 'N/A';
    document.getElementById('viewPatientAccountStatus').textContent = patient.password ? 'Password Set' : 'No Password';
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

// Show temperature history modal
async function showTemperatureHistoryModal() {
    if (!currentViewedPatient) return;
    
    const modal = document.getElementById('temperatureHistoryModal');
    if (!modal) return;
    
    // Set patient name in modal header
    const patientNameEl = document.getElementById('tempHistoryPatientName');
    if (patientNameEl) {
        patientNameEl.textContent = currentViewedPatient.name;
    }
    
    // Display current body temperature
    const currentTempEl = document.getElementById('currentBodyTemperature');
    if (currentTempEl && currentViewedPatient.body_temperature) {
        const temp = parseFloat(currentViewedPatient.body_temperature);
        const tempColor = temp > 38 ? '#ef4444' : temp < 36 ? '#3b82f6' : '#10b981';
        const tempStatus = temp > 38 ? 'Fever' : temp < 36 ? 'Low' : 'Normal';
        currentTempEl.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: linear-gradient(135deg, ${tempColor}20, ${tempColor}10); border-radius: 8px; border-left: 4px solid ${tempColor}; margin-bottom: 16px;">
                <div>
                    <div style="font-size: 0.875rem; color: #6b7280; font-weight: 500;">Current Body Temperature</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: ${tempColor};">
                        ${temp.toFixed(1)}°C
                    </div>
                    <div style="font-size: 0.75rem; color: ${tempColor}; font-weight: 500;">${tempStatus}</div>
                </div>
            </div>
        `;
    }
    
    // Load temperature history
    await loadTemperatureHistory(currentViewedPatient.id);
    
    modal.classList.add('show');
    modal.style.display = 'flex';
}

// Close temperature history modal
function closeTemperatureHistoryModal() {
    const modal = document.getElementById('temperatureHistoryModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

// Load temperature history from API or mock data
async function loadTemperatureHistory(patientId) {
    const historyList = document.getElementById('temperatureHistoryList');
    if (!historyList) return;
    
    try {
        const response = await fetch(`${API_BASE}/patients/${patientId}/temperature-history`);
        
        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
                displayTemperatureHistory(data);
            } else {
                // No data found
                historyList.innerHTML = `
                    <div style="text-align: center; color: #6b7280; padding: 20px;">
                        <i class="fas fa-info-circle" style="font-size: 24px; margin-bottom: 10px; display: block; color: #d1d5db;"></i>
                        No temperature history available for this patient.
                    </div>
                `;
            }
        } else {
            // API error - show message
            historyList.innerHTML = `
                <div style="text-align: center; color: #ef4444; padding: 20px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                    Failed to load temperature history.
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading temperature history:', error);
        // Show error message instead of mock data
        historyList.innerHTML = `
            <div style="text-align: center; color: #ef4444; padding: 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                Error loading temperature history. Please try again.
            </div>
        `;
    }
}

// Display temperature history
function displayTemperatureHistory(historyData) {
    const historyList = document.getElementById('temperatureHistoryList');
    if (!historyList) return;
    
    if (!historyData || (Array.isArray(historyData) && historyData.length === 0)) {
        historyList.innerHTML = `
            <div style="text-align: center; color: #6b7280; padding: 20px;">
                No temperature history available for this patient.
            </div>
        `;
        return;
    }
    
    const records = Array.isArray(historyData) ? historyData : historyData.records || [];
    
    historyList.innerHTML = records.map(record => {
        const date = new Date(record.date || record.recorded_at);
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const temp = parseFloat(record.temperature || record.body_temperature) || 0;
        const tempColor = temp > 38 ? '#ef4444' : temp < 36 ? '#3b82f6' : '#10b981';
        const tempStatus = temp > 38 ? 'Fever' : temp < 36 ? 'Low' : 'Normal';
        
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f9fafb; border-radius: 8px; border-left: 4px solid ${tempColor};">
                <div>
                    <div style="font-weight: 600; color: #1f2937;">${formattedDate}</div>
                    <div style="font-size: 0.875rem; color: #6b7280;">${record.notes || 'Regular measurement'}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 1.25rem; font-weight: 700; color: ${tempColor};">
                        ${temp.toFixed(1)}°C
                    </div>
                    <div style="font-size: 0.75rem; color: #6b7280;">${tempStatus}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Display mock temperature history (for demonstration)
function displayTemperatureMockHistory() {
    const historyList = document.getElementById('temperatureHistoryList');
    if (!historyList) return;
    
    const mockData = [
        { date: new Date(Date.now() - 24*60*60*1000), temp: 37.2, status: 'Normal' },
        { date: new Date(Date.now() - 48*60*60*1000), temp: 37.5, status: 'Normal' },
        { date: new Date(Date.now() - 72*60*60*1000), temp: 36.8, status: 'Normal' },
        { date: new Date(Date.now() - 96*60*60*1000), temp: 38.1, status: 'Fever' },
        { date: new Date(Date.now() - 120*60*60*1000), temp: 38.4, status: 'Fever' }
    ];
    
    historyList.innerHTML = mockData.map(record => {
        const formattedDate = record.date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const tempColor = record.temp > 38 ? '#ef4444' : record.temp < 36 ? '#3b82f6' : '#10b981';
        
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f9fafb; border-radius: 8px; border-left: 4px solid ${tempColor};">
                <div>
                    <div style="font-weight: 600; color: #1f2937;">${formattedDate}</div>
                    <div style="font-size: 0.875rem; color: #6b7280;">Regular measurement</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 1.25rem; font-weight: 700; color: ${tempColor};">
                        ${record.temp.toFixed(1)}°C
                    </div>
                    <div style="font-size: 0.75rem; color: #6b7280;">${record.status}</div>
                </div>
            </div>
        `;
    }).join('');
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

    // Filter out undefined/null patients
    const validPatients = patients.filter(p => p && typeof p === 'object' && p.id);

    if (validPatients.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-users" style="font-size: 48px; margin-bottom: 16px; color: #ccc; display: block;"></i>
                    No patients found. Click "Add Patient" to add your first patient.
                </td>
            </tr>
        `;
        return;
    }

    validPatients.forEach(patient => {
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
                </div>
            </div>
        </td>
        <td>${patient.email || 'N/A'}</td>
        <td>${patient.age || 'N/A'}</td>
        <td>${patient.gender || 'N/A'}</td>
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
    const ageInput = modal.querySelector('#patientAge');
    const genderSelect = modal.querySelector('#patientGender');

    if (nameInput) nameInput.value = patient.name;
    if (idInput) idInput.value = patient.patient_id;
    if (emailInput) emailInput.value = patient.email || '';
    if (statusSelect) statusSelect.value = patient.status || 'active';
    if (tempInput) tempInput.value = patient.body_temperature || '';
    if (ageInput) ageInput.value = patient.age || '';
    if (genderSelect) genderSelect.value = patient.gender || '';
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
    
    console.log('📝 Updating patient ID:', patientId);
    
    const nameInput = modal.querySelector('#patientName');
    const emailInput = modal.querySelector('#patientEmail');
    const statusSelect = modal.querySelector('#patientStatus');
    const tempInput = modal.querySelector('#patientTemp');
    const visitInput = modal.querySelector('#lastVisit');
    const ageInput = modal.querySelector('#patientAge');
    const genderSelect = modal.querySelector('#patientGender');

    const updatedData = {
        name: nameInput.value,
        email: emailInput.value || null,
        status: statusSelect.value,
        body_temperature: tempInput.value ? parseFloat(tempInput.value) : null,
        last_visit: visitInput.value || null,
        age: ageInput.value ? parseInt(ageInput.value) : null,
        gender: genderSelect.value || null
    };
    
    console.log('📤 Sending data:', updatedData);

    try {
        const response = await fetch(`${API_BASE}/patients/${patientId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        });

        console.log('📥 Response status:', response.status);
        
        if (response.ok) {
            const responseData = await response.json();
            console.log('📥 Response data:', responseData);
            const index = allPatients.findIndex(p => p.id === patientId);
            console.log('🔍 Found patient at index:', index);
            if (index !== -1) {
                console.log('✏️ Updating patient in array from:', allPatients[index]);
                allPatients[index] = responseData.data;
                console.log('✏️ Patient updated to:', allPatients[index]);
            }
            filterPatients();
            closeModal('editPatientModal');
            showStatusModal('Success', 'Patient updated successfully!', true);
        } else {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { error: errorText };
            }
            console.error('❌ Error response:', errorData);
            showStatusModal('Error', 'Error updating patient: ' + (errorData.error || 'Unknown error'), false);
        }
    } catch (error) {
        console.error('❌ Exception:', error);
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
    const ageInput = form.querySelector('#addPatientAge');
    const genderSelect = form.querySelector('#addPatientGender');

    const newPatientData = {
        name: nameInput.value,
        email: emailInput.value,
        status: statusSelect.value,
        body_temperature: parseFloat(tempInput.value),
        last_visit: visitInput.value,
        age: ageInput.value ? parseInt(ageInput.value) : null,
        gender: genderSelect.value || null
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
            const response_data = await response.json();
            allPatients.push(response_data.data);
            filterPatients();
            closeModal('addPatientModal');
            showStatusModal('Success', 'Patient added successfully! Patient ID: ' + response_data.data.patient_id, true);
        } else {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { error: errorText };
            }
            showStatusModal('Error', 'Error adding patient: ' + (errorData.error || 'Unknown error'), false);
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
            closeConfirmModal();
            closeModal('editPatientModal');
            showStatusModal('Success', 'Patient deleted successfully!', true);
        } else {
            showStatusModal('Error', 'Failed to delete patient', false);
        }
    } catch (error) {
        console.error('Error deleting patient:', error);
        closeConfirmModal();
        showStatusModal('Error', 'Error deleting patient: ' + error.message, false);
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
    window.location.href = '/login';
}
