// static/js/focus-timer.js - FIXED VERSION
document.addEventListener('DOMContentLoaded', function() {
    // Timer elements
    const minutesElement = document.getElementById('minutes');
    const secondsElement = document.getElementById('seconds');
    const startButton = document.getElementById('start-btn');
    const pauseButton = document.getElementById('pause-btn');
    const resetButton = document.getElementById('reset-btn');
    const modeButtons = document.querySelectorAll('.mode-btn');
    const progressRing = document.querySelector('.progress-ring-circle');
    
    // Stats elements
    const sessionsCompletedElement = document.getElementById('sessions-completed');
    const focusTimeElement = document.getElementById('focus-time');
    
    // Settings
    const autoStartCheckbox = document.getElementById('auto-start');
    const notificationSoundCheckbox = document.getElementById('notification-sound');
    
    // Timer state
    let timerInterval;
    let timeLeft = 25 * 60; // 25 minutes in seconds
    let isRunning = false;
    let currentMode = 'pomodoro';
    let sessionsCompleted = 0;
    let totalFocusTime = 0;
    let targetTime = 0; // Target timestamp when timer should finish
    
    // Set up the progress ring
    const radius = progressRing.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    
    progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
    progressRing.style.strokeDashoffset = circumference;
    
    // Load saved data
    loadUserData();
    
    // Event listeners
    startButton.addEventListener('click', startTimer);
    pauseButton.addEventListener('click', pauseTimer);
    resetButton.addEventListener('click', resetTimer);
    
    modeButtons.forEach(button => {
        button.addEventListener('click', function() {
            switchMode(this.dataset.minutes);
            modeButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    autoStartCheckbox.addEventListener('change', saveSettings);
    notificationSoundCheckbox.addEventListener('change', saveSettings);
    
    // Initialize the timer display
    updateDisplay();
    
    // Handle tab visibility change
    document.addEventListener('visibilitychange', function() {
        if (document.hidden && isRunning) {
            // Tab is inactive, save the target time
            localStorage.setItem('timerTargetTime', targetTime);
        } else if (!document.hidden && localStorage.getItem('timerTargetTime')) {
            // Tab is active again, check if we need to resume
            const savedTargetTime = parseInt(localStorage.getItem('timerTargetTime'));
            if (savedTargetTime > Date.now()) {
                // Timer was running, resume it
                timeLeft = Math.ceil((savedTargetTime - Date.now()) / 1000);
                startTimer();
            } else {
                // Timer has finished while tab was inactive
                timeLeft = 0;
                timerComplete();
                localStorage.removeItem('timerTargetTime');
            }
        }
    });
    
    // Check for running timer on page load
    const savedTargetTime = localStorage.getItem('timerTargetTime');
    if (savedTargetTime) {
        const remainingTime = Math.ceil((parseInt(savedTargetTime) - Date.now()) / 1000);
        if (remainingTime > 0) {
            timeLeft = remainingTime;
            startTimer();
        } else {
            localStorage.removeItem('timerTargetTime');
            timeLeft = 0;
            timerComplete();
        }
    }
    
    function startTimer() {
        if (isRunning) return;
        
        isRunning = true;
        startButton.disabled = true;
        pauseButton.disabled = false;
        
        // Calculate target time
        targetTime = Date.now() + (timeLeft * 1000);
        localStorage.setItem('timerTargetTime', targetTime);
        
        timerInterval = setInterval(updateTimer, 100);
    }
    
    function updateTimer() {
        const currentTime = Date.now();
        const remainingTime = Math.ceil((targetTime - currentTime) / 1000);
        
        if (remainingTime <= 0) {
            timeLeft = 0;
            clearInterval(timerInterval);
            localStorage.removeItem('timerTargetTime');
            timerComplete();
            return;
        }
        
        timeLeft = remainingTime;
        updateDisplay();
    }
    
    function pauseTimer() {
        if (!isRunning) return;
        
        clearInterval(timerInterval);
        isRunning = false;
        startButton.disabled = false;
        pauseButton.disabled = true;
        localStorage.removeItem('timerTargetTime');
    }
    
    function resetTimer() {
        clearInterval(timerInterval);
        isRunning = false;
        startButton.disabled = false;
        pauseButton.disabled = true;
        localStorage.removeItem('timerTargetTime');
        
        switchMode(getMinutesByMode(currentMode));
        updateDisplay();
    }
    
    function switchMode(minutes) {
        const mins = parseInt(minutes);
        timeLeft = mins * 60;
        currentMode = getModeByMinutes(mins);
        updateDisplay();
    }
    
    function getModeByMinutes(minutes) {
        switch(minutes) {
            case 5: return 'short-break';
            case 15: return 'long-break';
            default: return 'pomodoro';
        }
    }
    
    function getMinutesByMode(mode) {
        switch(mode) {
            case 'short-break': return 5;
            case 'long-break': return 15;
            default: return 25;
        }
    }
    
    function timerComplete() {
        isRunning = false;
        startButton.disabled = false;
        pauseButton.disabled = true;
        
        // Play sound if enabled
        if (notificationSoundCheckbox.checked) {
            const sound = document.getElementById('timer-sound');
            sound.currentTime = 0;
            sound.play().catch(e => console.log('Audio play failed:', e));
        }
        
        // Show notification
        showNotification(`${currentMode === 'pomodoro' ? 'Focus session' : 'Break'} completed!`, 'success');
        
        // Update stats if it was a focus session
        if (currentMode === 'pomodoro') {
            sessionsCompleted++;
            totalFocusTime += 25;
            updateStats();
            saveUserData();
        }
        
        // Auto-start next session if enabled
        if (autoStartCheckbox.checked) {
            let nextMode;
            if (currentMode === 'pomodoro') {
                // After a pomodoro, start a short break
                nextMode = 'short-break';
            } else {
                // After a break, start a pomodoro
                nextMode = 'pomodoro';
            }
            
            // Find and click the appropriate mode button
            const nextModeButton = Array.from(modeButtons).find(btn => 
                getModeByMinutes(parseInt(btn.dataset.minutes)) === nextMode
            );
            
            if (nextModeButton) {
                modeButtons.forEach(btn => btn.classList.remove('active'));
                nextModeButton.classList.add('active');
                switchMode(nextModeButton.dataset.minutes);
                startTimer();
            }
        }
    }
    
    function updateDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        minutesElement.textContent = minutes.toString().padStart(2, '0');
        secondsElement.textContent = seconds.toString().padStart(2, '0');
        
        // Update progress ring
        const totalTime = getMinutesByMode(currentMode) * 60;
        const offset = circumference - (timeLeft / totalTime) * circumference;
        progressRing.style.strokeDashoffset = offset;
    }
    
    function updateStats() {
        sessionsCompletedElement.textContent = sessionsCompleted;
        focusTimeElement.textContent = totalFocusTime;
    }
    
    function loadUserData() {
        const savedData = JSON.parse(localStorage.getItem('focusTimerData') || '{}');
        
        sessionsCompleted = savedData.sessionsCompleted || 0;
        totalFocusTime = savedData.totalFocusTime || 0;
        
        const settings = JSON.parse(localStorage.getItem('focusTimerSettings') || '{}');
        autoStartCheckbox.checked = settings.autoStart || false;
        notificationSoundCheckbox.checked = settings.notificationSound !== false;
        
        // Set the active mode button
        const activeMode = getMinutesByMode(currentMode);
        modeButtons.forEach(btn => {
            if (parseInt(btn.dataset.minutes) === activeMode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        updateStats();
    }
    
    function saveUserData() {
        const data = {
            sessionsCompleted: sessionsCompleted,
            totalFocusTime: totalFocusTime
        };
        
        localStorage.setItem('focusTimerData', JSON.stringify(data));
    }
    
    function saveSettings() {
        const settings = {
            autoStart: autoStartCheckbox.checked,
            notificationSound: notificationSoundCheckbox.checked
        };
        
        localStorage.setItem('focusTimerSettings', JSON.stringify(settings));
    }
    
    // Make showNotification available globally for this page
    window.showNotification = showNotification;
});