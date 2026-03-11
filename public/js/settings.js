// Settings Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize settings navigation
    initSettingsNav();
    
    // Initialize file upload handlers
    initFileUploads();
    
    // Initialize quiet hours toggle
    initQuietHours();
    
    // Load saved settings from localStorage
    loadSavedSettings();
});

// Settings Navigation
function initSettingsNav() {
    const navLinks = document.querySelectorAll('.settings-nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Hide all sections
            const sections = document.querySelectorAll('.settings-section');
            sections.forEach(s => s.style.display = 'none');
            
            // Show selected section
            const sectionId = this.getAttribute('data-section');
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.style.display = 'block';
            }
        });
    });
}

// File Upload Handlers
function initFileUploads() {
    // Profile Picture Upload
    const profileUpload = document.getElementById('profilePictureUpload');
    if (profileUpload) {
        profileUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 2 * 1024 * 1024) {
                    showSettingsModal('Error', 'File size must be less than 2MB', 'error');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = function(event) {
                    const avatarInitials = document.getElementById('avatarInitials');
                    const avatarImage = document.getElementById('avatarImage');
                    
                    avatarInitials.style.display = 'none';
                    avatarImage.src = event.target.result;
                    avatarImage.style.display = 'block';
                    
                    // Save to localStorage
                    localStorage.setItem('profilePicture', event.target.result);
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Logo Upload
    const logoUpload = document.getElementById('logoUpload');
    if (logoUpload) {
        logoUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const logoImage = document.getElementById('logoImage');
                    logoImage.src = event.target.result;
                    
                    // Save to localStorage
                    localStorage.setItem('systemLogo', event.target.result);
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

// Remove Profile Picture
function removeProfilePicture() {
    const avatarInitials = document.getElementById('avatarInitials');
    const avatarImage = document.getElementById('avatarImage');
    
    avatarInitials.style.display = 'block';
    avatarImage.src = '';
    avatarImage.style.display = 'none';
    
    localStorage.removeItem('profilePicture');
}

// Reset Logo
function resetLogo() {
    const logoImage = document.getElementById('logoImage');
    logoImage.src = '/images/logo.png';
    localStorage.removeItem('systemLogo');
}

// Password Strength Checker
function checkPasswordStrength(password) {
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    
    if (!password) {
        strengthFill.className = 'strength-fill';
        strengthText.textContent = '';
        return;
    }
    
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    
    // Character type checks
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    // Set strength level
    let strengthClass = '';
    let strengthLabel = '';
    
    if (strength <= 2) {
        strengthClass = 'weak';
        strengthLabel = 'Weak';
        strengthText.style.color = '#ef4444';
    } else if (strength <= 3) {
        strengthClass = 'fair';
        strengthLabel = 'Fair';
        strengthText.style.color = '#f59e0b';
    } else if (strength <= 4) {
        strengthClass = 'good';
        strengthLabel = 'Good';
        strengthText.style.color = '#3b82f6';
    } else {
        strengthClass = 'strong';
        strengthLabel = 'Strong';
        strengthText.style.color = '#22c55e';
    }
    
    strengthFill.className = 'strength-fill ' + strengthClass;
    strengthText.textContent = strengthLabel;
}

// Quiet Hours Toggle
function initQuietHours() {
    const quietHoursToggle = document.getElementById('quietHours');
    const quietHoursSettings = document.getElementById('quietHoursSettings');
    
    if (quietHoursToggle && quietHoursSettings) {
        quietHoursToggle.addEventListener('change', function() {
            quietHoursSettings.style.display = this.checked ? 'grid' : 'none';
        });
    }
}

// Theme Selection
function selectTheme(theme) {
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => option.classList.remove('active'));
    
    const selectedOption = document.querySelector(`.theme-option.${theme}`);
    if (selectedOption) {
        selectedOption.classList.add('active');
    }
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
    
    // Apply theme (you can expand this to actually change CSS)
    document.body.setAttribute('data-theme', theme);
}

// Maintenance Mode Warning
function toggleMaintenanceWarning() {
    const maintenanceMode = document.getElementById('maintenanceMode');
    const maintenanceWarning = document.getElementById('maintenanceWarning');
    
    if (maintenanceWarning) {
        maintenanceWarning.style.display = maintenanceMode.checked ? 'flex' : 'none';
    }
}

// Save Profile Settings
function saveProfileSettings() {
    const settings = {
        adminName: document.getElementById('adminName').value,
        adminEmail: document.getElementById('adminEmail').value,
        twoFactorAuth: document.getElementById('twoFactorAuth').checked
    };
    
    // Check if password change is requested
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword) {
        if (!currentPassword) {
            showSettingsModal('Error', 'Please enter your current password', 'error');
            return;
        }
        if (newPassword !== confirmPassword) {
            showSettingsModal('Error', 'New passwords do not match', 'error');
            return;
        }
        if (newPassword.length < 8) {
            showSettingsModal('Error', 'Password must be at least 8 characters', 'error');
            return;
        }
        // Here you would typically send password change to backend
    }
    
    localStorage.setItem('profileSettings', JSON.stringify(settings));
    
    // Clear password fields
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('strengthFill').className = 'strength-fill';
    document.getElementById('strengthText').textContent = '';
    
    showSettingsModal('Success', 'Profile settings saved successfully!', 'success');
}

// Save System Settings
function saveSystemSettings() {
    const settings = {
        hospitalName: document.getElementById('hospitalName').value,
        timezone: document.getElementById('timezone').value,
        dateFormat: document.getElementById('dateFormat').value,
        timeFormat: document.getElementById('timeFormat').value,
        defaultLanguage: document.getElementById('defaultLanguage').value,
        maintenanceMode: document.getElementById('maintenanceMode').checked
    };
    
    localStorage.setItem('systemSettings', JSON.stringify(settings));
    showSettingsModal('Success', 'System settings saved successfully!', 'success');
}

// Save Security Settings
function saveSecuritySettings() {
    const settings = {
        minPasswordLength: document.getElementById('minPasswordLength').value,
        requireSpecialChars: document.getElementById('requireSpecialChars').checked,
        requireNumbers: document.getElementById('requireNumbers').checked,
        requireUppercase: document.getElementById('requireUppercase').checked,
        sessionTimeout: document.getElementById('sessionTimeout').value,
        maxLoginAttempts: document.getElementById('maxLoginAttempts').value,
        lockDuration: document.getElementById('lockDuration').value
    };
    
    localStorage.setItem('securitySettings', JSON.stringify(settings));
    showSettingsModal('Success', 'Security settings saved successfully!', 'success');
}

// Save Notification Settings
function saveNotificationSettings() {
    const settings = {
        emailNotifications: document.getElementById('emailNotifications').checked,
        smsNotifications: document.getElementById('smsNotifications').checked,
        systemAlerts: document.getElementById('systemAlerts').checked,
        patientAlerts: document.getElementById('patientAlerts').checked,
        appointmentReminders: document.getElementById('appointmentReminders').checked,
        deviceAlerts: document.getElementById('deviceAlerts').checked,
        securityAlerts: document.getElementById('securityAlerts').checked,
        quietHours: document.getElementById('quietHours').checked,
        quietStart: document.getElementById('quietStart').value,
        quietEnd: document.getElementById('quietEnd').value
    };
    
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
    showSettingsModal('Success', 'Notification settings saved successfully!', 'success');
}

// Save Preferences
function savePreferences() {
    const activeTheme = document.querySelector('.theme-option.active');
    const settings = {
        theme: activeTheme ? (activeTheme.classList.contains('dark') ? 'dark' : 'light') : 'light',
        defaultDashboard: document.getElementById('defaultDashboard').value,
        itemsPerPage: document.getElementById('itemsPerPage').value,
        refreshInterval: document.getElementById('refreshInterval').value,
        compactMode: document.getElementById('compactMode').checked,
        sidebarLabels: document.getElementById('sidebarLabels').checked,
        enableAnimations: document.getElementById('enableAnimations').checked
    };
    
    localStorage.setItem('preferences', JSON.stringify(settings));
    showSettingsModal('Success', 'Preferences saved successfully!', 'success');
}

// Reset Functions
function resetProfileSettings() {
    document.getElementById('adminName').value = 'Admin User';
    document.getElementById('adminEmail').value = 'admin@patientpulse.com';
    document.getElementById('twoFactorAuth').checked = false;
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('strengthFill').className = 'strength-fill';
    document.getElementById('strengthText').textContent = '';
    removeProfilePicture();
}

function resetSystemSettings() {
    document.getElementById('hospitalName').value = 'PatientPulse Healthcare';
    document.getElementById('timezone').value = 'Asia/Manila';
    document.getElementById('dateFormat').value = 'MM/DD/YYYY';
    document.getElementById('timeFormat').value = '12h';
    document.getElementById('defaultLanguage').value = 'en';
    document.getElementById('maintenanceMode').checked = false;
    toggleMaintenanceWarning();
    resetLogo();
}

function resetSecuritySettings() {
    document.getElementById('minPasswordLength').value = 8;
    document.getElementById('requireSpecialChars').checked = true;
    document.getElementById('requireNumbers').checked = true;
    document.getElementById('requireUppercase').checked = true;
    document.getElementById('sessionTimeout').value = 30;
    document.getElementById('maxLoginAttempts').value = 5;
    document.getElementById('lockDuration').value = 15;
}

function resetNotificationSettings() {
    document.getElementById('emailNotifications').checked = true;
    document.getElementById('smsNotifications').checked = false;
    document.getElementById('systemAlerts').checked = true;
    document.getElementById('patientAlerts').checked = true;
    document.getElementById('appointmentReminders').checked = true;
    document.getElementById('deviceAlerts').checked = true;
    document.getElementById('securityAlerts').checked = true;
    document.getElementById('quietHours').checked = false;
    document.getElementById('quietHoursSettings').style.display = 'none';
    document.getElementById('quietStart').value = '22:00';
    document.getElementById('quietEnd').value = '07:00';
}

function resetPreferences() {
    selectTheme('light');
    document.getElementById('defaultDashboard').value = 'dashboard';
    document.getElementById('itemsPerPage').value = '25';
    document.getElementById('refreshInterval').value = '60';
    document.getElementById('compactMode').checked = false;
    document.getElementById('sidebarLabels').checked = true;
    document.getElementById('enableAnimations').checked = true;
}

// Load Saved Settings
function loadSavedSettings() {
    // Load Profile Settings
    const profileSettings = JSON.parse(localStorage.getItem('profileSettings') || '{}');
    if (profileSettings.adminName) document.getElementById('adminName').value = profileSettings.adminName;
    if (profileSettings.adminEmail) document.getElementById('adminEmail').value = profileSettings.adminEmail;
    if (profileSettings.twoFactorAuth) document.getElementById('twoFactorAuth').checked = profileSettings.twoFactorAuth;
    
    // Load Profile Picture
    const profilePicture = localStorage.getItem('profilePicture');
    if (profilePicture) {
        const avatarInitials = document.getElementById('avatarInitials');
        const avatarImage = document.getElementById('avatarImage');
        avatarInitials.style.display = 'none';
        avatarImage.src = profilePicture;
        avatarImage.style.display = 'block';
    }
    
    // Load System Settings
    const systemSettings = JSON.parse(localStorage.getItem('systemSettings') || '{}');
    if (systemSettings.hospitalName) document.getElementById('hospitalName').value = systemSettings.hospitalName;
    if (systemSettings.timezone) document.getElementById('timezone').value = systemSettings.timezone;
    if (systemSettings.dateFormat) document.getElementById('dateFormat').value = systemSettings.dateFormat;
    if (systemSettings.timeFormat) document.getElementById('timeFormat').value = systemSettings.timeFormat;
    if (systemSettings.defaultLanguage) document.getElementById('defaultLanguage').value = systemSettings.defaultLanguage;
    if (systemSettings.maintenanceMode) {
        document.getElementById('maintenanceMode').checked = systemSettings.maintenanceMode;
        toggleMaintenanceWarning();
    }
    
    // Load Logo
    const systemLogo = localStorage.getItem('systemLogo');
    if (systemLogo) {
        document.getElementById('logoImage').src = systemLogo;
    }
    
    // Load Security Settings
    const securitySettings = JSON.parse(localStorage.getItem('securitySettings') || '{}');
    if (securitySettings.minPasswordLength) document.getElementById('minPasswordLength').value = securitySettings.minPasswordLength;
    if (typeof securitySettings.requireSpecialChars !== 'undefined') document.getElementById('requireSpecialChars').checked = securitySettings.requireSpecialChars;
    if (typeof securitySettings.requireNumbers !== 'undefined') document.getElementById('requireNumbers').checked = securitySettings.requireNumbers;
    if (typeof securitySettings.requireUppercase !== 'undefined') document.getElementById('requireUppercase').checked = securitySettings.requireUppercase;
    if (securitySettings.sessionTimeout) document.getElementById('sessionTimeout').value = securitySettings.sessionTimeout;
    if (securitySettings.maxLoginAttempts) document.getElementById('maxLoginAttempts').value = securitySettings.maxLoginAttempts;
    if (securitySettings.lockDuration) document.getElementById('lockDuration').value = securitySettings.lockDuration;
    
    // Load Notification Settings
    const notificationSettings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
    if (typeof notificationSettings.emailNotifications !== 'undefined') document.getElementById('emailNotifications').checked = notificationSettings.emailNotifications;
    if (typeof notificationSettings.smsNotifications !== 'undefined') document.getElementById('smsNotifications').checked = notificationSettings.smsNotifications;
    if (typeof notificationSettings.systemAlerts !== 'undefined') document.getElementById('systemAlerts').checked = notificationSettings.systemAlerts;
    if (typeof notificationSettings.patientAlerts !== 'undefined') document.getElementById('patientAlerts').checked = notificationSettings.patientAlerts;
    if (typeof notificationSettings.appointmentReminders !== 'undefined') document.getElementById('appointmentReminders').checked = notificationSettings.appointmentReminders;
    if (typeof notificationSettings.deviceAlerts !== 'undefined') document.getElementById('deviceAlerts').checked = notificationSettings.deviceAlerts;
    if (typeof notificationSettings.securityAlerts !== 'undefined') document.getElementById('securityAlerts').checked = notificationSettings.securityAlerts;
    if (notificationSettings.quietHours) {
        document.getElementById('quietHours').checked = notificationSettings.quietHours;
        document.getElementById('quietHoursSettings').style.display = 'grid';
    }
    if (notificationSettings.quietStart) document.getElementById('quietStart').value = notificationSettings.quietStart;
    if (notificationSettings.quietEnd) document.getElementById('quietEnd').value = notificationSettings.quietEnd;
    
    // Load Preferences
    const preferences = JSON.parse(localStorage.getItem('preferences') || '{}');
    if (preferences.theme) selectTheme(preferences.theme);
    if (preferences.defaultDashboard) document.getElementById('defaultDashboard').value = preferences.defaultDashboard;
    if (preferences.itemsPerPage) document.getElementById('itemsPerPage').value = preferences.itemsPerPage;
    if (preferences.refreshInterval) document.getElementById('refreshInterval').value = preferences.refreshInterval;
    if (typeof preferences.compactMode !== 'undefined') document.getElementById('compactMode').checked = preferences.compactMode;
    if (typeof preferences.sidebarLabels !== 'undefined') document.getElementById('sidebarLabels').checked = preferences.sidebarLabels;
    if (typeof preferences.enableAnimations !== 'undefined') document.getElementById('enableAnimations').checked = preferences.enableAnimations;
}

// Activity Log Functions
function loadMoreLogs() {
    showSettingsModal('Info', 'Loading more activity logs...', 'success');
    // Here you would typically fetch more logs from the backend
}

function exportLogs() {
    showSettingsModal('Info', 'Preparing audit log export...', 'success');
    // Here you would typically generate and download a CSV/PDF
}

// Settings Modal
function showSettingsModal(title, message, type) {
    const modal = document.getElementById('settingsModal');
    const modalTitle = document.getElementById('settingsModalTitle');
    const modalMessage = document.getElementById('settingsModalMessage');
    const modalIcon = document.getElementById('settingsModalIcon');
    
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    
    // Set icon based on type
    modalIcon.className = 'status-icon ' + type;
    if (type === 'success') {
        modalIcon.innerHTML = '<i class="fas fa-check"></i>';
    } else if (type === 'error') {
        modalIcon.innerHTML = '<i class="fas fa-times"></i>';
    } else {
        modalIcon.innerHTML = '<i class="fas fa-info"></i>';
    }
    
    modal.classList.add('show');
    modal.style.display = 'flex';
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.classList.remove('show');
    modal.style.display = 'none';
}

// Logout Modal Functions
function showLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
    }
}

function closeLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

function confirmLogout() {
    localStorage.removeItem('userSession');
    sessionStorage.clear();
    window.location.href = '/login';
}

// Close modals when clicking outside
document.addEventListener('click', function(e) {
    const settingsModal = document.getElementById('settingsModal');
    const logoutModal = document.getElementById('logoutModal');
    
    if (e.target === settingsModal) {
        closeSettingsModal();
    }
    if (e.target === logoutModal) {
        closeLogoutModal();
    }
});
