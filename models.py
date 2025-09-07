from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

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
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'start': self.start_time,
            'end': self.end_time,
            'description': self.description,
            'color': self.color,
            'day_of_week': self.day_of_week,
            'specific_date': self.specific_date,
            'is_recurring': self.is_recurring,
            'recurrence_pattern': self.recurrence_pattern,
            'recurrence_end_date': self.recurrence_end_date
        }