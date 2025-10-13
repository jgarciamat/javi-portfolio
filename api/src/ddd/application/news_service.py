from typing import List
from src.ddd.domain.news import NewsItem

def get_relevant_news() -> List[NewsItem]:
    # Aquí deberías implementar la lógica real de scraping o consumo de API externa
    return [
        NewsItem("Noticia 1", "https://ejemplo.com/noticia-1", "Resumen de la noticia 1."),
        NewsItem("Noticia 2", "https://ejemplo.com/noticia-2", "Resumen de la noticia 2.")
    ]
