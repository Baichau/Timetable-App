// static/js/timetable.js
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const timetableGrid = document.getElementById('timetable-grid');
    const addEventBtn = document.getElementById('add-event-btn');
    const eventModal = document.getElementById('event-modal');
    const eventForm = document.getElementById('event-form');
    const closeModalBtn = document.querySelector('.close-modal');
    const cancelEventBtn = document.getElementById('cancel-event');
    
    // State
    let events = [];
    let editingEventId = null;
    
    // Initialize
    loadEvents();
    
    // Event listeners
    addEventBtn.addEventListener('click', openEventModal);
    closeModalBtn.addEventListener('click', closeEventModal);
    if (cancelEventBtn) cancelEventBtn.addEventListener('click', closeEventModal);
    
    eventForm.addEventListener('submit', function(e) {
        e.preventDefault();
        saveEvent();
    });
    
    // Close modal when clicking outside
    eventModal.addEventListener('click', function(e) {
        if (e.target === eventModal) {
            closeEventModal();
        }
    });
    
    // Functions
    function loadEvents() {
        fetch('/api/events')
            .then(response => response.json())
            .then(data => {
                events = data;
                renderTimetable();
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error loading events', 'error');
            });
    }
    
    function renderTimetable() {
        // Clear the grid
        timetableGrid.innerHTML = '';
        
        // Create time slots (7am to 9pm)
        const timeSlots = [];
        for (let hour = 7; hour <= 21; hour++) {
            timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
        }
        
        // Create day headers
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        // Create grid header
        const headerRow = document.createElement('div');
        headerRow.className = 'timetable-header';
        
        // Empty corner cell
        const cornerCell = document.createElement('div');
        cornerCell.className = 'timetable-cell timetable-corner';
        headerRow.appendChild(cornerCell);
        
        // Day headers
        days.forEach(day => {
            const dayCell = document.createElement('div');
            dayCell.className = 'timetable-cell timetable-day';
            dayCell.textContent = day.substring(0, 3);
            dayCell.title = day;
            headerRow.appendChild(dayCell);
        });
        
        timetableGrid.appendChild(headerRow);
        
        // Create time slots and events
        timeSlots.forEach(timeSlot => {
            const timeRow = document.createElement('div');
            timeRow.className = 'timetable-row';
            
            // Time label
            const timeCell = document.createElement('div');
            timeCell.className = 'timetable-cell timetable-time';
            timeCell.textContent = timeSlot;
            timeRow.appendChild(timeCell);
            
            // Day cells
            days.forEach((day, dayIndex) => {
                const cell = document.createElement('div');
                cell.className = 'timetable-cell timetable-slot';
                cell.dataset.day = dayIndex;
                cell.dataset.time = timeSlot;
                
                // Add click event to create new event
                cell.addEventListener('click', function() {
                    openEventModal(dayIndex, timeSlot);
                });
                
                timeRow.appendChild(cell);
            });
            
            timetableGrid.appendChild(timeRow);
        });
        
        // Render events
        events.forEach(event => {
            renderEvent(event);
        });
    }
    
    function renderEvent(event) {
        const { day_of_week: day, start_time: start, end_time: end, color, title } = event;
        
        // Calculate position and size
        const startTime = parseTime(start);
        const endTime = parseTime(end);
        const duration = (endTime - startTime) / (1000 * 60 * 60); // Duration in hours
        
        const timeSlotHeight = 60; // Height of each time slot in pixels
        const topPosition = (startTime.getHours() - 7) * timeSlotHeight + 
                           (startTime.getMinutes() / 60) * timeSlotHeight;
        const height = duration * timeSlotHeight;
        
        // Create event element
        const eventElement = document.createElement('div');
        eventElement.className = 'timetable-event';
        eventElement.style.top = `${topPosition}px`;
        eventElement.style.height = `${height}px`;
        eventElement.style.backgroundColor = color;
        eventElement.innerHTML = `
            <div class="event-title">${title}</div>
            <div class="event-time">${start} - ${end}</div>
            <div class="event-actions">
                <button class="event-btn edit" data-id="${event.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="event-btn delete" data-id="${event.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // Find the correct day cell and append the event
        const dayCell = document.querySelector(`.timetable-slot[data-day="${day}"]`);
        if (dayCell) {
            dayCell.appendChild(eventElement);
            
            // Add event listeners for edit and delete
            const editBtn = eventElement.querySelector('.event-btn.edit');
            editBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                editEvent(event.id);
            });
            
            const deleteBtn = eventElement.querySelector('.event-btn.delete');
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                deleteEvent(event.id);
            });
        }
    }
    
    function openEventModal(dayIndex = null, timeSlot = null) {
        editingEventId = null;
        
        // Reset form
        eventForm.reset();
        
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
    }
    
    function editEvent(id) {
        const event = events.find(e => e.id === id);
        if (!event) return;
        
        editingEventId = id;
        
        // Fill form with event data
        document.getElementById('event-title').value = event.title;
        document.getElementById('event-description').value = event.description || '';
        document.getElementById('event-day').value = event.day_of_week;
        document.getElementById('event-start').value = event.start_time;
        document.getElementById('event-end').value = event.end_time;
        document.getElementById('event-color').value = event.color;
        document.getElementById('event-recurring').checked = event.is_recurring;
        
        // Show modal
        eventModal.style.display = 'flex';
    }
    
    function saveEvent() {
        const eventData = {
            title: document.getElementById('event-title').value,
            description: document.getElementById('event-description').value,
            day_of_week: parseInt(document.getElementById('event-day').value),
            start_time: document.getElementById('event-start').value,
            end_time: document.getElementById('event-end').value,
            color: document.getElementById('event-color').value,
            is_recurring: document.getElementById('event-recurring').checked
        };
        
        const url = editingEventId ? `/api/events/${editingEventId}` : '/api/events';
        const method = editingEventId ? 'PUT' : 'POST';
        
        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                showNotification(
                    editingEventId ? 'Event updated successfully' : 'Event created successfully',
                    'success'
                );
                closeEventModal();
                loadEvents(); // Reload events
            } else {
                showNotification('Error saving event: ' + data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error saving event', 'error');
        });
    }
    
    function deleteEvent(id) {
        if (confirm('Are you sure you want to delete this event?')) {
            fetch(`/api/events/${id}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    showNotification('Event deleted successfully', 'success');
                    loadEvents(); // Reload events
                } else {
                    showNotification('Error deleting event: ' + data.error, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error deleting event', 'error');
            });
        }
    }
    
    function parseTime(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    }
    
    // Make showNotification available globally
    window.showNotification = showNotification;
});