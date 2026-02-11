// devices.js
// Handles device monitoring page interactions with database API

const API_BASE = 'http://localhost:3001/api';
let currentEditingDeviceId = null;
let allDevices = [];

document.addEventListener('DOMContentLoaded', function () {
    // Load devices from database
    loadDevices();

    // Logout button
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            showLogoutModal();
        });
    }

    // Add Device button
    const addDeviceBtn = document.querySelector('.add-device-btn');
    if (addDeviceBtn) {
        addDeviceBtn.addEventListener('click', function () {
            openAddDeviceModal();
        });
    }

    // Modal functionality
    const editModal = document.getElementById('editDeviceModal');
    const addModal = document.getElementById('addDeviceModal');
    const editForm = document.getElementById('editDeviceForm');
    const addForm = document.getElementById('addDeviceForm');

    // Close modal buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal');
            if (modalId) {
                closeDeviceModal(modalId);
            }
        });
    });

    // Cancel buttons
    document.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal');
            if (modalId) {
                closeDeviceModal(modalId);
            }
        });
    });

    if (editForm) {
        editForm.addEventListener('submit', function (e) {
            e.preventDefault();
            saveDeviceChanges();
        });
    }

    if (addForm) {
        addForm.addEventListener('submit', function (e) {
            e.preventDefault();
            addNewDevice();
        });
    }

    // Close modals when clicking outside
    if (editModal) {
        editModal.addEventListener('click', function (e) {
            if (e.target === editModal) {
                closeDeviceModal('editDeviceModal');
            }
        });
    }

    if (addModal) {
        addModal.addEventListener('click', function (e) {
            if (e.target === addModal) {
                closeDeviceModal('addDeviceModal');
            }
        });
    }

    // Close other modals when clicking outside
    ['statusModal', 'confirmModal', 'viewDeviceModal', 'logoutModal'].forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.classList.remove('show');
                    modal.style.display = 'none';
                }
            });
        }
    });
});

// ===== API FUNCTIONS =====

// Load all devices from database
async function loadDevices() {
    try {
        const response = await fetch(`${API_BASE}/devices`);
        if (!response.ok) throw new Error('Failed to load devices');
        
        allDevices = await response.json();
        renderDevices(allDevices);
        updateDeviceStats();
    } catch (error) {
        console.error('Error loading devices:', error);
        showStatusModal('Error', 'Failed to load devices from database', 'error');
    }
}

// Render devices to separate grids (online and offline)
function renderDevices(devices) {
    const onlineGrid = document.getElementById('onlineDevicesGrid');
    const offlineGrid = document.getElementById('offlineDevicesGrid');
    
    if (!onlineGrid || !offlineGrid) return;

    // Separate devices by status
    const onlineDevices = devices.filter(d => d.status === 'online' || d.status === 'warning');
    const offlineDevices = devices.filter(d => d.status === 'offline');

    // Render online devices
    if (onlineDevices.length === 0) {
        onlineGrid.innerHTML = `
            <div class="no-devices" style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-wifi" style="font-size: 48px; margin-bottom: 16px; color: #ccc;"></i>
                <p>No online devices found.</p>
            </div>
        `;
    } else {
        onlineGrid.innerHTML = onlineDevices.map(device => createDeviceCardHTML(device)).join('');
    }

    // Render offline devices
    if (offlineDevices.length === 0) {
        offlineGrid.innerHTML = `
            <div class="no-devices" style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-plug" style="font-size: 48px; margin-bottom: 16px; color: #ccc;"></i>
                <p>No offline devices. All devices are connected!</p>
            </div>
        `;
    } else {
        offlineGrid.innerHTML = offlineDevices.map(device => createDeviceCardHTML(device)).join('');
    }

    // Combined grid reference for event listeners
    const allCards = document.querySelectorAll('.device-card');

    // Add event listeners to action buttons
    document.querySelectorAll('.device-action-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const deviceId = this.closest('.device-card').dataset.id;
            toggleDeviceMenu(this, deviceId);
        });
    });

    // Add event listeners to view buttons
    document.querySelectorAll('.btn-view-device').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const deviceId = this.dataset.id;
            showViewDeviceModal(deviceId);
        });
    });

    // Add event listeners to edit buttons
    document.querySelectorAll('.btn-edit-device').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const deviceId = this.dataset.id;
            openEditModal(deviceId);
        });
    });

    // Add event listeners to delete buttons
    document.querySelectorAll('.btn-delete-device').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const deviceId = this.dataset.id;
            const deviceName = this.dataset.name;
            showDeleteConfirmModalDirect(deviceId, deviceName);
        });
    });
}

