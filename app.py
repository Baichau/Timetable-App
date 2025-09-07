from flask import Flask, render_template, request, jsonify
from models import db, Event
from datetime import datetime
import json

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///events.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/events', methods=['GET', 'POST', 'DELETE'])
def handle_events():
    if request.method == 'GET':
        events = Event.query.all()
        events_list = []
        for event in events:
            events_list.append(event.to_dict())
        return jsonify(events_list)
    
    elif request.method == 'POST':
        try:
            if not request.is_json:
                return jsonify({'error': 'Content-Type must be application/json'}), 400
                
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No JSON data received'}), 400
                
            print("📨 Received data:", data)
            
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
            print("✅ Event created successfully, ID:", new_event.id)
            return jsonify({'message': 'Event created', 'id': new_event.id})
            
        except Exception as e:
            print("❌ Error creating event:", str(e))
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

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    import sys
    port = 5001
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Invalid port: {sys.argv[1]}. Using default port 5001")
    
    print(f"🚀 Starting server on port {port}...")
    print(f"📋 Open: http://localhost:{port}")
    app.run(debug=True, port=port, host='0.0.0.0')