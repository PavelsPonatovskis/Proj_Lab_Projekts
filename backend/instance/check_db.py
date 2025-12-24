import sqlite3

conn = sqlite3.connect("app.db")
cur = conn.cursor()

cur.execute("PRAGMA table_info(routes);")
columns = cur.fetchall()

for col in columns:
    print(col)

conn.close()
