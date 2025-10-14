from typing import List
from src.ddd.domain.news import NewsItem

def get_relevant_news() -> List[NewsItem]:
    # Aquí deberías implementar la lógica real de scraping o consumo de API externa
    return [
        NewsItem("Noticia 1", "https://ejemplo.com/noticia-1", "Resumen de la noticia 1."),
        NewsItem("Noticia 2", "https://ejemplo.com/noticia-2", "Resumen de la noticia 2."),
        NewsItem("Noticia 3", "https://ejemplo.com/noticia-3", "Resumen de la noticia 3."),
        NewsItem("Noticia 4", "https://ejemplo.com/noticia-4", "Resumen de la noticia 4."),
        NewsItem("Noticia 5", "https://ejemplo.com/noticia-5", "Resumen de la noticia 5."),
        NewsItem("Noticia 6", "https://ejemplo.com/noticia-6", "Resumen de la noticia 6.")
    ]
