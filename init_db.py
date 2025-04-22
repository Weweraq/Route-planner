import sqlite3

conn = sqlite3.connect('places.db')
c = conn.cursor()

# Vytvoření tabulek
c.execute('''CREATE TABLE IF NOT EXISTS places (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    x REAL NOT NULL,
    y REAL NOT NULL
)''')
c.execute('''CREATE TABLE IF NOT EXISTS edges (
    id INTEGER PRIMARY KEY,
    from_id INTEGER,
    to_id INTEGER,
    distance REAL,
    time REAL,
    toll INTEGER,
    FOREIGN KEY(from_id) REFERENCES places(id),
    FOREIGN KEY(to_id) REFERENCES places(id)
)''')

# Ukázková data (3 body, 3 silnice)
places = [
    (1, 'Praha', 0.2, 0.3),
    (2, 'Brno', 0.8, 0.7),
    (3, 'Hradec Králové', 0.5, 0.2)
]
edges = [
    (1, 1, 2, 200, 120, 1), # Praha-Brno
    (2, 1, 3, 100, 60, 0),  # Praha-Hradec
    (3, 3, 2, 150, 90, 0)   # Hradec-Brno
]
c.executemany('INSERT OR REPLACE INTO places VALUES (?, ?, ?, ?)', places)
c.executemany('INSERT OR REPLACE INTO edges VALUES (?, ?, ?, ?, ?, ?)', edges)

conn.commit()
conn.close()
print('Databáze inicializována.')
