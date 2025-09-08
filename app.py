# app.py
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from models import db, User, Event, FocusSession, StudyResource, Todo
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///events.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key-here-change-in-production'

db.init_app(app)

# Create database tables
with app.app_context():
    db.create_all()

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
        
        # Basic validation
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
        
        # Create new user
        try:
            hashed_password = generate_password_hash(password)
            new_user = User(
                username=username, 
                email=email, 
                password_hash=hashed_password
            )
            
            db.session.add(new_user)
            db.session.commit()
            
            flash('Registration successful! Please log in.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            db.session.rollback()
            flash('An error occurred during registration. Please try again.', 'danger')
            print(f"Registration error: {str(e)}")
    
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
                start_time=data['start'],
                end_time=data['end'],
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

@app.route('/api/events/<int:event_id>', methods=['DELETE'])
@login_required
def delete_event(event_id):
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

# Health check endpoint
@app.route('/health')
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})

if __name__ == '__main__':
    app.run(debug=True, port=5001)