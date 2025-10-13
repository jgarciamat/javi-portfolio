from fastapi import FastAPI, HTTPException
from typing import List
from pydantic import BaseModel

app = FastAPI()

class NewsItem(BaseModel):
    title: str
    url: str
    summary: str

news_items: List[NewsItem] = []

@app.get("/news")
async def get_news() -> List[NewsItem]:
    return news_items

@app.post("/news")
async def add_news(item: NewsItem) -> NewsItem:
    news_items.append(item)
    return item