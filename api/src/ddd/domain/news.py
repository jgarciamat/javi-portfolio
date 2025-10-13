from typing import List

class NewsItem:
    def __init__(self, title: str, url: str, summary: str):
        self.title = title
        self.url = url
        self.summary = summary

    def to_dict(self):
        return {
            "title": self.title,
            "url": self.url,
            "summary": self.summary
        }

# Aquí podrías agregar lógica de dominio, validaciones, entidades, etc.