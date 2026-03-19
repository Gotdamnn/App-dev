// User Feedback Management

const API_BASE = window.location.origin + '/api';

let feedbackModal = null;
let deleteModal = null;
let feedbackFormModal = null;
let currentFeedbackId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Feedback page loaded');
    
    try {
        feedbackModal = new bootstrap.Modal(document.getElementById('feedbackModal'));
        deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
        feedbackFormModal = new bootstrap.Modal(document.getElementById('feedbackFormModal'));
        console.log('✅ Modals initialized');
    } catch (e) {
        console.error('❌ Modal initialization error:', e);
    }

    // Event Listeners
    document.getElementById('newFeedbackBtn')?.addEventListener('click', showFeedbackForm);
    document.getElementById('filterBtn')?.addEventListener('click', applyFilters);
    document.getElementById('resetBtn')?.addEventListener('click', resetFilters);
    document.getElementById('saveFeedbackBtn')?.addEventListener('click', saveFeedback);
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', deleteFeedback);

    // Real-time search with debounce
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                loadFeedback();
            }, 300);
        });
    }

    // Load initial data
    setTimeout(() => {
        console.log('📊 Starting to load initial data...');
        loadFeedback();
        loadStatistics();
    }, 100);
});

// Load all feedback
async function loadFeedback() {
    try {
        const search = document.getElementById('searchInput')?.value || '';
        const status = document.getElementById('statusFilter')?.value || '';
        const type = document.getElementById('typeFilter')?.value || '';
        const rating = document.getElementById('ratingFilter')?.value || '';

        const params = new URLSearchParams({
            search,
            status,
            type,
            rating
        });

        console.log(`📥 Loading feedback: ${API_BASE}/feedback?${params}`);
        const response = await fetch(`${API_BASE}/feedback?${params}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📋 Feedback loaded:', data);

        const tableBody = document.getElementById('feedbackTableBody');
        
        if (!data.success || !data.feedback || data.feedback.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        <i class="fas fa-inbox"></i> No feedback yet
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = data.feedback.map(item => `
            <tr onclick="openFeedbackDetails(${item.feedback_id})">
                <td>#${item.feedback_id}</td>
                <td>
                    <span class="badge" style="${getTypeColor(item.feedback_type)}">
                        ${item.feedback_type}
                    </span>
                </td>
                <td>${escapeHtml(item.subject)}</td>
                <td>${item.user_email}</td>
                <td>
                    ${item.app_rating ? `
                        <span class="stars" style="color: #ffc107; font-size: 14px;">
                            ${Array(item.app_rating).fill('<i class="fas fa-star"></i>').join('')}${Array(5 - item.app_rating).fill('<i class="far fa-star"></i>').join('')}
                        </span>
                    ` : '<span class="text-muted">-</span>'}
                </td>
                <td>${new Date(item.created_at).toLocaleDateString()}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); openFeedbackDetails(${item.feedback_id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteFeedbackPrompt(${item.feedback_id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('❌ Error loading feedback:', error);
        showAlert('Error loading feedback', 'danger');
    }
}

// Load statistics
async function loadStatistics() {
    try {
        const response = await fetch(`${API_BASE}/feedback-stats`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 Statistics loaded:', data);

        if (data.success) {
            document.getElementById('totalFeedback').textContent = data.stats.total || 0;
            document.getElementById('openFeedback').textContent = data.stats.open || 0;
            document.getElementById('resolvedFeedback').textContent = data.stats.resolved || 0;
            document.getElementById('avgRating').textContent = (data.stats.avgRating || 0).toFixed(1);
        }

    } catch (error) {
        console.error('❌ Error loading statistics:', error);
    }
}

// Open feedback details modal
async function openFeedbackDetails(feedbackId) {
    try {
        const response = await fetch(`${API_BASE}/feedback/${feedbackId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📄 Feedback details loaded:', data);

        if (!data.success) {
            showAlert('Error loading feedback', 'danger');
            return;
        }

        const feedback = data.feedback;
        currentFeedbackId = feedbackId;

        // Populate modal fields
        document.getElementById('viewType').value = feedback.feedback_type;
        document.getElementById('viewDate').value = new Date(feedback.created_at).toLocaleString();
        document.getElementById('viewEmail').value = feedback.user_email;
        document.getElementById('viewSubject').value = feedback.subject;
        document.getElementById('viewMessage').value = feedback.message;
        document.getElementById('viewStatus').value = feedback.status;
        document.getElementById('viewPriority').value = feedback.priority || 'Normal';
        document.getElementById('viewResponse').value = feedback.response_notes || '';
        document.getElementById('viewRespondedBy').value = feedback.responded_by || '-';
        document.getElementById('viewResponseDate').value = feedback.response_date ? 
            new Date(feedback.response_date).toLocaleString() : '-';

        // Display rating
        const ratingContainer = document.getElementById('viewRating');
        if (feedback.app_rating) {
            ratingContainer.innerHTML = `
                <div class="stars" style="font-size: 24px;">
                    ${Array(5).fill(0).map((_, i) => 
                        `<i class="fa${i < feedback.app_rating ? 's' : 'r'} fa-star"></i>`
                    ).join('')}
                </div>
                <small>${feedback.app_rating} / 5 Stars</small>
            `;
        } else {
            ratingContainer.innerHTML = '<small class="text-muted">No rating provided</small>';
        }

        console.log('✅ Modal populated, opening...');
        feedbackModal.show();

    } catch (error) {
        console.error('❌ Error opening feedback details:', error);
        showAlert('Error loading feedback details', 'danger');
    }
}

// Save feedback changes
async function saveFeedback() {
    try {
        if (!currentFeedbackId) {
            showAlert('No feedback selected', 'danger');
            return;
        }

        const status = document.getElementById('viewStatus').value;
        const priority = document.getElementById('viewPriority').value;
        const responseNotes = document.getElementById('viewResponse').value;

        const payload = {
            status,
            priority,
            response_notes: responseNotes
        };

        console.log('📤 Saving feedback:', payload);
        const response = await fetch(`${API_BASE}/feedback/${currentFeedbackId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Feedback saved successfully');
            showAlert('Feedback updated successfully', 'success');
            feedbackModal.hide();
            loadFeedback();
            loadStatistics();
        } else {
            showAlert(data.error || 'Error saving feedback', 'danger');
        }

    } catch (error) {
        console.error('❌ Error saving feedback:', error);
        showAlert('Error saving feedback', 'danger');
    }
}

// Delete feedback prompt
function deleteFeedbackPrompt(feedbackId) {
    currentFeedbackId = feedbackId;
    deleteModal.show();
}

// Delete feedback
async function deleteFeedback() {
    try {
        if (!currentFeedbackId) {
            showAlert('No feedback selected', 'danger');
            return;
        }

        console.log(`🗑️ Deleting feedback ${currentFeedbackId}`);
        const response = await fetch(`${API_BASE}/feedback/${currentFeedbackId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Feedback deleted successfully');
            showAlert('Feedback deleted successfully', 'success');
            deleteModal.hide();
            loadFeedback();
            loadStatistics();
        } else {
            showAlert(data.error || 'Error deleting feedback', 'danger');
        }

    } catch (error) {
        console.error('❌ Error deleting feedback:', error);
        showAlert('Error deleting feedback', 'danger');
    }
}

// Show feedback form modal
function showFeedbackForm() {
    console.log('📝 Showing feedback form...');
    feedbackFormModal.show();
}

// Apply filters
function applyFilters() {
    console.log('🔍 Applying filters...');
    loadFeedback();
}

// Reset filters
function resetFilters() {
    console.log('🔄 Resetting filters...');
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('typeFilter').value = '';
    document.getElementById('ratingFilter').value = '';
    loadFeedback();
}

// Helper functions
function getTypeColor(type) {
    const colors = {
        'Bug Report': 'background-color: #f8534d; color: white;',
        'Feature Request': 'background-color: #0d6efd; color: white;',
        'General Feedback': 'background-color: #6c757d; color: white;',
        'Complaint': 'background-color: #f9a825; color: white;',
        'Suggestion': 'background-color: #28a745; color: white;'
    };
    return colors[type] || 'background-color: #6c757d; color: white;';
}

function getStatusColor(status) {
    const colors = {
        'Open': 'background-color: #0dcaf0; color: white;',
        'Under Review': 'background-color: #f9a825; color: white;',
        'Acknowledged': 'background-color: #0d6efd; color: white;',
        'In Progress': 'background-color: #f9a825; color: white;',
        'Resolved': 'background-color: #28a745; color: white;',
        'Closed': 'background-color: #6c757d; color: white;'
    };
    return colors[status] || 'background-color: #6c757d; color: white;';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showAlert(message, type = 'info') {
    // You can enhance this with a toast notification if needed
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Optional: Show a toast or alert
    if (type === 'success') {
        console.log('✅', message);
    } else if (type === 'danger') {
        console.error('❌', message);
    } else {
        console.info('ℹ️', message);
    }
}
