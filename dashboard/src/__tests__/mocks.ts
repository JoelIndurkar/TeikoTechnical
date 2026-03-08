// shared mock API responses - used across all test files AI generated test data

export const mockSchemaInfo = {
  tables: [
    { name: 'subjects', columns: ['subject', 'condition', 'age', 'sex'], row_count: 3500 },
    {
      name: 'samples',
      columns: ['sample', 'subject', 'project', 'sample_type', 'time_from_treatment_start', 'treatment', 'response'],
      row_count: 10500,
    },
    { name: 'cell_counts', columns: ['id', 'sample', 'population', 'count'], row_count: 52500 },
  ],
}

// 15 rows: 3 samples x 5 populations
export const mockSummary = [
  { sample: 'smp1', total_count: 8000,  population: 'b_cell',      count: 1000, percentage: 12.5  },
  { sample: 'smp1', total_count: 8000,  population: 'cd4_t_cell',  count: 3000, percentage: 37.5  },
  { sample: 'smp1', total_count: 8000,  population: 'cd8_t_cell',  count: 2000, percentage: 25.0  },
  { sample: 'smp1', total_count: 8000,  population: 'monocyte',    count: 1500, percentage: 18.75 },
  { sample: 'smp1', total_count: 8000,  population: 'nk_cell',     count: 500,  percentage: 6.25  },
  { sample: 'smp2', total_count: 7200,  population: 'b_cell',      count: 800,  percentage: 11.11 },
  { sample: 'smp2', total_count: 7200,  population: 'cd4_t_cell',  count: 2800, percentage: 38.89 },
  { sample: 'smp2', total_count: 7200,  population: 'cd8_t_cell',  count: 1800, percentage: 25.0  },
  { sample: 'smp2', total_count: 7200,  population: 'monocyte',    count: 1400, percentage: 19.44 },
  { sample: 'smp2', total_count: 7200,  population: 'nk_cell',     count: 400,  percentage: 5.56  },
  { sample: 'smp3', total_count: 15000, population: 'b_cell',      count: 3000, percentage: 20.0  },
  { sample: 'smp3', total_count: 15000, population: 'cd4_t_cell',  count: 5000, percentage: 33.33 },
  { sample: 'smp3', total_count: 15000, population: 'cd8_t_cell',  count: 4000, percentage: 26.67 },
  { sample: 'smp3', total_count: 15000, population: 'monocyte',    count: 2000, percentage: 13.33 },
  { sample: 'smp3', total_count: 15000, population: 'nk_cell',     count: 1000, percentage: 6.67  },
]

export const mockBoxplotData = {
  b_cell:     { responder: [12.5, 20.0, 15.3], non_responder: [11.1, 8.4]  },
  cd4_t_cell: { responder: [37.0, 38.5, 35.2], non_responder: [30.0, 28.5] },
  cd8_t_cell: { responder: [25.0, 26.0, 24.5], non_responder: [22.0, 20.5] },
  nk_cell:    { responder: [6.0,  6.5,  5.8],  non_responder: [8.0,  9.0]  },
  monocyte:   { responder: [18.5, 19.0, 17.5], non_responder: [21.0, 22.5] },
}

// alphabetical order, mix of significant and not, one with p < 0.001
export const mockStats = [
  { population: 'b_cell',     u_statistic: 9.0, p_value: 0.0286, significant: true  },
  { population: 'cd4_t_cell', u_statistic: 9.0, p_value: 0.0286, significant: true  },
  { population: 'cd8_t_cell', u_statistic: 9.0, p_value: 0.0286, significant: true  },
  { population: 'monocyte',   u_statistic: 2.0, p_value: 0.3429, significant: false },
  { population: 'nk_cell',    u_statistic: 0.0, p_value: 0.0001, significant: true  },
]

export const mockSubset = {
  samples_per_project: { prj1: 45, prj2: 32 },
  responder_count: 38,
  non_responder_count: 39,
  male_count: 42,
  female_count: 35,
  avg_b_cells: 10401.28,
}

// helper: returns a mock Response-like object for a given payload
export function mockResponse(data: unknown) {
  return Promise.resolve({ json: () => Promise.resolve(data) } as Response)
}

// helper: set up fetch to route by URL substring
export function setupFetch(routes: Record<string, unknown>) {
  vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
    const url = input.toString()
    const key = Object.keys(routes).find(k => url.includes(k))
    if (key) return mockResponse(routes[key])
    return Promise.reject(new Error(`Unhandled fetch: ${url}`))
  })
}
