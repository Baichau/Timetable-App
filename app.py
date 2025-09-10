# app.py - Complete Flask Application
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import os
from config import Config

app = Flask(__name__)
app.config.from_object(Config)

db = SQLAlchemy(app)

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    role = db.Column(db.String(20), default='student')
    
    # Relationships
    events = db.relationship('Event', backref='user', lazy=True, cascade='all, delete-orphan')
    focus_sessions = db.relationship('FocusSession', backref='user', lazy=True, cascade='all, delete-orphan')
    study_resources = db.relationship('StudyResource', backref='user', lazy=True, cascade='all, delete-orphan')
    todos = db.relationship('Todo', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at.isoformat(),
            'role': self.role
        }

class Event(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    start_time = db.Column(db.String(5), nullable=False)
    end_time = db.Column(db.String(5), nullable=False)
    description = db.Column(db.Text)
    color = db.Column(db.String(7), default='#3a86ff')
    day_of_week = db.Column(db.Integer)
    specific_date = db.Column(db.String(10))
    is_recurring = db.Column(db.Boolean, default=False)
    recurrence_pattern = db.Column(db.String(20))
    recurrence_end_date = db.Column(db.String(10))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'start_time': self.start_time,
            'end_time': self.end_time,
            'description': self.description,
            'color': self.color,
            'day_of_week': self.day_of_week,
            'specific_date': self.specific_date,
            'is_recurring': self.is_recurring,
            'recurrence_pattern': self.recurrence_pattern,
            'recurrence_end_date': self.recurrence_end_date,
            'user_id': self.user_id
        }

class FocusSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    duration = db.Column(db.Integer, nullable=False)
    session_type = db.Column(db.String(20), default='pomodoro')
    completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    notes = db.Column(db.Text)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'duration': self.duration,
            'session_type': self.session_type,
            'completed': self.completed,
            'created_at': self.created_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'notes': self.notes,
            'user_id': self.user_id
        }

class StudyResource(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    url = db.Column(db.String(500))
    resource_type = db.Column(db.String(50))
    subject = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'url': self.url,
            'resource_type': self.resource_type,
            'subject': self.subject,
            'created_at': self.created_at.isoformat(),
            'user_id': self.user_id
        }

class Todo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    priority = db.Column(db.Integer, default=2)
    completed = db.Column(db.Boolean, default=False)
    due_date = db.Column(db.String(10))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'priority': self.priority,
            'completed': self.completed,
            'due_date': self.due_date,
            'created_at': self.created_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'user_id': self.user_id
        }

