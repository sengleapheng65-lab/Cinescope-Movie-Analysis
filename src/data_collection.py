"""Collect movie data from TMDB or create a small local sample dataset.

For live collection, set TMDB_API_TOKEN to a TMDB API Read Access Token.
The sample mode is useful for development and testing without credentials.
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path

import pandas as pd
import requests

API_URL = "https://api.themoviedb.org/3/discover/movie"
GENRE_NAMES = {
    12: "Adventure", 14: "Fantasy", 16: "Animation", 18: "Drama", 27: "Horror",
    28: "Action", 35: "Comedy", 36: "History", 37: "Western", 53: "Thriller",
    80: "Crime", 99: "Documentary", 878: "Science Fiction", 9648: "Mystery",
    10749: "Romance", 10751: "Family", 10752: "War", 10770: "TV Movie",
}

SAMPLE_MOVIES = [
    {"title": "The Shawshank Redemption", "genres": "Drama", "release_year": 1994, "rating": 8.7, "vote_count": 26000, "popularity": 75.2, "overview": "Two imprisoned men find hope and friendship."},
    {"title": "The Godfather", "genres": "Crime, Drama", "release_year": 1972, "rating": 8.7, "vote_count": 20000, "popularity": 82.1, "overview": "The aging patriarch of an organized crime dynasty transfers control."},
    {"title": "The Dark Knight", "genres": "Action, Crime, Drama", "release_year": 2008, "rating": 8.5, "vote_count": 32000, "popularity": 95.4, "overview": "Batman faces a criminal mastermind who plunges Gotham into chaos."},
    {"title": "Spirited Away", "genres": "Animation, Fantasy", "release_year": 2001, "rating": 8.5, "vote_count": 16000, "popularity": 88.0, "overview": "A young girl enters a world ruled by gods, witches, and spirits."},
    {"title": "Parasite", "genres": "Comedy, Drama, Thriller", "release_year": 2019, "rating": 8.5, "vote_count": 18000, "popularity": 91.3, "overview": "A struggling family schemes to become employed by a wealthy household."},
    {"title": "Interstellar", "genres": "Adventure, Drama, Science Fiction", "release_year": 2014, "rating": 8.4, "vote_count": 34000, "popularity": 104.2, "overview": "Explorers travel through a wormhole in search of a new home."},
    {"title": "Get Out", "genres": "Horror, Mystery, Thriller", "release_year": 2017, "rating": 7.6, "vote_count": 17000, "popularity": 64.8, "overview": "A young man uncovers an unsettling secret during a weekend visit."},
    {"title": "Toy Story", "genres": "Animation, Comedy, Family", "release_year": 1995, "rating": 8.0, "vote_count": 18000, "popularity": 77.5, "overview": "Toys come to life when their owner is away."},
]
SAMPLE_METADATA = {
    "The Shawshank Redemption": {"runtime": 142, "director": "Frank Darabont"},
    "The Godfather": {"runtime": 175, "director": "Francis Ford Coppola"},
    "The Dark Knight": {"runtime": 152, "director": "Christopher Nolan"},
    "Spirited Away": {"runtime": 125, "director": "Hayao Miyazaki"},
    "Parasite": {"runtime": 132, "director": "Bong Joon-ho"},
    "Interstellar": {"runtime": 169, "director": "Christopher Nolan"},
    "Get Out": {"runtime": 104, "director": "Jordan Peele"},
    "Toy Story": {"runtime": 81, "director": "John Lasseter"},
}


def sample_dataframe() -> pd.DataFrame:
    movies = pd.DataFrame(SAMPLE_MOVIES)
    movies["runtime"] = movies["title"].map(lambda title: SAMPLE_METADATA[title]["runtime"])
    movies["director"] = movies["title"].map(lambda title: SAMPLE_METADATA[title]["director"])
    movies["poster_path"] = ""
    return movies


def collect_from_tmdb(token: str, pages: int) -> pd.DataFrame:
    rows: list[dict] = []
    for page in range(1, pages + 1):
        response = requests.get(
            API_URL,
            headers={"Authorization": f"Bearer {token}"},
            params={"language": "en-US", "sort_by": "popularity.desc", "page": page},
            timeout=30,
        )
        response.raise_for_status()
        for movie in response.json().get("results", []):
            details_response = requests.get(
                f"https://api.themoviedb.org/3/movie/{movie['id']}",
                headers={"Authorization": f"Bearer {token}"},
                params={"append_to_response": "credits"},
                timeout=30,
            )
            details_response.raise_for_status()
            details = details_response.json()
            director = next(
                (person.get("name", "") for person in details.get("credits", {}).get("crew", []) if person.get("job") == "Director"),
                "",
            )
            release_date = movie.get("release_date") or ""
            rows.append(
                {
                    "title": movie.get("title", ""),
                    "genres": ", ".join(
                        GENRE_NAMES.get(genre_id, f"Genre {genre_id}")
                        for genre_id in movie.get("genre_ids", [])
                    ),
                    "release_year": release_date[:4] if release_date else None,
                    "rating": movie.get("vote_average"),
                    "vote_count": movie.get("vote_count"),
                    "popularity": movie.get("popularity"),
                    "poster_path": movie.get("poster_path", ""),
                    "runtime": details.get("runtime") or "",
                    "director": director,
                    "overview": movie.get("overview", ""),
                }
            )
    return pd.DataFrame(rows).drop_duplicates(subset=["title", "release_year"])


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sample", action="store_true", help="write sample data without an API token")
    parser.add_argument("--pages", type=int, default=1, help="number of TMDB pages to collect")
    parser.add_argument("--output", type=Path, default=Path("data/movies.csv"))
    args = parser.parse_args()

    if args.pages < 1:
        parser.error("--pages must be at least 1")
    token = os.environ.get("TMDB_API_TOKEN")
    if args.sample:
        movies = sample_dataframe()
    elif token:
        movies = collect_from_tmdb(token, args.pages)
    else:
        parser.error("Set TMDB_API_TOKEN or run with --sample")

    if "poster_path" not in movies.columns:
        movies["poster_path"] = ""

    args.output.parent.mkdir(parents=True, exist_ok=True)
    movies.to_csv(args.output, index=False)
    print(f"Saved {len(movies)} movies to {args.output}")


if __name__ == "__main__":
    main()
