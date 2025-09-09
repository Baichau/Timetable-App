// static/js/todo.js
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const todoForm = document.querySelector('.todo-form');
    const todoInput = document.getElementById('todo-input');
    const addTodoBtn = document.getElementById('add-todo-btn');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const todoList = document.querySelector('.todo-list');
    const clearCompletedBtn = document.getElementById('clear-completed-btn');
    
    // Stats elements
    const totalTodosElement = document.getElementById('total-todos');
    const completedTodosElement = document.getElementById('completed-todos');
    const pendingTodosElement = document.getElementById('pending-todos');
    
    // State
    let todos = [];
    let currentFilter = 'all';
    
    // Initialize
    loadTodos();
    updateStats();
    
    // Event listeners
    todoForm.addEventListener('submit', function(e) {
        e.preventDefault();
        addTodo();
    });
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            currentFilter = this.dataset.filter;
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderTodos();
        });
    });
    
    clearCompletedBtn.addEventListener('click', clearCompletedTodos);
    
    // Functions
    function addTodo() {
        const title = todoInput.value.trim();
        if (!title) return;
        
        const newTodo = {
            title: title,
            description: '',
            priority: 2, // Medium priority
            completed: false,
            due_date: null
        };
        
        // Send to server
        fetch('/api/todos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newTodo)
        })
        .then(response => response.json())
        .then(data => {
            if (data.id) {
                todoInput.value = '';
                loadTodos(); // Reload todos from server
            } else {
                showNotification('Error adding todo: ' + data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error adding todo', 'error');
        });
    }
    
    function loadTodos() {
        fetch('/api/todos')
            .then(response => response.json())
            .then(data => {
                todos = data;
                renderTodos();
                updateStats();
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error loading todos', 'error');
            });
    }
    
    function renderTodos() {
        // Clear the list
        todoList.innerHTML = '';
        
        // Filter todos based on current filter
        let filteredTodos = todos;
        if (currentFilter === 'active') {
            filteredTodos = todos.filter(todo => !todo.completed);
        } else if (currentFilter === 'completed') {
            filteredTodos = todos.filter(todo => todo.completed);
        }
        
        // Sort by priority and due date
        filteredTodos.sort((a, b) => {
            // First by completion status
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            // Then by priority
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            // Then by due date (earlier first)
            if (a.due_date && b.due_date) {
                return new Date(a.due_date) - new Date(b.due_date);
            }
            return 0;
        });
        
        // Render todos
        filteredTodos.forEach(todo => {
            const todoElement = createTodoElement(todo);
            todoList.appendChild(todoElement);
        });
        
        // Show message if no todos
        if (filteredTodos.length === 0) {
            const message = document.createElement('li');
            message.className = 'todo-empty';
            message.textContent = currentFilter === 'all' ? 
                'No todos yet. Add one above!' : 
                `No ${currentFilter} todos.`;
            todoList.appendChild(message);
        }
    }
    
    function createTodoElement(todo) {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        li.dataset.id = todo.id;
        
        // Priority class
        const priorityClass = 
            todo.priority === 1 ? 'priority-high' :
            todo.priority === 2 ? 'priority-medium' : 'priority-low';
        
        li.innerHTML = `
            <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
            <div class="todo-content">
                <div class="todo-title">
                    <span>${todo.title}</span>
                    <span class="todo-priority ${priorityClass}">
                        ${todo.priority === 1 ? 'High' : todo.priority === 2 ? 'Medium' : 'Low'}
                    </span>
                </div>
                ${todo.description ? `<div class="todo-description">${todo.description}</div>` : ''}
                <div class="todo-meta">
                    ${todo.due_date ? `
                        <div class="todo-due-date">
                            <i class="fas fa-calendar"></i>
                            ${new Date(todo.due_date).toLocaleDateString()}
                        </div>
                    ` : ''}
                    <div class="todo-created">
                        <i class="fas fa-clock"></i>
                        ${new Date(todo.created_at).toLocaleDateString()}
                    </div>
                </div>
            </div>
            <div class="todo-actions">
                <button class="todo-btn edit"><i class="fas fa-edit"></i></button>
                <button class="todo-btn delete"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
        // Add event listeners
        const checkbox = li.querySelector('.todo-checkbox');
        checkbox.addEventListener('change', () => toggleTodoComplete(todo.id, checkbox.checked));
        
        const editBtn = li.querySelector('.todo-btn.edit');
        editBtn.addEventListener('click', () => editTodo(todo));
        
        const deleteBtn = li.querySelector('.todo-btn.delete');
        deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
        
        return li;
    }
    
    function toggleTodoComplete(id, completed) {
        fetch(`/api/todos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                completed: completed,
                completed_at: completed ? new Date().toISOString() : null
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                loadTodos(); // Reload todos
            } else {
                showNotification('Error updating todo: ' + data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error updating todo', 'error');
        });
    }
    
    function editTodo(todo) {
        // In a real app, you'd show a modal or form for editing
        const newTitle = prompt('Edit todo:', todo.title);
        if (newTitle !== null && newTitle.trim() !== '') {
            fetch(`/api/todos/${todo.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: newTitle.trim(),
                    description: todo.description,
                    priority: todo.priority,
                    due_date: todo.due_date
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    loadTodos(); // Reload todos
                } else {
                    showNotification('Error updating todo: ' + data.error, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error updating todo', 'error');
            });
        }
    }
    
    function deleteTodo(id) {
        if (confirm('Are you sure you want to delete this todo?')) {
            fetch(`/api/todos/${id}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    loadTodos(); // Reload todos
                } else {
                    showNotification('Error deleting todo: ' + data.error, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error deleting todo', 'error');
            });
        }
    }
    
    function clearCompletedTodos() {
        if (confirm('Are you sure you want to clear all completed todos?')) {
            // Get all completed todo IDs
            const completedIds = todos.filter(todo => todo.completed).map(todo => todo.id);
            
            // Delete each completed todo
            Promise.all(completedIds.map(id => 
                fetch(`/api/todos/${id}`, { method: 'DELETE' })
            ))
            .then(() => {
                loadTodos(); // Reload todos
                showNotification('Completed todos cleared', 'success');
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error clearing completed todos', 'error');
            });
        }
    }
    
    function updateStats() {
        const total = todos.length;
        const completed = todos.filter(todo => todo.completed).length;
        const pending = total - completed;
        
        totalTodosElement.textContent = total;
        completedTodosElement.textContent = completed;
        pendingTodosElement.textContent = pending;
    }
    
    // Make functions available globally if needed
    window.addTodo = addTodo;
    window.loadTodos = loadTodos;
    window.showNotification = showNotification;
});