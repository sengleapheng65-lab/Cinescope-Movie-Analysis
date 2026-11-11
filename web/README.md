# CineScope web interface

From the project root, generate sample data and serve the site:

```bash
python -m src.data_collection --sample
python -m http.server 8000
```

Open <http://localhost:8000/web/>. The interface loads `data/movies.csv` when available and falls back to a small built-in sample dataset.
