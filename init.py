# clean_init.py
import os
from app import app, db

print("🧹 Creating clean database...")

with app.app_context():
    # Create all tables from scratch
    db.create_all()
    print("✅ Database tables created successfully!")
    
    # Create a test user
    from models import User
    from werkzeug.security import generate_password_hash
    
    test_user = User(
        username='testuser',
        email='test@edufocus.com',
        password_hash=generate_password_hash('testpass')
    )
    db.session.add(test_user)
    db.session.commit()
    print("✅ Test user created:")
    print("   Username: testuser")
    print("   Password: testpass")