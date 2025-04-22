import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'places.db')

def get_connection():
    return sqlite3.connect(DB_PATH)

def get_places():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute('SELECT id, name, x, y FROM places')
    places = [dict(id=row[0], name=row[1], x=row[2], y=row[3]) for row in cur.fetchall()]
    conn.close()
    return places

def get_edges():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute('SELECT id, from_id, to_id, distance, time, toll FROM edges')
    edges = [dict(id=row[0], from_id=row[1], to_id=row[2], distance=row[3], time=row[4], toll=row[5]) for row in cur.fetchall()]
    conn.close()
    return edges

def search_places(q):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute('SELECT id, name FROM places WHERE name LIKE ?', (f'%{q}%',))
    results = [{'id': row[0], 'name': row[1]} for row in cur.fetchall()]
    conn.close()
    return results

def get_edges_raw():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute('SELECT id, from_id, to_id, distance, time, toll FROM edges')
    edges = cur.fetchall()
    conn.close()
    return edges

def get_edge_between(from_id, to_id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute('SELECT distance, time, toll FROM edges WHERE (from_id=? AND to_id=?) OR (from_id=? AND to_id=?)', (from_id, to_id, to_id, from_id))
    result = cur.fetchone()
    conn.close()
    return result
