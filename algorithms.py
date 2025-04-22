from collections import defaultdict
import heapq
from db import get_edges_raw, get_edge_between

from datetime import datetime, timedelta

def find_route(start, end, mode='distance', use_highways=True, departure_time=None):
    edges = get_edges_raw()
    graph = defaultdict(list)
    # Pokud se mají dálnice ignorovat, vyřadíme hrany s dálnicemi (toll==1)
    filtered_edges = []
    for eid, f, t, dist, tm, toll in edges:
        if use_highways or not toll:
            filtered_edges.append((eid, f, t, dist, tm, toll))
    for eid, f, t, dist, tm, toll in filtered_edges:
        graph[f].append({'to': t, 'distance': dist, 'time': tm, 'toll': toll})
        graph[t].append({'to': f, 'distance': dist, 'time': tm, 'toll': toll})
    # Rozhodnutí podle režimu
    cost_key = 'distance' if mode == 'distance' else 'time'
    queue = [(0, start, [])]
    visited = set()
    path = []
    while queue:
        cost, node, curr_path = heapq.heappop(queue)
        if node == end:
            path = curr_path
            break
        if node in visited:
            continue
        visited.add(node)
        for edge in graph[node]:
            if edge['to'] not in visited:
                heapq.heappush(queue, (cost + edge[cost_key], edge['to'], curr_path + [node]))
    else:
        return None
    # Sestavení detailů trasy
    full_path = path + [end]
    total_dist = 0
    total_time = 0
    tolls = 0
    for i in range(len(full_path)-1):
        edge_data = get_edge_between(full_path[i], full_path[i+1])
        if edge_data:
            d, t, toll = edge_data
            total_dist += d
            total_time += t
            tolls += toll
    # Výpočet ETA
    eta = None
    if departure_time is not None:
        try:
            dep_dt = datetime.strptime(departure_time, '%Y-%m-%dT%H:%M')
            eta_dt = dep_dt + timedelta(minutes=total_time)
            eta = eta_dt.strftime('%Y-%m-%d %H:%M')
        except Exception:
            eta = None
    return {
        'route': full_path,
        'distance': total_dist,
        'time': total_time,
        'tolls': tolls,
        'eta': eta
    }
