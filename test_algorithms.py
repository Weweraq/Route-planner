import pytest
from algorithms import find_route

def test_find_route_basic():
    # Praha (1) -> Brno (2) v demo datech
    result = find_route(1, 2)
    assert result is not None
    assert result['route'][0] == 1
    assert result['route'][-1] == 2
    assert result['distance'] > 0
    assert result['time'] > 0

def test_find_route_no_path():
    # Neexistující cesta (např. mezi neexistujícími body)
    result = find_route(999, 1000)
    assert result is None