# Login required decorator
def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to access this page.', 'warning')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            session['user_id'] = user.id
            session['username'] = user.username
            flash('Login successful!', 'success')
            return redirect(url_for('index'))
        else:
            flash('Invalid username or password.', 'danger')
    
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        if not username or not email or not password:
            flash('All fields are required.', 'danger')
            return render_template('register.html')
            
        if password != confirm_password:
            flash('Passwords do not match.', 'danger')
            return render_template('register.html')
        
        if User.query.filter_by(username=username).first():
            flash('Username already exists.', 'danger')
            return render_template('register.html')
        
        if User.query.filter_by(email=email).first():
            flash('Email already exists.', 'danger')
            return render_template('register.html')
        
        try:
            new_user = User(username=username, email=email)
            new_user.set_password(password)
            
            db.session.add(new_user)
            db.session.commit()
            
            flash('Registration successful! Please log in.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            db.session.rollback()
            flash('An error occurred during registration. Please try again.', 'danger')
    
    return render_template('register.html')

@app.route('/logout')
def logout():
    session.clear()
    flash('You have been logged out.', 'info')
    return redirect(url_for('index'))

@app.route('/timetable')
@login_required
def timetable():
    return render_template('timetable.html')

@app.route('/focus-timer')
@login_required
def focus_timer():
    return render_template('focus-timer.html')

@app.route('/resources')
@login_required
def resources():
    resources = StudyResource.query.filter_by(user_id=session['user_id']).all()
    return render_template('resources.html', resources=resources)

@app.route('/todo')
@login_required
def todo():
    todos = Todo.query.filter_by(user_id=session['user_id']).order_by(Todo.created_at.desc()).all()
    return render_template('todo.html', todos=todos)

# API Routes
@app.route('/api/events', methods=['GET', 'POST'])
@login_required
def handle_events():
    if request.method == 'GET':
        events = Event.query.filter_by(user_id=session['user_id']).all()
        return jsonify([event.to_dict() for event in events])
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            new_event = Event(
                title=data['title'],
                start_time=data['start_time'],
                end_time=data['end_time'],
                description=data.get('description', ''),
                color=data.get('color', '#3a86ff'),
                day_of_week=data.get('day_of_week'),
                is_recurring=data.get('is_recurring', False),
                user_id=session['user_id']
            )
            
            db.session.add(new_event)
            db.session.commit()
            return jsonify({'message': 'Event created', 'id': new_event.id})
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500

@app.route('/api/events/<int:event_id>', methods=['PUT', 'DELETE'])
@login_required
def handle_event(event_id):
    event = Event.query.get(event_id)
    
    if not event or event.user_id != session['user_id']:
        return jsonify({'error': 'Event not found'}), 404
    
    if request.method == 'PUT':
        try:
            data = request.get_json()
            
            if 'title' in data:
                event.title = data['title']
            if 'start_time' in data:
                event.start_time = data['start_time']
            if 'end_time' in data:
                event.end_time = data['end_time']
            if 'description' in data:
                event.description = data['description']
            if 'color' in data:
                event.color = data['color']
            if 'day_of_week' in data:
                event.day_of_week = data['day_of_week']
            if 'is_recurring' in data:
                event.is_recurring = data['is_recurring']
            
            db.session.commit()
            return jsonify({'message': 'Event updated'})
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'DELETE':
        db.session.delete(event)
        db.session.commit()
        return jsonify({'message': 'Event deleted'})

@app.route('/api/todos', methods=['GET', 'POST'])
@login_required
def handle_todos():
    if request.method == 'GET':
        todos = Todo.query.filter_by(user_id=session['user_id']).order_by(Todo.created_at.desc()).all()
        return jsonify([todo.to_dict() for todo in todos])
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            new_todo = Todo(
                title=data['title'],
                description=data.get('description', ''),
                priority=data.get('priority', 2),
                completed=data.get('completed', False),
                due_date=data.get('due_date'),
                user_id=session['user_id']
            )
            
            db.session.add(new_todo)
            db.session.commit()
            return jsonify({'message': 'Todo created', 'id': new_todo.id})
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500

@app.route('/api/todos/<int:todo_id>', methods=['PUT', 'DELETE'])
@login_required
def handle_todo(todo_id):
    todo = Todo.query.get(todo_id)
    
    if not todo or todo.user_id != session['user_id']:
        return jsonify({'error': 'Todo not found'}), 404
    
    if request.method == 'PUT':
        try:
            data = request.get_json()
            
            if 'title' in data:
                todo.title = data['title']
            if 'description' in data:
                todo.description = data['description']
            if 'priority' in data:
                todo.priority = data['priority']
            if 'completed' in data:
                todo.completed = data['completed']
                if data['completed']:
                    todo.completed_at = datetime.utcnow()
                else:
                    todo.completed_at = None
            if 'due_date' in data:
                todo.due_date = data['due_date']
            
            db.session.commit()
            return jsonify({'message': 'Todo updated'})
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'DELETE':
        db.session.delete(todo)
        db.session.commit()
        return jsonify({'message': 'Todo deleted'})

@app.route('/api/resources', methods=['GET', 'POST'])
@login_required
def handle_resources():
    if request.method == 'GET':
        resources = StudyResource.query.filter_by(user_id=session['user_id']).all()
        return jsonify([resource.to_dict() for resource in resources])
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            new_resource = StudyResource(
                title=data['title'],
                description=data.get('description', ''),
                url=data.get('url', ''),
                resource_type=data.get('resource_type', ''),
                subject=data.get('subject', ''),
                user_id=session['user_id']
            )
            
            db.session.add(new_resource)
            db.session.commit()
            return jsonify({'message': 'Resource created', 'id': new_resource.id})
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500

@app.route('/api/resources/<int:resource_id>', methods=['PUT', 'DELETE'])
@login_required
def handle_resource(resource_id):
    resource = StudyResource.query.get(resource_id)
    
    if not resource or resource.user_id != session['user_id']:
        return jsonify({'error': 'Resource not found'}), 404
    
    if request.method == 'PUT':
        try:
            data = request.get_json()
            
            if 'title' in data:
                resource.title = data['title']
            if 'description' in data:
                resource.description = data['description']
            if 'url' in data:
                resource.url = data['url']
            if 'resource_type' in data:
                resource.resource_type = data['resource_type']
            if 'subject' in data:
                resource.subject = data['subject']
            
            db.session.commit()
            return jsonify({'message': 'Resource updated'})
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'DELETE':
        db.session.delete(resource)
        db.session.commit()
        return jsonify({'message': 'Resource deleted'})

@app.route('/api/focus-sessions', methods=['POST'])
@login_required
def handle_focus_sessions():
    try:
        data = request.get_json()
        new_session = FocusSession(
            duration=data['duration'],
            session_type=data.get('session_type', 'pomodoro'),
            completed=data.get('completed', True),
            user_id=session['user_id']
        )
        
        if new_session.completed:
            new_session.completed_at = datetime.utcnow()
        
        db.session.add(new_session)
        db.session.commit()
        return jsonify({'message': 'Focus session saved', 'id': new_session.id})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/current_time')
def current_time():
    now = datetime.now()
    return jsonify({
        'current_time': now.strftime('%H:%M'),
        'current_date': now.strftime('%Y-%m-%d'),
        'current_day': now.weekday()
    })

# Health check endpoint
@app.route('/health')
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})

# Initialize database
def init_db():
    with app.app_context():
        db.create_all()
        
        # Create a test user if none exists
        if not User.query.filter_by(username='testuser').first():
            test_user = User(username='testuser', email='test@edufocus.com')
            test_user.set_password('testpass')
            db.session.add(test_user)
            db.session.commit()
            print("Test user created: testuser / testpass")

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5001)