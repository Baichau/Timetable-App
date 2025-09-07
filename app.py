# app.py - FOR PRODUCTION (when you have templates ready)
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from models import db, Event, User, FocusSession
from datetime import datetime, timedelta
import json
import time
from flask_cors import CORS
import os

app = Flask(__name__)

# Configuration - use environment variables for production
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///events.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-here-change-in-production')

# Security headers for production
@app.after_request
def after_request(response):
    response.headers.add('X-Content-Type-Options', 'nosniff')
    response.headers.add('X-Frame-Options', 'SAMEORIGIN')
    response.headers.add('X-XSS-Protection', '1; mode=block')
    return response

db.init_app(app)
CORS(app)

# All routes for complete application
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/timetable')
def timetable():
    return render_template('timetable.html')

@app.route('/focus-timer')
def focus_timer():
    return render_template('focus-timer.html')

@app.route('/focus-time')  # Redirect for backward compatibility
def focus_time():
    return redirect(url_for('focus_timer'))

@app.route('/resources')
def resources():
    return render_template('resources.html')

# API Routes
@app.route('/api/events', methods=['GET', 'POST', 'DELETE'])
def handle_events():
    if request.method == 'GET':
        events = Event.query.all()
        return jsonify([event.to_dict() for event in events])
    
    elif request.method == 'POST':
        try:
            if not request.is_json:
                return jsonify({'error': 'Content-Type must be application/json'}), 400
                
            data = request.get_json()
            required_fields = ['title', 'start', 'end']
            for field in required_fields:
                if field not in data:
                    return jsonify({'error': f'Missing required field: {field}'}), 400
            
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
                recurrence_end_date=data.get('recurrence_end_date')
            )
            
            db.session.add(new_event)
            db.session.commit()
            return jsonify({'message': 'Event created', 'id': new_event.id})
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'DELETE':
        event_id = request.args.get('id')
        if event_id:
            event = Event.query.get(event_id)
            if event:
                db.session.delete(event)
                db.session.commit()
                return jsonify({'message': 'Event deleted'})
            return jsonify({'error': 'Event not found'}), 404
        else:
            Event.query.delete()
            db.session.commit()
            return jsonify({'message': 'All events deleted'})

@app.route('/api/event/<int:event_id>', methods=['GET'])
def get_event_details(event_id):
    event = Event.query.get(event_id)
    if event:
        return jsonify(event.to_dict())
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
def create_focus_session():
    try:
        data = request.get_json()
        duration = data.get('duration', 25)
        session_type = data.get('type', 'pomodoro')
        
        new_session = FocusSession(
            duration=duration,
            session_type=session_type,
            completed=False
        )
        
        db.session.add(new_session)
        db.session.commit()
        
        return jsonify({
            'message': 'Focus session created',
            'id': new_session.id
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/focus-sessions/<int:session_id>', methods=['PUT'])
def update_focus_session(session_id):
    try:
        session = FocusSession.query.get(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
            
        data = request.get_json()
        if 'completed' in data:
            session.completed = data['completed']
            if data['completed']:
                session.completed_at = datetime.utcnow()
        if 'notes' in data:
            session.notes = data['notes']
            
        db.session.commit()
        
        return jsonify({'message': 'Session updated'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Health check endpoint for production
@app.route('/health')
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    
    # Determine if we're in production
    is_production = os.environ.get('FLASK_ENV') == 'production'
    
    if is_production:
        print("🚀 Starting PRODUCTION server")
        # For production, use a proper WSGI server like Gunicorn
        app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
    else:
        print("🔧 Starting DEVELOPMENT server on http://localhost:5001")
        app.run(debug=True, port=5001, host='0.0.0.0')