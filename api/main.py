
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from src.ddd.application.news_service import get_relevant_news


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/news", response_model=List[dict])
def get_news():
    news_items = get_relevant_news()
    return [item.to_dict() for item in news_items]
