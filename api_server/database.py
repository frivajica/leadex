import sqlite3
import json
import os
from datetime import datetime
from typing import Optional, List
from contextlib import contextmanager

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/leads.db")
DATABASE_PATH = DATABASE_URL.replace("sqlite:///", "")

os.makedirs(os.path.dirname(os.path.abspath(DATABASE_PATH)) or ".", exist_ok=True)


def get_db():
    """Get database connection."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def get_db_cursor():
    """Get database cursor with automatic commit."""
    conn = get_db()
    try:
        cursor = conn.cursor()
        yield cursor
        conn.commit()
    finally:
        conn.close()


def init_db():
    """Initialize database tables."""
    with get_db_cursor() as cursor:
        # Users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT,
                subscription_tier TEXT DEFAULT 'free',
                subscription_expires_at TEXT,
                job_credits INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)

        # Migration: Add password_hash column if it doesn't exist
        try:
            cursor.execute("SELECT password_hash FROM users LIMIT 1")
        except sqlite3.OperationalError:
            cursor.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")

        # Migration: Add subscription columns if they don't exist
        try:
            cursor.execute("SELECT subscription_tier FROM users LIMIT 1")
        except sqlite3.OperationalError:
            cursor.execute("ALTER TABLE users ADD COLUMN subscription_tier TEXT DEFAULT 'free'")
            cursor.execute("ALTER TABLE users ADD COLUMN subscription_expires_at TEXT")
            cursor.execute("ALTER TABLE users ADD COLUMN job_credits INTEGER DEFAULT 0")

        # API keys table (user's own Google Maps API keys)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS api_keys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                key_name TEXT NOT NULL,
                api_key TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        # Jobs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                status TEXT DEFAULT 'queued',
                center_lat REAL NOT NULL,
                center_lng REAL NOT NULL,
                center_address TEXT,
                categories TEXT,
                radius INTEGER DEFAULT 5000,
                min_rating REAL DEFAULT 4.0,
                min_reviews INTEGER DEFAULT 10,
                min_photos INTEGER DEFAULT 3,
                use_quality_filters INTEGER DEFAULT 0,
                sort_by TEXT DEFAULT 'score',
                progress INTEGER DEFAULT 0,
                total_businesses INTEGER DEFAULT 0,
                leads_found INTEGER DEFAULT 0,
                error_message TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                completed_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        # Results table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id INTEGER NOT NULL,
                data TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
            )
        """)

        # Magic links table for auth
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS magic_links (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token TEXT UNIQUE NOT NULL,
                expires_at TEXT NOT NULL,
                used_at TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)


def create_user(email: str) -> int:
    """Create a new user."""
    now = datetime.utcnow().isoformat()
    with get_db_cursor() as cursor:
        cursor.execute(
            "INSERT INTO users (email, created_at, updated_at) VALUES (?, ?, ?)",
            (email, now, now)
        )
        return cursor.lastrowid


def get_user_by_email(email: str) -> Optional[dict]:
    """Get user by email."""
    with get_db_cursor() as cursor:
        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_user_by_id(user_id: int) -> Optional[dict]:
    """Get user by ID."""
    with get_db_cursor() as cursor:
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def update_user_password(user_id: int, password_hash: str) -> bool:
    """Update user's password hash."""
    now = datetime.utcnow().isoformat()
    with get_db_cursor() as cursor:
        cursor.execute(
            "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
            (password_hash, now, user_id)
        )
        return cursor.rowcount > 0


def update_user_subscription(user_id: int, tier: str) -> bool:
    """Update user's subscription or job credits after payment."""
    from datetime import timedelta
    now = datetime.utcnow()
    
    with get_db_cursor() as cursor:
        if tier == "single":
            # Add one job credit
            cursor.execute(
                "UPDATE users SET job_credits = job_credits + 1, updated_at = ? WHERE id = ?",
                (now.isoformat(), user_id)
            )
        elif tier == "week":
            expires = (now + timedelta(days=7)).isoformat()
            cursor.execute(
                "UPDATE users SET subscription_tier = ?, subscription_expires_at = ?, updated_at = ? WHERE id = ?",
                ("week", expires, now.isoformat(), user_id)
            )
        elif tier == "month":
            expires = (now + timedelta(days=30)).isoformat()
            cursor.execute(
                "UPDATE users SET subscription_tier = ?, subscription_expires_at = ?, updated_at = ? WHERE id = ?",
                ("month", expires, now.isoformat(), user_id)
            )
        return cursor.rowcount > 0

def use_job_credit(user_id: int) -> bool:
    """Consume one job credit if the user has any. Returns True if successful."""
    now = datetime.utcnow().isoformat()
    with get_db_cursor() as cursor:
        cursor.execute(
            "UPDATE users SET job_credits = job_credits - 1, updated_at = ? WHERE id = ? AND job_credits > 0",
            (now, user_id)
        )
        return cursor.rowcount > 0


def create_api_key(user_id: int, key_name: str, api_key: str) -> int:
    """Create a new API key for a user."""
    now = datetime.utcnow().isoformat()
    with get_db_cursor() as cursor:
        cursor.execute(
            "INSERT INTO api_keys (user_id, key_name, api_key, created_at) VALUES (?, ?, ?, ?)",
            (user_id, key_name, api_key, now)
        )
        return cursor.lastrowid


def get_api_keys(user_id: int) -> List[dict]:
    """Get all API keys for a user."""
    with get_db_cursor() as cursor:
        cursor.execute(
            "SELECT id, key_name, is_active, created_at FROM api_keys WHERE user_id = ?",
            (user_id,)
        )
        return [dict(row) for row in cursor.fetchall()]


