from typing import List, Dict, Any
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_get_empty_news() -> None:
    response = client.get("/news")
    assert response.status_code == 200
    assert response.json() == []

def test_add_and_get_news() -> None:
    test_news = {
        "title": "Test News",
        "url": "https://test.com",
        "summary": "Test summary"
    }
    
    # Add news
    response = client.post("/news", json=test_news)
    assert response.status_code == 200
    assert response.json() == test_news
    
    # Get news
    response = client.get("/news")
    assert response.status_code == 200
    news = response.json()
    assert len(news) == 1
    assert news[0] == test_news