// static/js/timetable.js - FIXED VERSION
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
    const currentWeekElement = document.getElementById('current-week');
    const currentTimeElement = document.getElementById('current-time');
    const emptyState = document.getElementById('empty-state');

    // State
    let events = [];
    let editingEventId = null;
    let isEditing = false;
    let currentWeekOffset = 0; // 0 means current week

    // Initialize
    loadEvents();
    updateWeekDisplay();
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

    // Week navigation
    document.getElementById('prev-week').addEventListener('click', function() {
        currentWeekOffset--;
        updateWeekDisplay();
        generateTimeSlots();
    });

    document.getElementById('next-week').addEventListener('click', function() {
        currentWeekOffset++;
        updateWeekDisplay();
        generateTimeSlots();
    });

    // Functions
    function updateCurrentTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        const dateString = now.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        currentTimeElement.textContent = `${dateString} | ${timeString}`;
    }

    function getCurrentWeekRange() {
        const now = new Date();
        const currentDay = now.getDay();
        const startDate = new Date(now);
        
        // Calculate Monday of the current week
        startDate.setDate(now.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
        
        // Apply week offset
        startDate.setDate(startDate.getDate() + (currentWeekOffset * 7));
        
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        
        return { startDate, endDate };
    }

    function updateWeekDisplay() {
        const { startDate, endDate } = getCurrentWeekRange();
        
        const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
        const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
        
        const startDay = startDate.getDate();
        const endDay = endDate.getDate();
        
        const year = startDate.getFullYear();
        
        let weekString;
        if (startMonth === endMonth) {
            weekString = `${startMonth} ${startDay} - ${endDay}, ${year}`;
        } else {
            weekString = `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
        }
        
        currentWeekElement.textContent = weekString;
        
        // Update day headers with dates
        updateDayHeaders(startDate);
    }

    function updateDayHeaders(startDate) {
        const dayHeaders = document.querySelectorAll('.day-header');
        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        dayHeaders.forEach((header, index) => {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + index);
            
            const dateStr = currentDate.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
            
            header.innerHTML = `${daysOfWeek[index]} <span class="day-date">${dateStr}</span>`;
        });
    }

    function generateTimeSlots() {
        // Clear only time slots, not the header row
        const timeSlots = document.querySelectorAll('.time-slot, .time-label:not(:first-child)');
        timeSlots.forEach(slot => slot.remove());
        
        // Remove existing events
        const existingEvents = document.querySelectorAll('.event');
        existingEvents.forEach(event => event.remove());
        
        // Generate time labels and slots
        for (let hour = 8; hour <= 20; hour++) {
            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-label';
            timeLabel.textContent = `${hour}:00`;
            timetableGrid.appendChild(timeLabel);
            
            for (let day = 0; day < 7; day++) {
                const timeSlot = document.createElement('div');
                timeSlot.className = 'time-slot';
                timeSlot.dataset.hour = hour;
                timeSlot.dataset.day = day;
                timeSlot.addEventListener('click', function() {
                    openEventModalForTimeSlot(day, hour);
                });
                timetableGrid.appendChild(timeSlot);
            }
        }
        
        // Render events for the current week
        renderEvents();
        
        // Highlight current time if it's the current week
        if (currentWeekOffset === 0) {
            highlightCurrentTime();
        }
    }

    function highlightCurrentTime() {
        const now = new Date();
        const currentDay = now.getDay();
        const currentHour = now.getHours();
        
        // Adjust day index (0 = Monday, 6 = Sunday)
        let dayIndex = currentDay - 1;
        if (dayIndex < 0) dayIndex = 6; // Sunday
        
        // Find the current time slot
        const currentSlots = document.querySelectorAll(`.time-slot[data-day="${dayIndex}"]`);
        
        currentSlots.forEach(slot => {
            const slotHour = parseInt(slot.dataset.hour);
            if (slotHour === currentHour) {
                slot.classList.add('current-time');
            }
        });
    }

    function openEventModalForTimeSlot(day, hour) {
        document.getElementById('event-day').value = day;
        document.getElementById('event-start').value = `${hour.toString().padStart(2, '0')}:00`;
        document.getElementById('event-end').value = `${(hour + 1).toString().padStart(2, '0')}:00`;
        
        openEventModal();
    }

    function openEventModal() {
        isEditing = false;
        editingEventId = null;
        document.getElementById('modal-title').textContent = 'Add New Event';
        document.getElementById('event-id').value = '';
        document.getElementById('event-title').value = '';
        document.getElementById('event-description').value = '';
        document.getElementById('event-color').value = '#3498db';
        document.getElementById('event-start').value = '09:00';
        document.getElementById('event-end').value = '10:00';
        document.getElementById('event-recurring').checked = false;
        document.getElementById('recurrence-options').style.display = 'none';
        
        eventModal.style.display = 'flex';
    }

    function closeEventModal() {
        eventModal.style.display = 'none';
    }

    function saveEvent() {
        const eventId = document.getElementById('event-id').value || generateId();
        const title = document.getElementById('event-title').value;
        const description = document.getElementById('event-description').value;
        const day = parseInt(document.getElementById('event-day').value);
        const color = document.getElementById('event-color').value;
        const startTime = document.getElementById('event-start').value;
        const endTime = document.getElementById('event-end').value;
        const isRecurring = document.getElementById('event-recurring').checked;
        
        if (!title) {
            showNotification('Please enter a title for the event', 'error');
            return;
        }
        
        const event = {
            id: eventId,
            title,
            description,
            day,
            color,
            startTime,
            endTime,
            isRecurring
        };
        
        if (isEditing) {
            // Update existing event
            const index = events.findIndex(e => e.id === editingEventId);
            if (index !== -1) {
                events[index] = event;
                showNotification('Event updated successfully', 'success');
            }
        } else {
            // Add new event
            events.push(event);
            showNotification('Event added successfully', 'success');
        }
        
        saveEventsToStorage();
        renderEvents();
        closeEventModal();
        checkEmptyState();
    }

    function renderEvents() {
        // Clear existing events
        const existingEvents = document.querySelectorAll('.event');
        existingEvents.forEach(event => event.remove());
        
        const { startDate } = getCurrentWeekRange();
        
        events.forEach(event => {
            const eventStartTime = parseTimeString(event.startTime);
            const eventEndTime = parseTimeString(event.endTime);
            
            // Check if event falls within the displayed hours
            if (eventStartTime.hours >= 8 && eventStartTime.hours <= 20) {
                const timeSlot = document.querySelector(`.time-slot[data-day="${event.day}"][data-hour="${eventStartTime.hours}"]`);
                
                if (timeSlot) {
                    const eventElement = document.createElement('div');
                    eventElement.className = 'event';
                    eventElement.style.backgroundColor = event.color;
                    eventElement.innerHTML = `
                        <div class="event-title">${event.title}</div>
                        <div class="event-time">${event.startTime} - ${event.endTime}</div>
                        <div class="event-actions">
                            <button class="edit-event" data-id="${event.id}"><i class="fas fa-edit"></i></button>
                            <button class="delete-event" data-id="${event.id}"><i class="fas fa-trash"></i></button>
                        </div>
                    `;
                    
                    // Calculate height based on duration
                    const duration = (eventEndTime.hours - eventStartTime.hours) + 
                                    (eventEndTime.minutes - eventStartTime.minutes) / 60;
                    eventElement.style.height = `calc(${duration * 80}px - 4px)`;
                    
                    timeSlot.appendChild(eventElement);
                    
                    // Add event listeners for edit and delete buttons
                    eventElement.querySelector('.edit-event').addEventListener('click', function(e) {
                        e.stopPropagation();
                        editEvent(event.id);
                    });
                    
                    eventElement.querySelector('.delete-event').addEventListener('click', function(e) {
                        e.stopPropagation();
                        openDeleteModal(event.id);
                    });
                }
            }
        });
    }

    function editEvent(eventId) {
        const event = events.find(e => e.id === eventId);
        if (event) {
            isEditing = true;
            editingEventId = eventId;
            
            document.getElementById('modal-title').textContent = 'Edit Event';
            document.getElementById('event-id').value = event.id;
            document.getElementById('event-title').value = event.title;
            document.getElementById('event-description').value = event.description;
            document.getElementById('event-day').value = event.day;
            document.getElementById('event-color').value = event.color;
            document.getElementById('event-start').value = event.startTime;
            document.getElementById('event-end').value = event.endTime;
            document.getElementById('event-recurring').checked = event.isRecurring;
            
            if (event.isRecurring) {
                document.getElementById('recurrence-options').style.display = 'block';
            }
            
            eventModal.style.display = 'flex';
        }
    }

    function openDeleteModal(eventId) {
        const deleteModal = document.getElementById('delete-modal');
        deleteModal.style.display = 'flex';
        
        document.getElementById('cancel-delete').addEventListener('click', function() {
            deleteModal.style.display = 'none';
        });
        
        document.getElementById('confirm-delete').addEventListener('click', function() {
            deleteEvent(eventId);
            deleteModal.style.display = 'none';
        });
    }

    function openDeleteAllModal() {
        if (events.length === 0) {
            showNotification('There are no events to delete', 'error');
            return;
        }
        
        const deleteAllModal = document.getElementById('delete-all-modal');
        deleteAllModal.style.display = 'flex';
        
        document.getElementById('cancel-delete-all').addEventListener('click', function() {
            deleteAllModal.style.display = 'none';
        });
        
        document.getElementById('confirm-delete-all').addEventListener('click', function() {
            deleteAllEvents();
            deleteAllModal.style.display = 'none';
        });
    }

    function deleteEvent(eventId) {
        events = events.filter(event => event.id !== eventId);
        saveEventsToStorage();
        renderEvents();
        showNotification('Event deleted successfully', 'success');
        checkEmptyState();
    }

    function deleteAllEvents() {
        events = [];
        saveEventsToStorage();
        renderEvents();
        showNotification('All events deleted successfully', 'success');
        checkEmptyState();
    }

    function checkEmptyState() {
        if (events.length === 0) {
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
        }
    }

    function showNotification(message, type) {
        // Use the global showNotification function from main.js
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            // Fallback if global function is not available
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            notification.style.position = 'fixed';
            notification.style.top = '20px';
            notification.style.right = '20px';
            notification.style.padding = '10px 20px';
            notification.style.borderRadius = '5px';
            notification.style.color = 'white';
            notification.style.zIndex = '1000';
            
            if (type === 'success') {
                notification.style.background = 'var(--success-color)';
            } else if (type === 'error') {
                notification.style.background = 'var(--accent-color)';
            } else {
                notification.style.background = 'var(--primary-color)';
            }
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    function parseTimeString(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return { hours, minutes };
    }

    function saveEventsToStorage() {
        localStorage.setItem('timetableEvents', JSON.stringify(events));
    }

    function loadEvents() {
        const storedEvents = localStorage.getItem('timetableEvents');
        if (storedEvents) {
            events = JSON.parse(storedEvents);
        }
    }

    // Recurring event options toggle
    document.getElementById('event-recurring').addEventListener('change', function() {
        const recurrenceOptions = document.getElementById('recurrence-options');
        recurrenceOptions.style.display = this.checked ? 'block' : 'none';
    });
});