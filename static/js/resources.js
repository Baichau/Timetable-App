// static/js/resources.js
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const addResourceBtn = document.getElementById('add-resource-btn');
    const addFirstResourceBtn = document.getElementById('add-first-resource');
    const resourceModal = document.getElementById('resource-modal');
    const resourceForm = document.getElementById('resource-form');
    const closeModalBtn = document.querySelector('.close-modal');
    const cancelResourceBtn = document.getElementById('cancel-resource');
    
    // Event listeners
    if (addResourceBtn) {
        addResourceBtn.addEventListener('click', openResourceModal);
    }
    
    if (addFirstResourceBtn) {
        addFirstResourceBtn.addEventListener('click', openResourceModal);
    }
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeResourceModal);
    }
    
    if (cancelResourceBtn) {
        cancelResourceBtn.addEventListener('click', closeResourceModal);
    }
    
    resourceForm.addEventListener('submit', function(e) {
        e.preventDefault();
        saveResource();
    });
    
    // Close modal when clicking outside
    resourceModal.addEventListener('click', function(e) {
        if (e.target === resourceModal) {
            closeResourceModal();
        }
    });
    
    // Add event listeners to edit and delete buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.resource-btn.edit')) {
            const resourceId = e.target.closest('.resource-btn.edit').dataset.id;
            editResource(resourceId);
        }
        
        if (e.target.closest('.resource-btn.delete')) {
            const resourceId = e.target.closest('.resource-btn.delete').dataset.id;
            deleteResource(resourceId);
        }
    });
    
    // Filter functionality
    const filterType = document.getElementById('filter-type');
    const filterSubject = document.getElementById('filter-subject');
    const searchResources = document.getElementById('search-resources');
    
    if (filterType) {
        filterType.addEventListener('change', filterResources);
    }
    
    if (filterSubject) {
        filterSubject.addEventListener('change', filterResources);
    }
    
    if (searchResources) {
        searchResources.addEventListener('input', filterResources);
    }
    
    // Functions
    function openResourceModal() {
        // Reset form
        resourceForm.reset();
        document.getElementById('modal-title').textContent = 'Add Resource';
        document.getElementById('resource-id').value = '';
        
        // Show modal
        resourceModal.style.display = 'flex';
    }
    
    function closeResourceModal() {
        resourceModal.style.display = 'none';
    }
    
    function saveResource() {
        const formData = {
            title: document.getElementById('resource-title').value,
            description: document.getElementById('resource-description').value,
            url: document.getElementById('resource-url').value,
            resource_type: document.getElementById('resource-type').value,
            subject: document.getElementById('resource-subject').value
        };
        
        const resourceId = document.getElementById('resource-id').value;
        const url = resourceId ? `/api/resources/${resourceId}` : '/api/resources';
        const method = resourceId ? 'PUT' : 'POST';
        
        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                showNotification(
                    resourceId ? 'Resource updated successfully' : 'Resource created successfully',
                    'success'
                );
                closeResourceModal();
                // Reload the page to see changes
                setTimeout(() => location.reload(), 1000);
            } else {
                showNotification('Error saving resource: ' + data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error saving resource', 'error');
        });
    }
    
    function editResource(id) {
        fetch(`/api/resources/${id}`)
            .then(response => response.json())
            .then(resource => {
                document.getElementById('modal-title').textContent = 'Edit Resource';
                document.getElementById('resource-id').value = resource.id;
                document.getElementById('resource-title').value = resource.title;
                document.getElementById('resource-description').value = resource.description || '';
                document.getElementById('resource-url').value = resource.url || '';
                document.getElementById('resource-type').value = resource.resource_type || '';
                document.getElementById('resource-subject').value = resource.subject || '';
                
                resourceModal.style.display = 'flex';
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error loading resource', 'error');
            });
    }
    
    function deleteResource(id) {
        if (confirm('Are you sure you want to delete this resource?')) {
            fetch(`/api/resources/${id}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    showNotification('Resource deleted successfully', 'success');
                    // Reload the page to see changes
                    setTimeout(() => location.reload(), 1000);
                } else {
                    showNotification('Error deleting resource: ' + data.error, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error deleting resource', 'error');
            });
        }
    }
    
    function filterResources() {
        const typeFilter = filterType.value;
        const subjectFilter = filterSubject.value;
        const searchText = searchResources.value.toLowerCase();
        
        const resourceCards = document.querySelectorAll('.resource-card');
        
        resourceCards.forEach(card => {
            const type = card.dataset.type;
            const subject = card.dataset.subject;
            const title = card.querySelector('.resource-title').textContent.toLowerCase();
            const description = card.querySelector('.resource-description').textContent.toLowerCase();
            
            const typeMatch = !typeFilter || type === typeFilter;
            const subjectMatch = !subjectFilter || subject === subjectFilter;
            const searchMatch = !searchText || 
                               title.includes(searchText) || 
                               description.includes(searchText);
            
            if (typeMatch && subjectMatch && searchMatch) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }
    
    // Make showNotification available globally
    window.showNotification = showNotification;
});