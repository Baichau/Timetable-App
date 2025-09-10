// static/js/timetable.js
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const timetableGrid = document.getElementById('timetable');
    const addEventBtn = document.getElementById('add-event-btn');
    const addFirstEventBtn = document.getElementById('add-first-event');
    const eventModal = document.getElementById('event-modal');
    const eventForm = document.getElementById('event-form');
    const closeModalBtn = document.querySelector('.close-modal');
    const cancelEventBtn = document.getElementById('cancel-event');
    const deleteAllBtn = document.getElementById('delete-all-btn');
    
    // State
    let events = JSON.parse(localStorage.getItem('timetableEvents')) || [];
    let editingEventId = null;
    let isEditing = false;
    
    // Initialize
    generateTimeSlots();
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    checkEmptyState();
    
    // Event listeners
    addEventBtn.addEventListener('click', openEventModal);
    if (addFirstEventBtn) {
        addFirstEventBtn.addEventListener('click', openEventModal);
    }
    
    closeModalBtn.addEventListener('click', closeEventModal);
    if (cancelEventBtn) cancelEventBtn.addEventListener('click', closeEventModal);
    
    eventForm.addEventListener('submit', function(e) {
        e.preventDefault();
        saveEvent();
    });
    
    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', openDeleteAllModal);
    }
    
    // Close modal when clicking outside
    eventModal.addEventListener('click', function(e) {
        if (e.target === eventModal) {
            closeEventModal();
        }
    });
    
    // Week navigation
    document.getElementById('prev-week').addEventListener('click', function() {
        alert('Previous week clicked (functionality preserved)');
    });
    
    document.getElementById('next-week').addEventListener('click', function() {
        alert('Next week clicked (functionality preserved)');
    });
    
    // Delete modals
    const deleteModal = document.getElementById('delete-modal');
    const deleteAllModal = document.getElementById('delete-all-modal');
    const closeDeleteModalBtn = document.querySelector('.close-delete-modal');
    const closeDeleteAllModalBtn = document.querySelector('.close-delete-all-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete');
    const confirmDeleteBtn = document.getElementById('confirm-delete');
    const cancelDeleteAllBtn = document.getElementById('cancel-delete-all');
    const confirmDeleteAllBtn = document.getElementById('confirm-delete-all');
    
    if (closeDeleteModalBtn) {
        closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
    }
    
    if (closeDeleteAllModalBtn) {
        closeDeleteAllModalBtn.addEventListener('click', closeDeleteAllModal);
    }
    
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    }
    
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', confirmDelete);
    }
    
    if (cancelDeleteAllBtn) {
        cancelDeleteAllBtn.addEventListener('click', closeDeleteAllModal);
    }
    
    if (confirmDeleteAllBtn) {
        confirmDeleteAllBtn.addEventListener('click', confirmDeleteAll);
    }
    
    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === deleteModal) {
            closeDeleteModal();
        }
        if (e.target === deleteAllModal) {
            closeDeleteAllModal();
        }
    });
    
    // Functions
    function updateCurrentTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        document.getElementById('current-time').textContent = timeString;
    }
    
    function checkEmptyState() {
        const emptyState = document.getElementById('empty-state');
        if (events.length === 0) {
            emptyState.style.display = 'block';
            timetableGrid.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            timetableGrid.style.display = 'grid';
        }
    }
    
    function generateTimeSlots() {
        const startHour = 8; // 8 AM
        const endHour = 22; // 10 PM
        
        // Clear existing time slots except headers
        const existingTimeSlots = document.querySelectorAll('.time-slot');
        existingTimeSlots.forEach(slot => slot.remove());
        
        for (let hour = startHour; hour <= endHour; hour++) {
            // Add time label
            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-label';
            timeLabel.textContent = `${hour}:00`;
            timetableGrid.appendChild(timeLabel);
            
            // Add time slots for each day
            for (let day = 0; day < 7; day++) {
                const timeSlot = document.createElement('div');
                timeSlot.className = 'time-slot';
                timeSlot.setAttribute('data-day', day);
                timeSlot.setAttribute('data-hour', hour);
                timeSlot.addEventListener('click', function() {
                    openEventModal(day, `${hour}:00`);
                });
                timetableGrid.appendChild(timeSlot);
            }
        }
        
        // Render events after generating time slots
        renderEvents();
    }
    
    function createEventElement(event) {
        const eventElement = document.createElement('div');
        eventElement.className = 'event';
        eventElement.style.backgroundColor = event.color;
        eventElement.dataset.id = event.id;
        
        const startTime = formatTime(event.startTime);
        const endTime = formatTime(event.endTime);
        
        eventElement.innerHTML = `
            <div class="event-title">${event.title}</div>
            <div class="event-time">${startTime} - ${endTime}</div>
            <div class="event-actions">
                <button class="edit-event"><i class="fas fa-edit"></i></button>
                <button class="delete-event"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
        // Add click event for editing
        eventElement.querySelector('.edit-event').addEventListener('click', function(e) {
            e.stopPropagation();
            openEditModal(event);
        });
        
        // Add click event for deleting
        eventElement.querySelector('.delete-event').addEventListener('click', function(e) {
            e.stopPropagation();
            openDeleteModal(event);
        });
        
        return eventElement;
    }
    
    function formatTime(timeString) {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        return `${hour > 12 ? hour - 12 : hour}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
    }
    
    function renderEvents() {
        // Clear all existing events
        const existingEvents = document.querySelectorAll('.event');
        existingEvents.forEach(event => event.remove());
        
        events.forEach(event => {
            const startHour = parseInt(event.startTime.split(':')[0]);
            const day = parseInt(event.day);
            
            // Find the correct time slot
            const timeSlot = document.querySelector(`.time-slot[data-day="${day}"][data-hour="${startHour}"]`);
            if (timeSlot) {
                const eventElement = createEventElement(event);
                timeSlot.appendChild(eventElement);
            }
        });
        
        checkEmptyState();
    }
    
    function saveEvents() {
        localStorage.setItem('timetableEvents', JSON.stringify(events));
        renderEvents();
    }
    
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    function openEventModal(dayIndex = null, timeSlot = null) {
        editingEventId = null;
        isEditing = false;
        
        // Reset form
        eventForm.reset();
        document.getElementById('modal-title').textContent = 'Add New Event';
        
        // Set default values if provided
        if (dayIndex !== null) {
            document.getElementById('event-day').value = dayIndex;
        }
        
        if (timeSlot !== null) {
            document.getElementById('event-start').value = timeSlot;
            
            // Calculate end time (1 hour later by default)
            const [hours, minutes] = timeSlot.split(':').map(Number);
            let endHours = hours + 1;
            if (endHours > 23) endHours = 23;
            document.getElementById('event-end').value = `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
        
        // Show modal
        eventModal.style.display = 'flex';
    }
    
    function closeEventModal() {
        eventModal.style.display = 'none';
        editingEventId = null;
        isEditing = false;
    }
    
    function openEditModal(event) {
        document.getElementById('modal-title').textContent = 'Edit Event';
        document.getElementById('event-id').value = event.id;
        document.getElementById('event-title').value = event.title;
        document.getElementById('event-description').value = event.description || '';
        document.getElementById('event-day').value = event.day;
        document.getElementById('event-start').value = event.startTime;
        document.getElementById('event-end').value = event.endTime;
        document.getElementById('event-color').value = event.color;
        document.getElementById('event-recurring').checked = event.recurring || false;
        
        if (event.recurring) {
            document.getElementById('event-repeat-until').value = event.repeatUntil || '';
        }
        
        isEditing = true;
        editingEventId = event.id;
        eventModal.style.display = 'flex';
    }
    
    function openDeleteModal(event) {
        editingEventId = event.id;
        deleteModal.style.display = 'flex';
    }
    
    function closeDeleteModal() {
        deleteModal.style.display = 'none';
        editingEventId = null;
    }
    
    function openDeleteAllModal() {
        if (events.length === 0) {
            alert("Your timetable is already empty!");
            return;
        }
        deleteAllModal.style.display = 'flex';
    }
    
    function closeDeleteAllModal() {
        deleteAllModal.style.display = 'none';
    }
    
    function confirmDelete() {
        if (editingEventId) {
            const deleteOption = document.querySelector('input[name="delete-option"]:checked').value;
            
            if (deleteOption === 'all') {
                // Delete all events in series (for recurring events)
                events = events.filter(event => event.id !== editingEventId && event.seriesId !== editingEventId);
            } else {
                // Delete only this event
                events = events.filter(event => event.id !== editingEventId);
            }
            
            saveEvents();
            closeDeleteModal();
        }
    }
    
    function confirmDeleteAll() {
        events = [];
        saveEvents();
        closeDeleteAllModal();
    }
    
    function saveEvent() {
        const eventId = document.getElementById('event-id').value;
        const title = document.getElementById('event-title').value;
        const description = document.getElementById('event-description').value;
        const day = document.getElementById('event-day').value;
        const startTime = document.getElementById('event-start').value;
        const endTime = document.getElementById('event-end').value;
        const color = document.getElementById('event-color').value;
        const recurring = document.getElementById('event-recurring').checked;
        const repeatUntil = document.getElementById('event-repeat-until').value;
        
        const eventData = {
            id: eventId || generateId(),
            title,
            description,
            day,
            startTime,
            endTime,
            color,
            recurring,
            repeatUntil: recurring ? repeatUntil : null
        };
        
        if (isEditing) {
            // Update existing event
            const index = events.findIndex(event => event.id === eventId);
            if (index !== -1) {
                events[index] = eventData;
            }
        } else {
            // Add new event
            events.push(eventData);
        }
        
        saveEvents();
        closeEventModal();
    }
});