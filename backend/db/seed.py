from backend.db.connection import get_connection

def seed_db():
    conn = get_connection()
    print("Database initialized successfully!")

if __name__ == "__main__":
    seed_db()
