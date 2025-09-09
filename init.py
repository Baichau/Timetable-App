# init.py - Database initialization script
from app import app, db
from app import User  # Import User from app instead of models
from werkzeug.security import generate_password_hash

print("🧹 Creating clean database...")

with app.app_context():
    # Drop all tables and recreate them
    db.drop_all()
    db.create_all()
    print("✅ Database tables created successfully!")
    
    # Create a test user
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