from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash, send_from_directory
from models import db, Event, User, FocusSession, StudyResource, Todo
from datetime import datetime, timedelta
import json
import os
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from config import config
from functools import wraps

def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    
    # Security headers
    @app.after_request
    def after_request(response):
        response.headers.add('X-Content-Type-Options', 'nosniff')
        response.headers.add('X-Frame-Options', 'SAMEORIGIN')
        response.headers.add('X-XSS-Protection', '1; mode=block')
        return response
    
    # Login required decorator
    def login_required(f):
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
            
            if user and check_password_hash(user.password_hash, password):
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
            
            if password != confirm_password:
                flash('Passwords do not match.', 'danger')
                return render_template('register.html')
            
            if User.query.filter_by(username=username).first():
                flash('Username already exists.', 'danger')
                return render_template('register.html')
            
            if User.query.filter_by(email=email).first():
                flash('Email already exists.', 'danger')
                return render_template('register.html')
            
            hashed_password = generate_password_hash(password)
            new_user = User(username=username, email=email, password_hash=hashed_password)
            
            db.session.add(new_user)
            db.session.commit()
            
            flash('Registration successful! Please log in.', 'success')
            return redirect(url_for('login'))
        
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
    
    @app.route('/todo')
    @login_required
    def todo():
        return render_template('todo.html')
    
    @app.route('/resources')
    @login_required
    def resources():
        resources = StudyResource.query.filter_by(user_id=session['user_id']).all()
        return render_template('resources.html', resources=resources)
    
    # API Routes
    @app.route('/api/events', methods=['GET', 'POST'])
    @app.route('/api/events/<int:event_id>', methods=['GET', 'PUT', 'DELETE'])
    @login_required
    def handle_events(event_id=None):
        if request.method == 'GET':
            if event_id:
                event = Event.query.get(event_id)
                if event and event.user_id == session['user_id']:
                    return jsonify(event.to_dict())
                return jsonify({'error': 'Event not found'}), 404
            else:
                events = Event.query.filter_by(user_id=session['user_id']).all()
                return jsonify([event.to_dict() for event in events])
        
        elif request.method == 'POST':
            try:
                if not request.is_json:
                    return jsonify({'error': 'Content-Type must be application/json'}), 400
                    
                data = request.get_json()
                required_fields = ['title', 'start_time', 'end_time']
                for field in required_fields:
                    if field not in data:
                        return jsonify({'error': f'Missing required field: {field}'}), 400
                
                new_event = Event(
                    title=data['title'],
                    start_time=data['start_time'],
                    end_time=data['end_time'],
                    description=data.get('description', ''),
                    color=data.get('color', '#3a86ff'),
                    day_of_week=data.get('day_of_week'),
                    specific_date=data.get('specific_date'),
                    is_recurring=data.get('is_recurring', False),
                    recurrence_pattern=data.get('recurrence_pattern'),
                    recurrence_end_date=data.get('recurrence_end_date'),
                    user_id=session['user_id']
                )
                
                db.session.add(new_event)
                db.session.commit()
                return jsonify({'message': 'Event created', 'id': new_event.id})
                
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        elif request.method == 'PUT':
            try:
                event = Event.query.get(event_id)
                if not event or event.user_id != session['user_id']:
                    return jsonify({'error': 'Event not found'}), 404
                
                if not request.is_json:
                    return jsonify({'error': 'Content-Type must be application/json'}), 400
                    
                data = request.get_json()
                if 'title' in data:
                    event.title = data['title']
                if 'start_time' in data:
                    event.start_time = data['start_time']
                if 'end_time' in data:
                    event.end_time = data['end_time']
                if 'description' in data:
                    event.description = data.get('description', '')
                if 'color' in data:
                    event.color = data.get('color', '#3a86ff')
                if 'day_of_week' in data:
                    event.day_of_week = data.get('day_of_week')
                if 'specific_date' in data:
                    event.specific_date = data.get('specific_date')
                if 'is_recurring' in data:
                    event.is_recurring = data.get('is_recurring', False)
                if 'recurrence_pattern' in data:
                    event.recurrence_pattern = data.get('recurrence_pattern')
                if 'recurrence_end_date' in data:
                    event.recurrence_end_date = data.get('recurrence_end_date')
                
                db.session.commit()
                return jsonify({'message': 'Event updated'})
                
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        elif request.method == 'DELETE':
            event = Event.query.get(event_id)
            if event and event.user_id == session['user_id']:
                db.session.delete(event)
                db.session.commit()
                return jsonify({'message': 'Event deleted'})
            return jsonify({'error': 'Event not found'}), 404
    
    @app.route('/api/current_time')
    def current_time():
        now = datetime.now()
        return jsonify({
            'current_time': now.strftime('%H:%M'),
            'current_date': now.strftime('%Y-%m-%d'),
            'current_day': now.weekday()
        })
    
    # Focus sessions API
    @app.route('/api/focus-sessions', methods=['POST'])
    @app.route('/api/focus-sessions/<int:session_id>', methods=['GET', 'PUT', 'DELETE'])
    @login_required
    def handle_focus_sessions(session_id=None):
        if request.method == 'GET':
            if session_id:
                session_obj = FocusSession.query.get(session_id)
                if session_obj and session_obj.user_id == session['user_id']:
                    return jsonify(session_obj.to_dict())
                return jsonify({'error': 'Session not found'}), 404
            else:
                sessions = FocusSession.query.filter_by(user_id=session['user_id']).all()
                return jsonify([session.to_dict() for session in sessions])
        
        elif request.method == 'POST':
            try:
                if not request.is_json:
                    return jsonify({'error': 'Content-Type must be application/json'}), 400
                    
                data = request.get_json()
                duration = data.get('duration', 25)
                session_type = data.get('session_type', 'pomodoro')
                
                new_session = FocusSession(
                    duration=duration,
                    session_type=session_type,
                    completed=False,
                    user_id=session['user_id']
                )
                
                db.session.add(new_session)
                db.session.commit()
                
                return jsonify({
                    'message': 'Focus session created',
                    'id': new_session.id
                })
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        elif request.method == 'PUT':
            try:
                session_obj = FocusSession.query.get(session_id)
                if not session_obj or session_obj.user_id != session['user_id']:
                    return jsonify({'error': 'Session not found'}), 404
                    
                if not request.is_json:
                    return jsonify({'error': 'Content-Type must be application/json'}), 400
                    
                data = request.get_json()
                if 'completed' in data:
                    session_obj.completed = data['completed']
                    if data['completed']:
                        session_obj.completed_at = datetime.utcnow()
                if 'notes' in data:
                    session_obj.notes = data['notes']
                if 'duration' in data:
                    session_obj.duration = data['duration']
                if 'session_type' in data:
                    session_obj.session_type = data['session_type']
                    
                db.session.commit()
                
                return jsonify({'message': 'Session updated'})
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        elif request.method == 'DELETE':
            session_obj = FocusSession.query.get(session_id)
            if session_obj and session_obj.user_id == session['user_id']:
                db.session.delete(session_obj)
                db.session.commit()
                return jsonify({'message': 'Session deleted'})
            return jsonify({'error': 'Session not found'}), 404
    
    # To-Do API
    @app.route('/api/todos', methods=['GET', 'POST'])
    @app.route('/api/todos/<int:todo_id>', methods=['GET', 'PUT', 'DELETE'])
    @login_required
    def handle_todos(todo_id=None):
        if request.method == 'GET':
            if todo_id:
                todo = Todo.query.get(todo_id)
                if todo and todo.user_id == session['user_id']:
                    return jsonify(todo.to_dict())
                return jsonify({'error': 'Todo not found'}), 404
            else:
                todos = Todo.query.filter_by(user_id=session['user_id']).order_by(Todo.created_at.desc()).all()
                return jsonify([todo.to_dict() for todo in todos])
        
        elif request.method == 'POST':
            try:
                if not request.is_json:
                    return jsonify({'error': 'Content-Type must be application/json'}), 400
                    
                data = request.get_json()
                required_fields = ['title']
                for field in required_fields:
                    if field not in data:
                        return jsonify({'error': f'Missing required field: {field}'}), 400
                
                new_todo = Todo(
                    title=data['title'],
                    description=data.get('description', ''),
                    priority=data.get('priority', 2),
                    completed=False,
                    due_date=data.get('due_date'),
                    user_id=session['user_id']
                )
                
                db.session.add(new_todo)
                db.session.commit()
                
                return jsonify({'message': 'Todo created', 'id': new_todo.id})
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        elif request.method == 'PUT':
            try:
                todo = Todo.query.get(todo_id)
                if not todo or todo.user_id != session['user_id']:
                    return jsonify({'error': 'Todo not found'}), 404
                    
                if not request.is_json:
                    return jsonify({'error': 'Content-Type must be application/json'}), 400
                    
                data = request.get_json()
                if 'title' in data:
                    todo.title = data['title']
                if 'description' in data:
                    todo.description = data.get('description', '')
                if 'priority' in data:
                    todo.priority = data.get('priority', 2)
                if 'completed' in data:
                    todo.completed = data['completed']
                    if data['completed']:
                        todo.completed_at = datetime.utcnow()
                    else:
                        todo.completed_at = None
                if 'due_date' in data:
                    todo.due_date = data.get('due_date')
                    
                db.session.commit()
                
                return jsonify({'message': 'Todo updated'})
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        elif request.method == 'DELETE':
            todo = Todo.query.get(todo_id)
            if todo and todo.user_id == session['user_id']:
                db.session.delete(todo)
                db.session.commit()
                return jsonify({'message': 'Todo deleted'})
            return jsonify({'error': 'Todo not found'}), 404
    
    # Resources API
    @app.route('/api/resources', methods=['GET', 'POST'])
    @app.route('/api/resources/<int:resource_id>', methods=['GET', 'PUT', 'DELETE'])
    @login_required
    def handle_resources(resource_id=None):
        if request.method == 'GET':
            if resource_id:
                resource = StudyResource.query.get(resource_id)
                if resource and resource.user_id == session['user_id']:
                    return jsonify(resource.to_dict())
                return jsonify({'error': 'Resource not found'}), 404
            else:
                resources = StudyResource.query.filter_by(user_id=session['user_id']).all()
                return jsonify([resource.to_dict() for resource in resources])
        
        elif request.method == 'POST':
            try:
                if not request.is_json:
                    return jsonify({'error': 'Content-Type must be application/json'}), 400
                    
                data = request.get_json()
                required_fields = ['title', 'resource_type']
                for field in required_fields:
                    if field not in data:
                        return jsonify({'error': f'Missing required field: {field}'}), 400
                
                new_resource = StudyResource(
                    title=data['title'],
                    description=data.get('description', ''),
                    url=data.get('url', ''),
                    resource_type=data['resource_type'],
                    subject=data.get('subject', ''),
                    user_id=session['user_id']
                )
                
                db.session.add(new_resource)
                db.session.commit()
                
                return jsonify({'message': 'Resource created', 'id': new_resource.id})
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        elif request.method == 'PUT':
            try:
                resource = StudyResource.query.get(resource_id)
                if not resource or resource.user_id != session['user_id']:
                    return jsonify({'error': 'Resource not found'}), 404
                    
                if not request.is_json:
                    return jsonify({'error': 'Content-Type must be application/json'}), 400
                    
                data = request.get_json()
                if 'title' in data:
                    resource.title = data['title']
                if 'description' in data:
                    resource.description = data.get('description', '')
                if 'url' in data:
                    resource.url = data.get('url', '')
                if 'resource_type' in data:
                    resource.resource_type = data['resource_type']
                if 'subject' in data:
                    resource.subject = data.get('subject', '')
                    
                db.session.commit()
                
                return jsonify({'message': 'Resource updated'})
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        elif request.method == 'DELETE':
            resource = StudyResource.query.get(resource_id)
            if resource and resource.user_id == session['user_id']:
                db.session.delete(resource)
                db.session.commit()
                return jsonify({'message': 'Resource deleted'})
            return jsonify({'error': 'Resource not found'}), 404
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})
    
    # Error handlers
    @app.errorhandler(404)
    def not_found_error(error):
        return render_template('404.html'), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return render_template('500.html'), 500
    
    return app

# For development
if __name__ == '__main__':
    app = create_app('development')
    
    with app.app_context():
        db.create_all()
    
    app.run(debug=True, port=5001, host='0.0.0.0')