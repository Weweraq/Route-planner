import pytest
from db import get_places, get_edges, search_places

def test_get_places():
    places = get_places()
    assert isinstance(places, list)
    assert len(places) >= 1

def test_get_edges():
    edges = get_edges()
    assert isinstance(edges, list)
    assert len(edges) >= 1

def test_search_places():
    results = search_places('Praha')
    assert any('Praha' in p['name'] for p in results)
