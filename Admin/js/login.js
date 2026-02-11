// login.js
// Handles login form submission and logo upload preview

document.addEventListener('DOMContentLoaded', function () {
    // Logo upload preview
    const logoUpload = document.getElementById('logo-upload');
    const logoImg = document.getElementById('logo-img');
    if (logoUpload) {
        logoUpload.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (event) {
                    logoImg.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Login form submission (local only)
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            // Simple local check (demo)
            if (email === 'admin@patientpulse.com' && password === 'password123') {
                alert('Login successful!');
                window.location.href = '../html/dashboard.html';
            } else {
                alert('Login failed! Use admin@patientpulse.com / password123');
            }
        });
    }
});
