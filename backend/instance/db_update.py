import sqlite3

conn = sqlite3.connect("app.db")
cur = conn.cursor()

cur.execute("ALTER TABLE routes ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;")
cur.execute("ALTER TABLE routes ADD COLUMN deleted_at DATETIME NULL;")

conn.commit()
conn.close()

print("✅ Columns added successfully")
