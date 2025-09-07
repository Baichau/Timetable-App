document.addEventListener('DOMContentLoaded', function() {
    const eventsContainer = document.getElementById('day-events-container');
    const currentTimeDisplay = document.getElementById('current-time-display');
    const currentTimeMarker = document.getElementById('current-time-marker');
    const addEventBtn = document.getElementById('add-event-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const eventModal = document.getElementById('event-modal');
    const eventDetailsModal = document.getElementById('event-details-modal');
    const settingsModal = document.getElementById('settings-modal');
    const closeButtons = document.querySelectorAll('.close');
    const eventForm = document.getElementById('event-form');
    const dateTypeSelect = document.getElementById('event-date-type');
    const specificDateGroup = document.getElementById('specific-date-group');
    const recurringOptionsGroup = document.getElementById('recurring-options-group');
    const viewButtons = document.querySelectorAll('.view-btn');
    const views = document.querySelectorAll('.view');
    const prevDateBtn = document.getElementById('prev-date-btn');
    const nextDateBtn = document.getElementById('next-date-btn');
    const currentDateRange = document.getElementById('current-date-range');
    
    let currentView = 'day';
    let currentDate = new Date();
    let events = [];
    let currentEventId = null;
    
    init();
    
    function init() {
        loadSettings();
        generateTimeLabels();
        generateWeekView();
        generateMonthView();
        loadEvents();
        updateCurrentTime();
        setInterval(updateCurrentTime, 60000);
        setupEventListeners();
        updateView();
    }
    
    function setupEventListeners() {
        addEventBtn.addEventListener('click', openEventModal);
        clearAllBtn.addEventListener('click', clearAllEvents);
        settingsBtn.addEventListener('click', openSettingsModal);
        closeButtons.forEach(btn => btn.addEventListener('click', closeModals));
        
        eventForm.addEventListener('submit', handleEventSubmit);
        
        dateTypeSelect.addEventListener('change', toggleDateType);
        
        viewButtons.forEach(btn => {
            btn.addEventListener('click', switchView);
        });
        
        prevDateBtn.addEventListener('click', navigateToPreviousDate);
        nextDateBtn.addEventListener('click', navigateToNextDate);
        
        document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
        
        window.addEventListener('click', function(event) {
            if (event.target === eventModal) closeModals();
            if (event.target === eventDetailsModal) closeModals();
            if (event.target === settingsModal) closeModals();
        });
    }
    
    function generateTimeLabels() {
        const timeLabels = document.querySelector('.time-labels');
        timeLabels.innerHTML = '';
        
        for (let hour = 6; hour <= 22; hour++) {
            const period = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour > 12 ? hour - 12 : hour;
            
            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-label';
            timeLabel.textContent = `${displayHour} ${period}`;
            timeLabels.appendChild(timeLabel);
        }
    }
    
    function generateWeekView() {
        const timeLabelsColumn = document.querySelector('.time-labels-column');
        timeLabelsColumn.innerHTML = '';
        
        for (let hour = 0; hour < 24; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const timeSlot = document.createElement('div');
                timeSlot.className = 'time-slot';
                timeSlot.textContent = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                timeLabelsColumn.appendChild(timeSlot);
            }
        }
    }
    
    function generateMonthView() {
        // Will be populated when month view is activated
    }
    
    function updateCurrentTime() {
        fetch('/api/current_time')
            .then(response => response.json())
            .then(data => {
                currentTimeDisplay.textContent = `${data.current_time} (${data.current_date})`;
                
                const [hours, minutes] = data.current_time.split(':').map(Number);
                const totalMinutes = hours * 60 + minutes;
                
                const startMinutes = 6 * 60;
                const endMinutes = 22 * 60;
                
                if (totalMinutes >= startMinutes && totalMinutes <= endMinutes) {
                    const position = ((totalMinutes - startMinutes) / (endMinutes - startMinutes)) * 100;
                    currentTimeMarker.style.left = `${position}%`;
                    currentTimeMarker.style.display = 'block';
                } else {
                    currentTimeMarker.style.display = 'none';
                }
            });
    }
    
    function loadEvents() {
        fetch('/api/events')
            .then(response => response.json())
            .then(data => {
                events = data;
                renderEvents();
            });
    }
    
    function renderEvents() {
        renderDayViewEvents();
        renderWeekViewEvents();
        renderMonthViewEvents();
    }
    
    function renderDayViewEvents() {
        eventsContainer.innerHTML = '';
        
        const currentDay = currentDate.getDay();
        const currentDateStr = formatDate(currentDate);
        
        const dayEvents = events.filter(event => {
            if (event.is_recurring) {
                return event.day_of_week === currentDay;
            } else {
                return event.specific_date === currentDateStr;
            }
        });
        
        dayEvents.forEach(event => {
            const eventElement = createEventElement(event);
            eventsContainer.appendChild(eventElement);
        });
    }
    
    function renderWeekViewEvents() {
        const dayColumns = document.querySelectorAll('.days-container .day-column');
        dayColumns.forEach(column => {
            column.innerHTML = '';
            
            const day = parseInt(column.dataset.day);
            const dayEvents = events.filter(event => {
                if (event.is_recurring) {
                    return event.day_of_week === day;
                } else {
                    const eventDate = new Date(event.specific_date);
                    return isDateInCurrentWeek(eventDate) && eventDate.getDay() === day;
                }
            });
            
            dayEvents.forEach(event => {
                const eventElement = createWeekEventElement(event);
                column.appendChild(eventElement);
            });
        });
    }
    
    function renderMonthViewEvents() {
        const monthDays = document.getElementById('month-days-container');
        monthDays.innerHTML = '';
        
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        
        for (let i = 0; i < firstDay.getDay(); i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            monthDays.appendChild(emptyDay);
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            
            const dateElement = document.createElement('div');
            dateElement.className = 'date';
            dateElement.textContent = day;
            dayElement.appendChild(dateElement);
            
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const dayEvents = events.filter(event => {
                if (event.is_recurring) {
                    const eventDay = new Date(dateStr).getDay();
                    return event.day_of_week === eventDay;
                } else {
                    return event.specific_date === dateStr;
                }
            });
            
            if (dayEvents.length > 0) {
                const eventsCount = document.createElement('div');
                eventsCount.className = 'events-count';
                eventsCount.textContent = dayEvents.length;
                dayElement.appendChild(eventsCount);
                
                dayEvents.forEach(event => {
                    const eventElement = document.createElement('div');
                    eventElement.className = 'day-event';
                    eventElement.textContent = `${event.start} ${event.title}`;
                    eventElement.style.backgroundColor = event.color;
                    eventElement.addEventListener('click', () => showEventDetails(event.id));
                    dayElement.appendChild(eventElement);
                });
            }
            
            monthDays.appendChild(dayElement);
        }
    }
    
    function createEventElement(event) {
        const eventElement = document.createElement('div');
        eventElement.className = 'event';
        eventElement.style.backgroundColor = event.color;
        
        const startMinutes = timeToMinutes(event.start);
        const endMinutes = timeToMinutes(event.end);
        const duration = endMinutes - startMinutes;
        
        const startPosition = ((startMinutes - 360) / (1320 - 360)) * 100;
        const height = (duration / (1320 - 360)) * 100;
        
        eventElement.style.top = `${startPosition}%`;
        eventElement.style.height = `${height}%`;
        eventElement.style.left = '10px';
        eventElement.style.right = '10px';
        
        eventElement.innerHTML = `
            <div class="event-title">${event.title}</div>
            <div class="event-time">${event.start} - ${event.end}</div>
            <div class="event-description">${event.description || ''}</div>
        `;
        
        eventElement.addEventListener('click', (e) => {
            e.stopPropagation();
            showEventDetails(event.id);
        });
        
        eventElement.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            eventElement.classList.toggle('expanded');
        });
        
        return eventElement;
    }
    
    function createWeekEventElement(event) {
        const eventElement = document.createElement('div');
        eventElement.className = 'week-event';
        eventElement.style.backgroundColor = event.color;
        
        const startMinutes = timeToMinutes(event.start);
        const endMinutes = timeToMinutes(event.end);
        const duration = endMinutes - startMinutes;
        
        const top = (startMinutes / 1440) * 100;
        const height = (duration / 1440) * 100;
        
        eventElement.style.top = `${top}%`;
        eventElement.style.height = `${height}%`;
        
        eventElement.innerHTML = `
            <div class="event-title">${event.title}</div>
            <div class="event-time">${event.start} - ${event.end}</div>
        `;
        
        eventElement.addEventListener('click', (e) => {
            e.stopPropagation();
            showEventDetails(event.id);
        });
        
        return eventElement;
    }
    
    function timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }
    
    function openEventModal() {
        document.getElementById('event-specific-date').value = formatDate(currentDate);
        eventModal.style.display = 'flex';
    }
    
    function openSettingsModal() {
        settingsModal.style.display = 'flex';
    }
    
    function closeModals() {
        eventModal.style.display = 'none';
        eventDetailsModal.style.display = 'none';
        settingsModal.style.display = 'none';
        eventForm.reset();
        currentEventId = null;
    }
    
    function toggleDateType() {
        const dateType = dateTypeSelect.value;
        if (dateType === 'specific') {
            specificDateGroup.style.display = 'block';
            recurringOptionsGroup.style.display = 'none';
        } else {
            specificDateGroup.style.display = 'none';
            recurringOptionsGroup.style.display = 'block';
        }
    }
    
    function handleEventSubmit(e) {
        e.preventDefault();
        
        const title = document.getElementById('event-title').value;
        const start = document.getElementById('event-start').value;
        const end = document.getElementById('event-end').value;
        const description = document.getElementById('event-description').value;
        const color = document.getElementById('event-color').value;
        const dateType = document.getElementById('event-date-type').value;
        
        const eventData = {
            title: title,
            start: start,
            end: end,
            description: description,
            color: color
        };
        
        if (dateType === 'specific') {
            eventData.specific_date = document.getElementById('event-specific-date').value;
            eventData.is_recurring = false;
        } else {
            eventData.day_of_week = parseInt(document.getElementById('event-day-of-week').value);
            eventData.is_recurring = true;
            eventData.recurrence_pattern = document.getElementById('event-recurrence-pattern').value;
            eventData.recurrence_end_date = document.getElementById('event-recurrence-end-date').value || null;
        }
        
        console.log("📊 Sending data:", eventData);
        
        fetch('/api/events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(errorData.error || 'Server error');
                });
            }
            return response.json();
        })
        .then(data => {
            console.log("✅ Success:", data);
            closeModals();
            loadEvents();
        })
        .catch(error => {
            console.error('❌ Error:', error);
            alert('Error creating event: ' + error.message);
        });
    }
    
    function showEventDetails(eventId) {
        fetch(`/api/event/${eventId}`)
            .then(response => response.json())
            .then(event => {
                document.getElementById('event-details-title').textContent = event.title;
                document.getElementById('event-details-time').textContent = `${event.start} - ${event.end}`;
                
                if (event.is_recurring) {
                    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                    document.getElementById('event-details-date').textContent = `Every ${days[event.day_of_week]}`;
                    
                    let recurrenceText = `Repeats ${event.recurrence_pattern}`;
                    if (event.recurrence_end_date) {
                        recurrenceText += ` until ${event.recurrence_end_date}`;
                    }
                    document.getElementById('event-details-recurrence').textContent = recurrenceText;
                } else {
                    document.getElementById('event-details-date').textContent = event.specific_date;
                    document.getElementById('event-details-recurrence').textContent = 'One-time event';
                }
                
                document.getElementById('event-details-description').textContent = event.description || 'No description';
                
                document.getElementById('edit-event-btn').onclick = () => editEvent(event);
                document.getElementById('delete-event-btn').onclick = () => deleteEvent(event.id);
                
                eventDetailsModal.style.display = 'flex';
                currentEventId = eventId;
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error loading event details');
            });
    }
    
    function editEvent(event) {
        closeModals();
        
        document.getElementById('event-title').value = event.title;
        document.getElementById('event-start').value = event.start;
        document.getElementById('event-end').value = event.end;
        document.getElementById('event-description').value = event.description || '';
        document.getElementById('event-color').value = event.color;
        
        if (event.is_recurring) {
            document.getElementById('event-date-type').value = 'recurring';
            document.getElementById('event-day-of-week').value = event.day_of_week;
            document.getElementById('event-recurrence-pattern').value = event.recurrence_pattern;
            document.getElementById('event-recurrence-end-date').value = event.recurrence_end_date || '';
            toggleDateType();
        } else {
            document.getElementById('event-date-type').value = 'specific';
            document.getElementById('event-specific-date').value = event.specific_date;
            toggleDateType();
        }
        
        eventModal.style.display = 'flex';
        currentEventId = event.id;
    }
    
    function deleteEvent(eventId) {
        if (confirm('Are you sure you want to delete this event?')) {
            fetch(`/api/events?id=${eventId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                closeModals();
                loadEvents();
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error deleting event');
            });
        }
    }
    
    function clearAllEvents() {
        if (confirm('Are you sure you want to delete ALL events?')) {
            fetch('/api/events', {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                loadEvents();
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error clearing events');
            });
        }
    }
    
    function switchView(e) {
        const viewId = e.target.id.replace('-btn', '');
        
        viewButtons.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        views.forEach(view => view.classList.remove('active'));
        document.getElementById(`${viewId}-view`).classList.add('active');
        
        currentView = viewId;
        updateView();
    }
    
    function navigateToPreviousDate() {
        if (currentView === 'day') {
            currentDate.setDate(currentDate.getDate() - 1);
        } else if (currentView === 'week') {
            currentDate.setDate(currentDate.getDate() - 7);
        } else if (currentView === 'month') {
            currentDate.setMonth(currentDate.getMonth() - 1);
        }
        updateView();
    }
    
    function navigateToNextDate() {
        if (currentView === 'day') {
            currentDate.setDate(currentDate.getDate() + 1);
        } else if (currentView === 'week') {
            currentDate.setDate(currentDate.getDate() + 7);
        } else if (currentView === 'month') {
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
        updateView();
    }
    
    function updateView() {
        if (currentView === 'day') {
            currentDateRange.textContent = formatDate(currentDate, 'long');
            renderDayViewEvents();
        } else if (currentView === 'week') {
            const weekStart = new Date(currentDate);
            weekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1);
            
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            
            currentDateRange.textContent = `${formatDate(weekStart, 'short')} - ${formatDate(weekEnd, 'short')}`;
            renderWeekViewEvents();
        } else if (currentView === 'month') {
            currentDateRange.textContent = formatDate(currentDate, 'month');
            renderMonthViewEvents();
        }
    }
    
    function formatDate(date, format = 'short') {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        
        if (format === 'short') {
            return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        } else if (format === 'long') {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            return date.toLocaleDateString(undefined, options);
        } else if (format === 'month') {
            const options = { year: 'numeric', month: 'long' };
            return date.toLocaleDateString(undefined, options);
        }
    }
    
    function isDateInCurrentWeek(date) {
        const today = new Date();
        const firstDayOfWeek = new Date(today);
        firstDayOfWeek.setDate(today.getDate() - today.getDay() + 1);
        
        const lastDayOfWeek = new Date(firstDayOfWeek);
        lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
        
        return date >= firstDayOfWeek && date <= lastDayOfWeek;
    }
    
    function loadSettings() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        const notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';
        const notificationTime = localStorage.getItem('notificationTime') || '15';
        
        document.documentElement.setAttribute('data-theme', savedTheme);
        document.getElementById('theme-select').value = savedTheme;
        document.getElementById('notifications-enabled').checked = notificationsEnabled;
        document.getElementById('notification-time').value = notificationTime;
        
        document.querySelector('.notification-options').style.display = 
            notificationsEnabled ? 'block' : 'none';
    }
    
    function saveSettings() {
        const theme = document.getElementById('theme-select').value;
        const notificationsEnabled = document.getElementById('notifications-enabled').checked;
        const notificationTime = document.getElementById('notification-time').value;
        
        localStorage.setItem('theme', theme);
        localStorage.setItem('notificationsEnabled', notificationsEnabled);
        localStorage.setItem('notificationTime', notificationTime);
        
        document.documentElement.setAttribute('data-theme', theme);
        
        alert('Settings saved!');
        closeModals();
    }
    
    toggleDateType();
    
    document.getElementById('notifications-enabled').addEventListener('change', function() {
        document.querySelector('.notification-options').style.display = 
            this.checked ? 'block' : 'none';
    });
});