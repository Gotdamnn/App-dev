// devices.js
// Handles device monitoring page interactions

let currentEditingDevice = null;

document.addEventListener('DOMContentLoaded', function () {
    // Logout button (shared with dashboard)
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('userSession');
                sessionStorage.clear();
                window.location.href = './login.html';
            }
        });
    }

    // Add Device button
    const addDeviceBtn = document.querySelector('.add-device-btn');
    if (addDeviceBtn) {
        addDeviceBtn.addEventListener('click', function () {
            alert('Add Device functionality - Navigate to add device form');
            // window.location.href = './add-device.html';
        });
    }

    // Device action buttons
    const deviceActionBtns = document.querySelectorAll('.device-action-btn');
    deviceActionBtns.forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const deviceCard = this.closest('.device-card');
            openEditModal(deviceCard);
        });
    });

    // Modal functionality
    const modal = document.getElementById('editDeviceModal');
    const closeBtn = document.querySelector('.modal-close');
    const cancelBtn = document.querySelector('.btn-cancel');
    const deleteBtn = document.querySelector('.btn-delete');
    const form = document.getElementById('editDeviceForm');

    if (closeBtn) {
        closeBtn.addEventListener('click', function () {
            modal.classList.remove('show');
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', function () {
            modal.classList.remove('show');
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', function (e) {
            e.preventDefault();
            deleteDevice();
        });
    }

    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            saveDeviceChanges();
        });
    }

    // Close modal when clicking outside
    if (modal) {
        window.addEventListener('click', function (e) {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    }
});

// Open edit modal
function openEditModal(deviceCard) {
    const modal = document.getElementById('editDeviceModal');
    const deviceName = deviceCard.querySelector('.device-name').textContent;
    const deviceId = deviceCard.querySelector('.device-id').textContent;
    const deviceLocation = deviceCard.querySelector('.device-location').textContent;
    const boardType = deviceCard.querySelectorAll('.stat-value')[0].textContent;
    const status = deviceCard.classList.contains('online') ? 'online' : (deviceCard.classList.contains('offline') ? 'offline' : 'warning');

    // Populate form
    document.getElementById('deviceName').value = deviceName;
    document.getElementById('deviceId').value = deviceId;
    document.getElementById('deviceLocation').value = deviceLocation;
    document.getElementById('boardType').value = boardType;
    document.getElementById('deviceStatus').value = status;

    currentEditingDevice = deviceCard;
    modal.classList.add('show');
}

// Save device changes
function saveDeviceChanges() {
    const deviceName = document.getElementById('deviceName').value;
    const deviceId = document.getElementById('deviceId').value;
    const boardType = document.getElementById('boardType').value;
    const deviceLocation = document.getElementById('deviceLocation').value;
    const deviceStatus = document.getElementById('deviceStatus').value;

    if (currentEditingDevice) {
        // Update device card
        currentEditingDevice.querySelector('.device-name').textContent = deviceName;
        currentEditingDevice.querySelector('.device-id').textContent = deviceId;
        currentEditingDevice.querySelector('.device-location').textContent = deviceLocation;
        currentEditingDevice.querySelectorAll('.stat-value')[0].textContent = boardType;

        // Update status class
        currentEditingDevice.classList.remove('online', 'offline', 'warning');
        currentEditingDevice.classList.add(deviceStatus);

        // Close modal
        const modal = document.getElementById('editDeviceModal');
        modal.classList.remove('show');

        alert('Device updated successfully!');
    }
}

// Delete device
function deleteDevice() {
    const deviceName = document.getElementById('deviceName').value;
    
    if (confirm(`Are you sure you want to delete "${deviceName}"?`)) {
        if (currentEditingDevice) {
            currentEditingDevice.remove();
            
            // Close modal
            const modal = document.getElementById('editDeviceModal');
            modal.classList.remove('show');
            
            alert(`Device "${deviceName}" has been deleted successfully!`);
        }
    }
}
