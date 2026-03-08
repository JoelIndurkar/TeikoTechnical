import sqlite3
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from scipy import stats

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "clinical_data.db"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # to access cols by name
    return conn


@app.get("/api/summary")
def get_summary(): # for ea sample, compute total count then ea population's count and %
    conn = get_db()
    try:
        # subquery gets per sample tots
        # join to get ea pop's share
        rows = conn.execute("""
            SELECT
                cc.sample,
                totals.total_count,
                cc.population,
                cc.count,
                ROUND(cc.count * 100.0 / totals.total_count, 2) AS percentage
            FROM cell_counts cc
            JOIN (
                SELECT sample, SUM(count) AS total_count
                FROM cell_counts
                GROUP BY sample
            ) totals ON cc.sample = totals.sample
            ORDER BY cc.sample, cc.population
        """).fetchall()
    finally:
        conn.close()

    return [dict(row) for row in rows]


@app.get("/api/boxplot-data")
def get_boxplot_data(): # filter mel + PBMC + miraclib, compute %/population/sample
    conn = get_db()
    try:
        # melanoma on subjects not samples
        # join subjects to filter by condition
        rows = conn.execute("""
            SELECT
                cc.population,
                s.response,
                ROUND(cc.count * 100.0 / totals.total_count, 2) AS percentage
            FROM cell_counts cc
            JOIN samples s ON cc.sample = s.sample
            JOIN subjects sub ON s.subject = sub.subject
            JOIN (
                SELECT sample, SUM(count) AS total_count
                FROM cell_counts
                GROUP BY sample
            ) totals ON cc.sample = totals.sample
            WHERE sub.condition = 'melanoma'
              AND s.sample_type = 'PBMC'
              AND s.treatment = 'miraclib'
              AND s.response IN ('yes', 'no')  -- exclude healthy (null response)
            ORDER BY cc.population, s.response
        """).fetchall()
    finally:
        conn.close()

    # bucket = {population: {responder: [...], non_responder: [...]}}
    result = {}
    for row in rows:
        pop = row["population"]
        resp = "responder" if row["response"] == "yes" else "non_responder" # map yes/no to responder/non_responder for the frontend
        pct = row["percentage"]
        if pop not in result:
            result[pop] = {"responder": [], "non_responder": []}
        result[pop][resp].append(pct)

    return result


@app.get("/api/stats")
def get_stats(): # same filter as boxplot-data, Mann-Whitney U/population
    conn = get_db()
    try:
        # unrounded here since mannwhitneyu works on raw floats
        rows = conn.execute("""
            SELECT
                cc.population,
                s.response,
                cc.count * 100.0 / totals.total_count AS percentage
            FROM cell_counts cc
            JOIN samples s ON cc.sample = s.sample
            JOIN subjects sub ON s.subject = sub.subject
            JOIN (
                SELECT sample, SUM(count) AS total_count
                FROM cell_counts
                GROUP BY sample
            ) totals ON cc.sample = totals.sample
            WHERE sub.condition = 'melanoma'
              AND s.sample_type = 'PBMC'
              AND s.treatment = 'miraclib'
              AND s.response IN ('yes', 'no')
            ORDER BY cc.population
        """).fetchall()
    finally:
        conn.close()

    groups = {}
    for row in rows:
        pop = row["population"]
        resp = "responder" if row["response"] == "yes" else "non_responder"
        if pop not in groups: # group % by pop and response
            groups[pop] = {"responder": [], "non_responder": []}
        groups[pop][resp].append(row["percentage"])

    result = []
    for pop, popData in sorted(groups.items()):
        uStat, pVal = stats.mannwhitneyu(
            popData["responder"], popData["non_responder"], alternative="two-sided"
        )
        # cast from numpy types since FastAPI can't serialize them directly
        result.append({
            "population": pop,
            "u_statistic": round(float(uStat), 4),
            "p_value": round(float(pVal), 4),
            "significant": bool(pVal < 0.05),
        })

    return result
