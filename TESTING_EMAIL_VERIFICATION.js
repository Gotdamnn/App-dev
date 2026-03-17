// Example: Testing Email Verification Endpoints
// You can use this as a reference to test the email verification system

// ========================================
// EMAIL VERIFICATION TESTS
// ========================================

// Test 1: Send Verification Email
fetch('/api/send-verification-email', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        email: 'testuser@example.com',
        userName: 'Test User'
    })
})
.then(response => response.json())
.then(data => {
    console.log('Send Verification Email Response:', data);
    if (data.success) {
        console.log('✅ Email sent successfully');
        console.log('Expires at:', data.data.expiresAt);
    }
})
.catch(error => console.error('Error:', error));

// Test 2: Check Email Verification Status
fetch('/api/check-email-verification', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        email: 'testuser@example.com'
    })
})
.then(response => response.json())
.then(data => {
    console.log('Check Email Verification Response:', data);
    if (data.success) {
        console.log('Is Verified:', data.data.isVerified);
    }
})
.catch(error => console.error('Error:', error));

// Test 3: Resend Verification Email
fetch('/api/resend-verification-email', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        email: 'testuser@example.com',
        userName: 'Test User'
    })
})
.then(response => response.json())
.then(data => {
    console.log('Resend Verification Email Response:', data);
})
.catch(error => console.error('Error:', error));

// Test 4: Verify Email with Token (use actual token from email)
// After user clicks the link in email, this endpoint is called automatically
const token = 'YOUR_VERIFICATION_TOKEN_HERE';
fetch(`/api/verify-email?token=${token}&userName=TestUser`)
.then(response => response.json())
.then(data => {
    console.log('Email Verification Response:', data);
    if (data.success) {
        console.log('✅ Email verified successfully');
        console.log('Verified at:', data.data.verifiedAt);
    }
})
.catch(error => console.error('Error:', error));

// ========================================
// PASSWORD RESET TESTS
// ========================================

// Test 1: Forgot Password (Request Password Reset Email)
fetch('/api/forgot-password', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        email: 'testuser@example.com'
    })
})
.then(response => response.json())
.then(data => {
    console.log('Forgot Password Response:', data);
    if (data.success) {
        console.log('✅ Password reset email sent');
        console.log('Expires at:', data.data.expiresAt);
    }
})
.catch(error => console.error('Error:', error));

// Test 2: Validate Reset Token
// Use the actual token received in the email
fetch('/api/validate-reset-token', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        token: 'YOUR_RESET_TOKEN_HERE'
    })
})
.then(response => response.json())
.then(data => {
    console.log('Validate Reset Token Response:', data);
    if (data.success) {
        console.log('✅ Reset token is valid');
        console.log('Email:', data.data.email);
        console.log('Expires at:', data.data.expiresAt);
    } else {
        console.log('❌ Invalid or expired token');
    }
})
.catch(error => console.error('Error:', error));

// Test 3: Reset Password
// Use the actual token from the password reset email
fetch('/api/reset-password', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        token: 'YOUR_RESET_TOKEN_HERE',
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123'
    })
})
.then(response => response.json())
.then(data => {
    console.log('Reset Password Response:', data);
    if (data.success) {
        console.log('✅ Password reset successfully');
        console.log('Email:', data.data.email);
        console.log('Username:', data.data.username);
    } else {
        console.log('❌ Password reset failed');
        console.log('Error:', data.message);
    }
})
.catch(error => console.error('Error:', error));

// Test 4: Check Password Reset Status
fetch('/api/check-password-reset-status', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        email: 'testuser@example.com'
    })
})
.then(response => response.json())
.then(data => {
    console.log('Check Password Reset Status Response:', data);
    if (data.data.hasPendingReset) {
        console.log('✅ Pending password reset found');
        console.log('Expires at:', data.data.expiresAt);
        console.log('Is expired:', data.data.isExpired);
    } else {
        console.log('ℹ️ No pending password reset');
    }
})
.catch(error => console.error('Error:', error));

// ========================================
// EMAIL VERIFICATION TESTS
// ========================================

// Test 1: Complete Password Reset Flow Example
async function completePasswordResetFlow() {
    const userEmail = 'testuser@example.com';
    
    // Step 1: Request Password Reset
    console.log('Step 1: Requesting password reset...');
    const forgotRes = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail })
    });
    const forgotData = await forgotRes.json();
    console.log('✅ Password reset email sent');
    
    // Step 2: User receives email with token (simulate getting token from email)
    // In real scenario, user clicks link in email with token
    const resetToken = 'TOKEN_FROM_EMAIL';
    
    // Step 3: Validate token (optional, on reset page load)
    console.log('Step 3: Validating reset token...');
    const validateRes = await fetch('/api/validate-reset-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken })
    });
    const validateData = await validateRes.json();
    if (validateData.success) {
        console.log('✅ Reset token is valid');
    } else {
        console.log('❌ Token is invalid or expired');
        return;
    }
    
    // Step 4: User enters new password and submits form
    console.log('Step 4: Resetting password...');
    const resetRes = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            token: resetToken,
            newPassword: 'NewSecurePassword123',
            confirmPassword: 'NewSecurePassword123'
        })
    });
    const resetData = await resetRes.json();
    if (resetData.success) {
        console.log('✅ Password reset successfully!');
        console.log('User can now login with new password');
    } else {
        console.log('❌ Password reset failed:', resetData.message);
    }
}

// Run the complete flow example
// completePasswordResetFlow();
