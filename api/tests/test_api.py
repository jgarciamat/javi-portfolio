from typing import List, Dict, Any
from fastapi.testclient import TestClient
from api.main import app
from src.ddd.domain.news import NewsItem

client = TestClient(app)

def test_get_news():
    response = client.get("/news")
    assert response.status_code == 200
    news: List[Dict[str, Any]] = response.json()
    assert len(news) > 0
    for item in news:
        assert "title" in item
        assert "url" in item
        assert "summary" in item