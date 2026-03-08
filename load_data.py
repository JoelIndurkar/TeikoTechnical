import pandas as pd
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
from db import get_connection, init_schema, POPULATIONS, DB_PATH

CSV_PATH = "cell-count.csv"

def load_data(csv_path: str = CSV_PATH, db_path: str = DB_PATH):
    df = pd.read_csv(csv_path)
    conn = get_connection(db_path)
    init_schema(conn)

    
    conn.executescript("""
        DELETE FROM cell_counts;
        DELETE FROM samples;
        DELETE FROM subjects;
    """) # delete in FK order so constraints don't fire - makes this idempotent (safe to re-run)

    # subjects: CSV has 1 row/sample so drop_duplicates before inserting
    subjects = df.drop_duplicates(subset="subject")[
        ["subject", "condition", "age", "sex"]
    ]
    subjects.to_sql("subjects", conn, if_exists="append", index=False)

    # samples: treatment and response go here (not subjects)
    samples = df.drop_duplicates(subset="sample")[
        ["sample", "subject", "project", "sample_type", "time_from_treatment_start", "treatment", "response"]
    ]
    samples.to_sql("samples", conn, if_exists="append", index=False)

    # cell_counts: melt wide pop cols -> rows
    # in: 1 row/sample with 5 pop cols
    # out: 5 rows/sample ea w/ pop + count
    melted = df[["sample"] + POPULATIONS].melt(
        id_vars="sample", var_name="population", value_name="count"
    )
    melted.to_sql("cell_counts", conn, if_exists="append", index=False)

    conn.commit()
    conn.close()

    print(f"loaded {len(df)} rows into {db_path}")
    print(f"  {len(subjects)} subjects, {len(samples)} samples, {len(melted)} cell count rows")


if __name__ == "__main__":
    load_data()
