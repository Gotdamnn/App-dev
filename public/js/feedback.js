// User Feedback Management

let feedbackModal = null;
let deleteModal = null;
let feedbackFormModal = null;
let currentFeedbackId = null;
let currentPage = 1;
const itemsPerPage = 15;
let allFeedback = [];

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
    // Removed listener for deleted newFeedbackBtn
    // document.getElementById('newFeedbackBtn')?.addEventListener('click', showFeedbackForm);
    document.getElementById('filterBtn')?.addEventListener('click', applyFilters);
    document.getElementById('resetBtn')?.addEventListener('click', resetFilters);
    document.getElementById('saveFeedbackBtn')?.addEventListener('click', saveFeedback);
    document.getElementById('editDetailsBtn')?.addEventListener('click', editFeedback);
    document.getElementById('submitNewFeedbackBtn')?.addEventListener('click', submitNewFeedback);
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', deleteFeedback);
    
    // Real-time filter listeners
    const filterIds = ['statusFilter', 'typeFilter', 'ratingFilter'];
    filterIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', () => {
                console.log(`Filter changed: ${id}`);
                currentPage = 1;
                loadFeedback();
            });
        }
    });

    // Real-time search with debounce
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentPage = 1;
                loadFeedback();
                // loadStatistics(); // Statistics section removed
            }, 300);
        });
    }

    // Pagination buttons
    document.getElementById('prevBtn')?.addEventListener('click', function() {
        if (currentPage > 1) {
            currentPage--;
            loadFeedback();
        }
    });

    document.getElementById('nextBtn')?.addEventListener('click', function() {
        currentPage++;
        loadFeedback();
    });

    // Load initial data
    setTimeout(() => {
        console.log('📊 Starting to load initial data...');
        loadFeedback();
        // loadStatistics(); // Statistics section removed
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
        
        // Debug: Log first feedback item to see actual field names
        if (data.feedback && data.feedback.length > 0) {
            console.log('🔍 First feedback item keys:', Object.keys(data.feedback[0]));
            console.log('🔍 First feedback item:', data.feedback[0]);
            console.log('🔍 feedback_id value:', data.feedback[0].feedback_id);
            console.log('🔍 app_rating value:', data.feedback[0].app_rating);
            console.log('🔍 All fields:');
            Object.entries(data.feedback[0]).forEach(([key, value]) => {
                console.log(`   ${key}: ${value} (type: ${typeof value})`);
            });
        }

        const tableBody = document.getElementById('feedbackTableBody');
        
        if (!data.success || !data.feedback || data.feedback.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center text-muted py-4">
                        <i class="fas fa-inbox"></i> No feedback yet
                    </td>
                </tr>
            `;
            const feedbackCount = document.getElementById('feedbackCount');
            if (feedbackCount) feedbackCount.textContent = '0 Feedback';
            
            // Update pagination info
            document.getElementById('pageInfo').textContent = 'Page 1 of 1';
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            if (prevBtn) prevBtn.disabled = true;
            if (nextBtn) nextBtn.disabled = true;
            return;
        }

        // Store all feedback
        allFeedback = data.feedback;

        // Calculate pagination
        const totalPages = Math.ceil(allFeedback.length / itemsPerPage);
        if (currentPage > totalPages && totalPages > 0) {
            currentPage = totalPages;
        }

        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedFeedback = allFeedback.slice(start, end);

        // Update feedback count
        const feedbackCount = document.getElementById('feedbackCount');
        if (feedbackCount) {
            feedbackCount.textContent = `${allFeedback.length} Feedback Entry${allFeedback.length === 1 ? '' : 'ies'}`;
        }

        // Update page info
        document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages || 1}`;

        // Enable/disable pagination buttons
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        if (prevBtn) prevBtn.disabled = currentPage === 1;
        if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

        tableBody.innerHTML = paginatedFeedback.map(item => {
            // Defensive: Ensure we have an ID - try different possible field names
            const feedbackId = item.feedback_id || item.id || item.feedbackId || 'UNKNOWN';
            const rating = item.app_rating || item.rating || item.appRating;
            const feedbackType = item.feedback_type || item.type || 'Unknown';
            const subject = item.subject || 'No Subject';
            const email = item.user_email || item.email || 'No Email';
            const status = item.status || 'Open';
            const createdAt = item.created_at || item.createdAt || new Date().toLocaleDateString();
            
            return `
            <tr onclick="openFeedbackDetails('${feedbackId}')">
                <td><input type="checkbox" value="${feedbackId}"></td>
                <td>${escapeHtml(String(feedbackId))}</td>
                <td>
                    <span class="badge" style="${getTypeColor(feedbackType)}">
                        ${escapeHtml(feedbackType)}
                    </span>
                </td>
                <td>${escapeHtml(subject)}</td>
                <td>${escapeHtml(email)}</td>
                <td>
                    ${rating ? `
                        <span style="color: #ffc107; font-size: 14px;">
                            ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}
                        </span>
                    ` : '<span class="text-muted">-</span>'}
                </td>
                <td>
                    <span class="badge bg-${getStatusBadgeColor(status)}">
                        ${escapeHtml(status)}
                    </span>
                </td>
                <td>${escapeHtml(new Date(createdAt).toLocaleDateString())}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); openFeedbackDetails('${feedbackId}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteFeedbackPrompt('${feedbackId}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        }).join('');

    } catch (error) {
        console.error('❌ Error loading feedback:', error);
        showAlert('Error loading feedback', 'danger');
    }
}

// Load statistics with current filters applied (DISABLED - statistics section removed)
/*
async function loadStatistics() {
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

        const response = await fetch(`${API_BASE}/feedback-stats?${params}`);
        
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
*/

// Open feedback details modal
async function openFeedbackDetails(feedbackId) {
    console.log(`👁️ View Feedback clicked for ID: ${feedbackId}`);
    try {
        const apiUrl = `${API_BASE}/feedback/${feedbackId}`;
        console.log(`📥 Fetching from: ${apiUrl}`);
        const response = await fetch(apiUrl);
        
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
        document.getElementById('viewEmail').value = feedback.user_email || feedback.email || '';
        document.getElementById('viewSubject').value = feedback.subject || '';
        document.getElementById('viewMessage').value = feedback.message || '';
        document.getElementById('viewStatus').value = feedback.status || 'Open';
        document.getElementById('viewPriority').value = feedback.priority || 'Normal';
        document.getElementById('viewResponse').value = feedback.response_notes || '';
        document.getElementById('viewRespondedBy').value = feedback.responded_by || '-';
        document.getElementById('viewResponseDate').value = feedback.response_date ? 
            new Date(feedback.response_date).toLocaleString() : '-';

        // Display rating
        const ratingContainer = document.getElementById('viewRating');
        const rating = feedback.rating || feedback.app_rating;
        if (rating) {
            ratingContainer.innerHTML = `
                <div style="font-size: 24px; color: #ffc107;">
                    ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}
                </div>
                <small>${rating} / 5 Stars</small>
            `;
        } else {
            ratingContainer.innerHTML = '<small class="text-muted">No rating provided</small>';
        }

        console.log('✅ Modal populated, opening...');
        
        // Ensure modal exists and show it
        if (feedbackModal) {
            try {
                feedbackModal.show();
                console.log('✅ Modal opened successfully');
            } catch (modalError) {
                console.error('❌ Modal show() error:', modalError);
                // Fallback: try using Bootstrap directly
                const modalElement = document.getElementById('feedbackModal');
                if (modalElement) {
                    const bsModal = new bootstrap.Modal(modalElement);
                    bsModal.show();
                    console.log('✅ Modal opened via fallback');
                }
            }
        } else {
            console.error('❌ feedbackModal object is null/undefined');
            showAlert('Modal initialization error', 'danger');
        }

    } catch (error) {
        console.error('❌ Error opening feedback details:', error);
        showAlert('Error loading feedback details: ' + error.message, 'danger');
    }
}


// Edit feedback - enable editing mode
function editFeedback() {
    console.log('✏️ Edit mode activated');
    
    // Enable editable fields
    const editableFields = [
        'viewStatus',
        'viewPriority',
        'viewResponse'
    ];
    
    editableFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.removeAttribute('disabled');
            element.removeAttribute('readonly');
            element.classList.add('is-editing');
        }
    });
    
    // Change button labels/states
    const editBtn = document.getElementById('editDetailsBtn');
    if (editBtn) {
        editBtn.textContent = 'Cancel';
        editBtn.classList.remove('btn-primary');
        editBtn.classList.add('btn-secondary');
        editBtn.onclick = () => {
            location.reload(); // Reload to cancel editing
        };
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
            // loadStatistics(); // Statistics section removed
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
            // loadStatistics(); // Statistics section removed
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
    // Reset form
    document.getElementById('feedbackForm').reset();
    console.log('📝 Showing new feedback form...');
    feedbackFormModal.show();
}

// Submit new feedback
async function submitNewFeedback() {
    try {
        const feedbackType = document.getElementById('feedbackType')?.value || '';
        const subject = document.getElementById('feedbackSubject')?.value || '';
        const message = document.getElementById('feedbackMessage')?.value || '';
        const email = document.getElementById('feedbackEmail')?.value || '';
        
        if (!subject || !message || !email) {
            console.warn('❌ Missing required fields');
            showAlert('Please fill all required fields', 'warning');
            return;
        }
        
        console.log('📤 Submitting new feedback...');
        const response = await fetch(`${API_BASE}/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                feedback_type: feedbackType, 
                subject, 
                message, 
                user_email: email 
            })
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Feedback submitted successfully');
            showAlert('Feedback submitted successfully!', 'success');
            feedbackFormModal.hide();
            document.getElementById('feedbackForm').reset();
            loadFeedback();
        } else {
            throw new Error(result.error || 'Failed to submit feedback');
        }
    } catch (error) {
        console.error('❌ Error submitting feedback:', error);
        showAlert('Failed to submit feedback: ' + error.message, 'danger');
    }
}

// Apply filters
function applyFilters() {
    console.log('🔍 Applying filters...');
    loadFeedback();
    // loadStatistics(); // Statistics section removed
}

// Reset filters
function resetFilters() {
    console.log('🔄 Resetting filters...');
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('typeFilter').value = '';
    document.getElementById('ratingFilter').value = '';
    loadFeedback();
    // loadStatistics(); // Statistics section removed
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

function getStatusBadgeColor(status) {
    const colors = {
        'Open': 'danger',
        'Under Review': 'warning',
        'Acknowledged': 'info',
        'In Progress': 'warning',
        'Resolved': 'success',
        'Closed': 'secondary'
    };
    return colors[status] || 'secondary';
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