// Create device card HTML
function createDeviceCardHTML(device) {
    const statusClass = device.status || 'online';
    const signal = device.signal_strength || 0;
    const lastData = device.last_data_time ? formatTimeAgo(device.last_data_time) : 'Never';
    const deviceIcon = getDeviceIcon(device.board_type);

    return `
        <div class="device-card ${statusClass}" data-id="${device.id}">
            <div class="device-header">
                <div class="device-status-indicator"></div>
                <div class="device-actions">
                    <button class="device-action-btn" title="More"><i class="fas fa-ellipsis-v"></i></button>
                    <div class="device-menu" style="display: none;">
                        <button class="btn-view-device" data-id="${device.id}"><i class="fas fa-eye"></i> View</button>
                        <button class="btn-edit-device" data-id="${device.id}"><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn-delete-device" data-id="${device.id}" data-name="${device.name}"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </div>
            </div>
            <div class="device-icon">
                <i class="fas ${deviceIcon}"></i>
            </div>
            <div class="device-info">
                <div class="device-name">${device.name}</div>
                <div class="device-id">${device.device_id}</div>
                <div class="device-location">${device.location || 'Unknown'}</div>
            </div>
            <div class="device-stats-row">
                <div class="device-stat">
                    <div class="stat-label">Board Type</div>
                    <div class="stat-value">${device.board_type}</div>
                </div>
                <div class="device-stat">
                    <div class="stat-label">Signal</div>
                    <div class="stat-value">${signal}%</div>
                </div>
            </div>
            <div class="device-footer">
                <span class="last-sync">Last data: ${lastData}</span>
            </div>
        </div>
    `;
}

// Get device icon based on board type
function getDeviceIcon(boardType) {
    if (!boardType) return 'fa-microchip';
    const type = boardType.toLowerCase();
    if (type.includes('wifi') || type.includes('nodemcu') || type.includes('esp')) return 'fa-wifi';
    if (type.includes('nano')) return 'fa-thermometer-half';
    if (type.includes('mega')) return 'fa-barcode';
    if (type.includes('uno')) return 'fa-qrcode';
    return 'fa-microchip';
}

// Format time ago
function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return `${seconds} secs ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}

// Toggle device menu
function toggleDeviceMenu(button, deviceId) {
    // Close all other menus first
    document.querySelectorAll('.device-menu').forEach(menu => {
        if (menu !== button.nextElementSibling) {
            menu.style.display = 'none';
        }
    });
    
    const menu = button.nextElementSibling;
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

// Close menus when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.device-actions')) {
        document.querySelectorAll('.device-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    }
});

// Update device stats
function updateDeviceStats() {
    const onlineCount = allDevices.filter(d => d.status === 'online').length;
    const offlineCount = allDevices.filter(d => d.status === 'offline').length;
    
    const statCards = document.querySelectorAll('.device-stat-card');
    if (statCards[0]) {
        const badge = statCards[0].querySelector('.stat-badge');
        if (badge) badge.textContent = `+${onlineCount}`;
    }
    if (statCards[1]) {
        const badge = statCards[1].querySelector('.stat-badge');
        if (badge) badge.textContent = `-${offlineCount}`;
    }
}

// ===== MODAL FUNCTIONS =====

// Open add device modal
function openAddDeviceModal() {
    const modal = document.getElementById('addDeviceModal');
    if (!modal) return;
    
    const form = document.getElementById('addDeviceForm');
    if (form) {
        form.reset();
    }
    
    modal.classList.add('show');
    modal.style.display = 'flex';
}

// Open edit modal
function openEditModal(deviceId) {
    const device = allDevices.find(d => d.id == deviceId);
    if (!device) return;

    const modal = document.getElementById('editDeviceModal');
    
    document.getElementById('editDbId').value = device.id;
    document.getElementById('deviceName').value = device.name;
    document.getElementById('deviceId').value = device.device_id;
    document.getElementById('deviceLocation').value = device.location || '';
    document.getElementById('boardType').value = device.board_type;
    document.getElementById('signalStrength').value = device.signal_strength || 100;
    document.getElementById('deviceStatus').value = device.status || 'online';

    currentEditingDeviceId = device.id;
    modal.classList.add('show');
    modal.style.display = 'flex';
}

// Add new device
async function addNewDevice() {
    const deviceName = document.getElementById('addDeviceName').value;
    const deviceId = document.getElementById('addDeviceId').value;
    const deviceLocation = document.getElementById('addDeviceLocation').value;
    const boardType = document.getElementById('addBoardType').value;
    const signalStrength = document.getElementById('addSignalStrength').value;
    const deviceStatus = document.getElementById('addDeviceStatus').value;

    if (!deviceName || !deviceId || !deviceLocation || !boardType || !deviceStatus) {
        showStatusModal('Error', 'Please fill in all required fields', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/devices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: deviceName,
                device_id: deviceId,
                board_type: boardType,
                location: deviceLocation,
                status: deviceStatus,
                signal_strength: parseInt(signalStrength) || 100
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to add device');
        }

        document.getElementById('addDeviceForm').reset();
        closeDeviceModal('addDeviceModal');
        showStatusModal('Success', 'Device added successfully!', 'success');
        loadDevices();
    } catch (error) {
        console.error('Error adding device:', error);
        showStatusModal('Error', error.message, 'error');
    }
}

// Save device changes
async function saveDeviceChanges() {
    const dbId = document.getElementById('editDbId').value;
    const deviceName = document.getElementById('deviceName').value;
    const deviceId = document.getElementById('deviceId').value;
    const boardType = document.getElementById('boardType').value;
    const deviceLocation = document.getElementById('deviceLocation').value;
    const signalStrength = document.getElementById('signalStrength').value;
    const deviceStatus = document.getElementById('deviceStatus').value;

    try {
        const response = await fetch(`${API_BASE}/devices/${dbId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: deviceName,
                device_id: deviceId,
                board_type: boardType,
                location: deviceLocation,
                status: deviceStatus,
                signal_strength: parseInt(signalStrength) || 100
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update device');
        }

        closeDeviceModal('editDeviceModal');
        showStatusModal('Success', 'Device updated successfully!', 'success');
        loadDevices();
    } catch (error) {
        console.error('Error updating device:', error);
        showStatusModal('Error', error.message, 'error');
    }
}

