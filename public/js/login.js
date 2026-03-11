// login.js
// Handles login form submission and logo upload preview

// Modal functions
function showModal(title, message, isError = true) {
    const modal = document.getElementById('errorModal');
    const modalIcon = modal.querySelector('.modal-icon');
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    
    modalIcon.className = isError ? 'modal-icon error' : 'modal-icon success';
    modalIcon.innerHTML = isError ? '<i class="fas fa-exclamation-circle"></i>' : '<i class="fas fa-check-circle"></i>';
    
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('errorModal').style.display = 'none';
}

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

    // Close modal on overlay click
    const modal = document.getElementById('errorModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeModal();
        });
    }

    // Login form submission
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch('http://localhost:3001/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    localStorage.setItem('userSession', JSON.stringify(data.user));
                    window.location.href = '/dashboard';
                } else {
                    showModal('Login Failed', 'Invalid email or password. Please try again.');
                }
            } catch (error) {
                showModal('Connection Error', 'Unable to connect to server. Please make sure the server is running.');
            }
        });
    }
});
