# CineScope: Movie Ratings and Recommendation Analysis

## Authors

- Author #1: Leapheng Seng — `sengleapheng65-lab`
- Author #2: Ethan Nguyen — `ethansnnguyen`

## Project Description

CineScope is a data analysis project that explores movie ratings, genres, popularity, and release years. The project will collect movie information from a public movie API or dataset. Users will be able to explore movie information and identify highly rated or popular films. The collected data will be analyzed to find trends and relationships between movie characteristics and ratings. CineScope will present the results through clear charts and visualizations to help users discover movies and understand movie trends.

## Project Outline/Plan

- Create a simple and responsive homepage introducing the project
- Collect and access movie data
- Allow filtering by Genre, Release Year, Rating, Popularity, etc.
- Display search results in an organized format
- Include charts and graphs summarizing movie trends.
- Create a responsive results page that will display movie information, charts, graphs, etc. 

### Interface Plan

The interface will include a homepage that introduces the CineScope project. Users will be able to search for movies and filter results by genre, release year, rating, and popularity. A results page will display movie information in an organized format. The project will also include charts and graphs that summarize movie ratings and trends. The interface will be designed to be simple, clear, and responsive on different screen sizes.

### Data Collection and Storage Plan

*Written by Author #1: Leapheng Seng*

We will collect movie data from a public movie API or dataset. The data will include movie titles, genres, release dates, ratings, vote counts, popularity scores, and descriptions. We will use Python to request and process the data. The information will be stored in CSV or JSON format. Before storing the data, we will remove duplicate records, check missing values, and organize the fields so they can be analyzed efficiently.

### Data Analysis and Visualization Plan

*Written by Author #2: Ethan Nguyen*

We will analyze the movie data using Python libraries and packages. The analysis will compare movie ratings across genres, release years, and popularity levels. We will create bar charts showing the highest-rated genres, line graphs showing rating trends over time, and scatter plots comparing popularity with ratings. We will also identify the most popular and highest-rated movies in the dataset. 

## Technologies

- Python
- Pandas
- Matplotlib
- JavaScript
- HTML and CSS
- Public movie API or dataset

## Getting Started

Install the Python dependencies, create a local sample dataset, and generate the first chart:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m src.data_collection --sample
python -m src.analysis
```

The sample workflow writes `data/movies.csv` and analysis results to `outputs/`.

For live data, create a TMDB API Read Access Token and set it in your shell:

```bash
export TMDB_API_TOKEN="your-token-here"
python -m src.data_collection --pages 2
```

API credentials should never be committed to the repository.

Run the Python dashboard server with:

```bash
python -m src.server
```

Then open <http://127.0.0.1:8000/>. The Flask API serves the movie dataset at `/api/movies` and reports its status at `/api/health`. It supports queries such as `/api/movies?search=nolan&min_rating=8&sort=consensus`.

Additional Python endpoints include `/api/analytics` for decade and genre summaries and `/api/recommendations?title=Interstellar` for similar-film recommendations.

## Dataset Fields

The generated movie dataset includes:

- `title`, `genres`, and `overview`
- `release_year` and `runtime`
- `rating`, `vote_count`, and `popularity`
- `director` and `poster_path`

The dashboard calculates a Bayesian consensus ranking from rating and vote count.

## Data Attribution

Movie metadata and poster paths are supplied by [TMDB](https://www.themoviedb.org/). CineScope uses the TMDB API but is not endorsed or certified by TMDB. When the live dataset is used, retain appropriate TMDB attribution and follow the [TMDB API terms](https://www.themoviedb.org/api-terms-of-use).

## License

This project is licensed under the MIT License.