// Show delete confirm from edit modal
function showDeleteConfirmModal() {
    const deviceName = document.getElementById('deviceName').value;
    document.getElementById('confirmModalMessage').textContent = 
        `Are you sure you want to delete "${deviceName}"? This action cannot be undone.`;
    
    const confirmModal = document.getElementById('confirmModal');
    confirmModal.classList.add('show');
    confirmModal.style.display = 'flex';
}

// Show delete confirm directly from card
function showDeleteConfirmModalDirect(deviceId, deviceName) {
    currentEditingDeviceId = deviceId;
    document.getElementById('confirmModalMessage').textContent = 
        `Are you sure you want to delete "${deviceName}"? This action cannot be undone.`;
    
    const confirmModal = document.getElementById('confirmModal');
    confirmModal.classList.add('show');
    confirmModal.style.display = 'flex';
}

// Confirm delete
async function confirmDelete() {
    if (!currentEditingDeviceId) return;

    try {
        const response = await fetch(`${API_BASE}/devices/${currentEditingDeviceId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete device');
        }

        closeConfirmModal();
        closeDeviceModal('editDeviceModal');
        showStatusModal('Success', 'Device deleted successfully!', 'success');
        currentEditingDeviceId = null;
        loadDevices();
    } catch (error) {
        console.error('Error deleting device:', error);
        closeConfirmModal();
        showStatusModal('Error', error.message, 'error');
    }
}

// Show view device modal
function showViewDeviceModal(deviceId) {
    const device = allDevices.find(d => d.id == deviceId);
    if (!device) return;

    document.getElementById('viewDeviceName').textContent = device.name;
    document.getElementById('viewDeviceId').textContent = device.device_id;
    document.getElementById('viewBoardType').textContent = device.board_type;
    document.getElementById('viewDeviceLocation').textContent = device.location || 'Unknown';
    document.getElementById('viewDeviceStatus').textContent = device.status ? device.status.charAt(0).toUpperCase() + device.status.slice(1) : 'Unknown';
    document.getElementById('viewSignalStrength').textContent = (device.signal_strength || 0) + '%';
    document.getElementById('viewLastDataTime').textContent = device.last_data_time ? new Date(device.last_data_time).toLocaleString() : 'Never';

    const modal = document.getElementById('viewDeviceModal');
    modal.classList.add('show');
    modal.style.display = 'flex';
}

// Status modal functions
function showStatusModal(title, message, type = 'success') {
    const modal = document.getElementById('statusModal');
    const titleEl = document.getElementById('statusModalTitle');
    const messageEl = document.getElementById('statusModalMessage');
    const iconEl = document.getElementById('statusModalIcon');
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    iconEl.className = 'status-icon ' + type;
    iconEl.innerHTML = type === 'success' 
        ? '<i class="fas fa-check-circle"></i>' 
        : '<i class="fas fa-times-circle"></i>';
    
    modal.classList.add('show');
    modal.style.display = 'flex';
}

function closeStatusModal() {
    const modal = document.getElementById('statusModal');
    modal.classList.remove('show');
    modal.style.display = 'none';
}

// Confirm modal functions
function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    modal.classList.remove('show');
    modal.style.display = 'none';
}

// View device modal functions
function closeViewDeviceModal() {
    const modal = document.getElementById('viewDeviceModal');
    modal.classList.remove('show');
    modal.style.display = 'none';
}

// Logout modal functions
function showLogoutModal() {
    const modal = document.getElementById('logoutModal');
    modal.classList.add('show');
    modal.style.display = 'flex';
}

function closeLogoutModal() {
    const modal = document.getElementById('logoutModal');
    modal.classList.remove('show');
    modal.style.display = 'none';
}

function confirmLogout() {
    localStorage.removeItem('userSession');
    sessionStorage.clear();
    window.location.href = './login.html';
}

// Close device modal
function closeDeviceModal(modalId) {
    const modal = document.getElementById(modalId || 'editDeviceModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
    if (modalId === 'editDeviceModal') {
        currentEditingDeviceId = null;
    }
}

