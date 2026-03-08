import sqlite3

DB_PATH = "clinical_data.db"

# five populations in ea sample 
# used for schema and melting CSV
POPULATIONS = ["b_cell", "cd8_t_cell", "cd4_t_cell", "nk_cell", "monocyte"]

def get_connection(db_path: str = DB_PATH):
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")  # sqlite ignores FKs by default, must enable per conn
    return conn

def init_schema(conn: sqlite3.Connection):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS subjects (
            subject TEXT PRIMARY KEY,
            condition TEXT,
            age INTEGER,
            sex TEXT
        );

        -- treatment and response go on samples, not subjects
        -- a subject can have samples across multiple timepoints and projects
        -- putting these on subjects would mean one treatment/response per subject which breaks
        -- part 4 queries that need to filter by sample_type and treatment at the same time
        CREATE TABLE IF NOT EXISTS samples (
            sample TEXT PRIMARY KEY,
            subject TEXT NOT NULL,
            project TEXT,
            sample_type TEXT,
            time_from_treatment_start INTEGER,
            treatment TEXT,
            response TEXT,           -- 'yes', 'no', or NULL for healthy (no treatment)
            FOREIGN KEY (subject) REFERENCES subjects(subject)
        );

        -- one row per sample+population combo (wide CSV columns melted into rows)
        -- autoincrement id not strictly needed but keeps rows addressable if we add features later
        CREATE TABLE IF NOT EXISTS cell_counts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sample TEXT NOT NULL,
            population TEXT,
            count INTEGER,
            FOREIGN KEY (sample) REFERENCES samples(sample)
        );
    """)
    conn.commit()
