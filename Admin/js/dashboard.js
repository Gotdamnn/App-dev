// dashboard.js
// Handles dashboard interactions (refresh, notifications, logout)

document.addEventListener('DOMContentLoaded', function () {
    // Refresh button
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            // Example: reload dashboard data
            alert('Dashboard refreshed!');
            // You can add AJAX calls here to update dashboard data
        });
    }

    // Notification bell
    const notificationBell = document.querySelector('.notification-bell');
    if (notificationBell) {
        notificationBell.addEventListener('click', function () {
            alert('You have new notifications!');
        });
    }

    // Logout button
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            
            // Show confirmation dialog
            if (confirm('Are you sure you want to logout?')) {
                // Clear any stored session data (if using localStorage)
                localStorage.removeItem('userSession');
                sessionStorage.clear();
                
                // Redirect to login page
                window.location.href = './login.html';
            }
        });
    }
});

