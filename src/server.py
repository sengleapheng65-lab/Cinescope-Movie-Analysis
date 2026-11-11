"""Flask application for the CineScope movie research dashboard."""

from __future__ import annotations

from pathlib import Path

import pandas as pd
from flask import Flask, jsonify, request, send_from_directory

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "movies.csv"
WEB_PATH = ROOT / "web"

app = Flask(__name__, static_folder=str(WEB_PATH), static_url_path="/web")


def load_movies() -> pd.DataFrame:
    # Load the CSV on each request so newly collected data is immediately visible.
    movies = pd.read_csv(DATA_PATH).fillna("")
    ratings = pd.to_numeric(movies["rating"], errors="coerce").fillna(0)
    votes = pd.to_numeric(movies["vote_count"], errors="coerce").fillna(0)
    movies["rating"] = ratings
    movies["vote_count"] = votes
    movies["release_year"] = pd.to_numeric(movies["release_year"], errors="coerce").fillna(0).astype(int)
    global_mean = ratings.mean() if len(movies) else 0
    minimum_votes = 50_000
    # Bayesian consensus balances rating quality with confidence from vote count.
    movies["consensus"] = (votes / (votes + minimum_votes)) * ratings + (minimum_votes / (votes + minimum_votes)) * global_mean
    return movies


@app.get("/")
def home():
    return send_from_directory(WEB_PATH, "index.html")


@app.get("/api/movies")
def movies_api():
    # This endpoint handles catalog search, filters, sorting, and pagination.
    movies = load_movies()
    search = request.args.get("search", "").strip().lower()
    genre = request.args.get("genre", "").strip()
    min_rating = float(request.args.get("min_rating", 0) or 0)
    year_from = int(request.args.get("year_from", 0) or 0)
    sort = request.args.get("sort", "consensus")
    page = max(1, int(request.args.get("page", 1) or 1))
    page_size = min(100, max(1, int(request.args.get("page_size", 24) or 24)))

    # Apply filters before pagination so total_pages describes the filtered set.
    if search:
        movies = movies[
            movies["title"].str.lower().str.contains(search, na=False)
            | movies["director"].str.lower().str.contains(search, na=False)
        ]
    if genre:
        movies = movies[movies["genres"].str.contains(genre, na=False)]
    if min_rating:
        movies = movies[movies["rating"] >= min_rating]
    if year_from:
        movies = movies[movies["release_year"] >= year_from]

    # Map public query names to dataframe columns.
    sort_columns = {"consensus": "consensus", "rating": "rating", "votes": "vote_count", "vote_count": "vote_count", "popularity": "popularity", "year": "release_year", "title": "title"}
    sort_column = sort_columns.get(sort, "consensus")
    movies = movies.sort_values(sort_column, ascending=sort_column == "title")
    total_count = len(movies)
    total_pages = max(1, (total_count + page_size - 1) // page_size)
    page = min(page, total_pages)
    start = (page - 1) * page_size
    payload = movies.iloc[start:start + page_size].to_dict(orient="records")
    return jsonify({"count": len(payload), "total_count": total_count, "page": page, "page_size": page_size, "total_pages": total_pages, "movies": payload})


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "dataset": str(DATA_PATH.name), "records": len(load_movies())})


@app.get("/api/analytics")
def analytics_api():
    # Return aggregate data for the dashboard's Python/Pandas charts.
    movies = load_movies()
    decade_data = movies.assign(decade=(movies["release_year"] // 10 * 10)).groupby("decade", as_index=False).agg(
        average_rating=("rating", "mean"), movie_count=("title", "count")
    )
    genre_rows = movies.assign(genre=movies["genres"].str.split(", ")).explode("genre")
    genre_data = genre_rows.groupby("genre", as_index=False).agg(
        average_rating=("rating", "mean"), movie_count=("title", "count")
    ).sort_values("movie_count", ascending=False)
    return jsonify({
        "decades": decade_data.round(2).to_dict(orient="records"),
        "genres": genre_data.round(2).to_dict(orient="records"),
    })


@app.get("/api/recommendations")
def recommendations_api():
    # Generate explainable recommendations from genre overlap, rating, and release era.
    title = request.args.get("title", "").strip().lower()
    movies = load_movies()
    if not title:
        return jsonify({"error": "title is required"}), 400
    matches = movies[movies["title"].str.lower().str.contains(title, na=False)]
    if matches.empty:
        return jsonify({"recommendations": []})
    selected = matches.iloc[0]
    selected_genres = set(str(selected["genres"]).split(", "))
    candidates = movies[movies["title"] != selected["title"]].copy()
    candidates["genre_overlap"] = candidates["genres"].apply(lambda value: len(selected_genres.intersection(set(str(value).split(", ")))))
    candidates["similarity"] = candidates["genre_overlap"] * 4 + candidates["rating"] - (candidates["release_year"] - selected["release_year"]).abs() / 40
    results = candidates.sort_values("similarity", ascending=False).head(5)
    return jsonify({"source": selected["title"], "recommendations": results.to_dict(orient="records")})


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=8000)