def get_active_api_key(user_id: int) -> Optional[str]:
    """Get the first active API key for a user."""
    with get_db_cursor() as cursor:
        cursor.execute(
            "SELECT api_key FROM api_keys WHERE user_id = ? AND is_active = 1 LIMIT 1",
            (user_id,)
        )
        row = cursor.fetchone()
        return row["api_key"] if row else None


def delete_api_key(user_id: int, key_id: int) -> bool:
    """Delete an API key."""
    with get_db_cursor() as cursor:
        cursor.execute(
            "DELETE FROM api_keys WHERE id = ? AND user_id = ?",
            (key_id, user_id)
        )
        return cursor.rowcount > 0


def create_job(
    user_id: int,
    name: str,
    center_lat: float,
    center_lng: float,
    center_address: str = None,
    categories: List[str] = None,
    radius: int = 5000,
    min_rating: float = 4.0,
    min_reviews: int = 10,
    min_photos: int = 3,
    use_quality_filters: bool = False,
    sort_by: str = "score",
) -> int:
    """Create a new job."""
    now = datetime.utcnow().isoformat()
    categories_json = json.dumps(categories) if categories else None

    with get_db_cursor() as cursor:
        cursor.execute(
            """INSERT INTO jobs (
                user_id, name, center_lat, center_lng, center_address,
                categories, radius, min_rating, min_reviews, min_photos,
                use_quality_filters, sort_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id, name, center_lat, center_lng, center_address,
                categories_json, radius, min_rating, min_reviews, min_photos,
                1 if use_quality_filters else 0, sort_by, now, now
            )
        )
        return cursor.lastrowid


def get_job(job_id: int, user_id: int = None) -> Optional[dict]:
    """Get a job by ID."""
    with get_db_cursor() as cursor:
        if user_id:
            cursor.execute("SELECT * FROM jobs WHERE id = ? AND user_id = ?", (job_id, user_id))
        else:
            cursor.execute("SELECT * FROM jobs WHERE id = ?", (job_id,))
        row = cursor.fetchone()
        if row:
            result = dict(row)
            if result.get("categories"):
                result["categories"] = json.loads(result["categories"])
            return result
        return None


def get_jobs(user_id: int, limit: int = 50, offset: int = 0) -> List[dict]:
    """Get all jobs for a user."""
    with get_db_cursor() as cursor:
        cursor.execute(
            """SELECT id, name, status, progress, total_businesses, leads_found,
                      created_at, updated_at, completed_at
               FROM jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?""",
            (user_id, limit, offset)
        )
        return [dict(row) for row in cursor.fetchall()]


def count_jobs(user_id: int) -> int:
    """Count total jobs for a user."""
    with get_db_cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM jobs WHERE user_id = ?", (user_id,))
        return cursor.fetchone()[0]


def update_job_status(
    job_id: int,
    status: str,
    progress: int = None,
    total_businesses: int = None,
    leads_found: int = None,
    error_message: str = None,
) -> bool:
    """Update job status."""
    now = datetime.utcnow().isoformat()
    updates = ["status = ?", "updated_at = ?"]
    values = [status, now]

    if progress is not None:
        updates.append("progress = ?")
        values.append(progress)
    if total_businesses is not None:
        updates.append("total_businesses = ?")
        values.append(total_businesses)
    if leads_found is not None:
        updates.append("leads_found = ?")
        values.append(leads_found)
    if error_message is not None:
        updates.append("error_message = ?")
        values.append(error_message)
    if status == "completed":
        updates.append("completed_at = ?")
        values.append(now)

    values.append(job_id)

    with get_db_cursor() as cursor:
        cursor.execute(
            f"UPDATE jobs SET {', '.join(updates)} WHERE id = ?",
            values
        )
        return cursor.rowcount > 0


def delete_job(job_id: int, user_id: int) -> bool:
    """Delete a job."""
    with get_db_cursor() as cursor:
        cursor.execute("DELETE FROM jobs WHERE id = ? AND user_id = ?", (job_id, user_id))
        return cursor.rowcount > 0


def create_result(job_id: int, data: List[dict]) -> int:
    """Create results for a job."""
    now = datetime.utcnow().isoformat()
    data_json = json.dumps(data)

    with get_db_cursor() as cursor:
        cursor.execute(
            "INSERT INTO results (job_id, data, created_at) VALUES (?, ?, ?)",
            (job_id, data_json, now)
        )
        return cursor.lastrowid


def get_result(job_id: int) -> Optional[List[dict]]:
    """Get results for a job."""
    with get_db_cursor() as cursor:
        cursor.execute("SELECT data FROM results WHERE job_id = ?", (job_id,))
        row = cursor.fetchone()
        if row:
            return json.loads(row["data"])
        return None


def create_magic_link(user_id: int, token: str, expires_at: datetime) -> int:
    """Create a magic link for authentication."""
    now = datetime.utcnow().isoformat()
    with get_db_cursor() as cursor:
        cursor.execute(
            "INSERT INTO magic_links (user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)",
            (user_id, token, expires_at.isoformat(), now)
        )
        return cursor.lastrowid


def get_magic_link(token: str) -> Optional[dict]:
    """Get a magic link by token."""
    with get_db_cursor() as cursor:
        cursor.execute(
            "SELECT * FROM magic_links WHERE token = ? AND used_at IS NULL",
            (token,)
        )
        row = cursor.fetchone()
        return dict(row) if row else None


def use_magic_link(token: str) -> bool:
    """Mark a magic link as used."""
    now = datetime.utcnow().isoformat()
    with get_db_cursor() as cursor:
        cursor.execute(
            "UPDATE magic_links SET used_at = ? WHERE token = ?",
            (now, token)
        )
        return cursor.rowcount > 0


init_db()
