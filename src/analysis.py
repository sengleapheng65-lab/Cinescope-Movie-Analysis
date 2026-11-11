"""Create starter summaries and charts from the CineScope movie dataset."""

from __future__ import annotations

import argparse
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=Path("data/movies.csv"))
    parser.add_argument("--output-dir", type=Path, default=Path("outputs"))
    args = parser.parse_args()

    movies = pd.read_csv(args.input)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    genre_rows = movies.assign(genre=movies["genres"].str.split(", ")).explode("genre")
    genre_summary = genre_rows.groupby("genre", as_index=False).agg(
        average_rating=("rating", "mean"), movie_count=("title", "count")
    ).sort_values("average_rating", ascending=False)
    genre_summary.to_csv(args.output_dir / "genre_summary.csv", index=False)

    plt.figure(figsize=(9, 5))
    plt.bar(genre_summary["genre"], genre_summary["average_rating"], color="#2563eb")
    plt.title("Average Movie Rating by Genre")
    plt.xlabel("Genre")
    plt.ylabel("Average rating")
    plt.ylim(0, 10)
    plt.xticks(rotation=35, ha="right")
    plt.tight_layout()
    plt.savefig(args.output_dir / "average_rating_by_genre.png", dpi=150)
    plt.close()
    print(f"Saved analysis outputs to {args.output_dir}")


if __name__ == "__main__":
    main()
