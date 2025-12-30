// Helper to fetch CSV
async function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: resolve,
      error: (err) => {
        console.warn(`Failed to load ${url}`, err);
        resolve({ data: [] }); // Fail gracefully
      }
    });
  });
}

// Helper: Process Generic Employers
async function processGeneric(stats) {
  if (!window.CFG.EMPLOYERS) return;
  
  const results = await fetchCSV(window.CFG.EMPLOYERS);
  const rows = results.data || [];
  const headers = results.meta.fields || [];

  // Find columns
  const findCol = (terms) => headers.find(h => {
    const norm = h.trim().toLowerCase();
    return terms.some(t => norm === t || norm.includes(t));
  });

  const groupCol = findCol(["group", "company", "employer"]) || "Group";
  const clubCol = findCol(["club name", "club", "location"]) || "Club Name";

  rows.forEach(row => {
    const groupName = (row[groupCol] || "").trim();
    const clubName = (row[clubCol] || "Unknown Club").trim();

    if (groupName) {
      if (!stats[groupName]) stats[groupName] = { total: 0, clubs: {} };
      stats[groupName].total++;
      stats[groupName].clubs[clubName] = (stats[groupName].clubs[clubName] || 0) + 1;
    }
  });
}

// Helper: Process UAW Ford (Specific Logic)
async function processUAW(stats) {
  if (!window.CFG.UAW_FORD) return;

  const results = await fetchCSV(window.CFG.UAW_FORD);
  const rows = results.data || [];
  const headers = results.meta.fields || [];

  // Logic: Active if Date in Column J is less than 12 months old
  // Column J is index 9
  const dateCol = headers[9]; // "Column J" implies 10th column (0-9)
  const clubCol = headers.find(h => h.toLowerCase().includes("club") || h.toLowerCase().includes("location")) || headers[0]; // Best guess for Club

  const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
  const now = new Date();
  const groupName = "UAW Ford";

  rows.forEach(row => {
    const dateStr = (row[dateCol] || "").trim();
    const clubName = (row[clubCol] || "Unknown Club").trim();

    // Parse Date
    const d = new Date(dateStr);
    
    // Check if valid date and active (< 12 months)
    if (!isNaN(d) && (now - d) < ONE_YEAR_MS) {
      if (!stats[groupName]) stats[groupName] = { total: 0, clubs: {} };
      
      stats[groupName].total++;
      stats[groupName].clubs[clubName] = (stats[groupName].clubs[clubName] || 0) + 1;
    }
  });
}

async function renderEmployer() {
  const container = document.getElementById("employerList");
  if (!container) return;

  container.innerHTML = '<tr><td colspan="2" style="text-align:center;color:var(--text-muted);">Loading data...</td></tr>';

  const stats = {};

  try {
    // Process all sources in parallel
    await Promise.all([
      processGeneric(stats),
      processUAW(stats)
    ]);

    // Sort Groups by Total Count Descending
    const sortedGroups = Object.entries(stats)
      .sort((a, b) => b[1].total - a[1].total);

    if (sortedGroups.length === 0) {
      container.innerHTML = '<tr><td colspan="2" style="text-align:center;">No employer data found</td></tr>';
      return;
    }

    // Build HTML
    let html = "";
    
    sortedGroups.forEach(([company, data]) => {
      // Main Group Row
      html += `
        <tr style="background-color:var(--bg-subtle);">
          <td style="font-weight:700; color:var(--text);">${company}</td>
          <td style="text-align:right; font-weight:700; color:var(--text);">${data.total.toLocaleString()}</td>
        </tr>
      `;

      // Sort Clubs within this Group
      const sortedClubs = Object.entries(data.clubs).sort((a, b) => b[1] - a[1]);

      // Sub-rows for Clubs
      sortedClubs.forEach(([club, count]) => {
        html += `
          <tr>
            <td style="padding-left: 24px; font-size: 13px; color:var(--text-muted); border-bottom: 1px solid var(--border-subtle);">
              • ${club}
            </td>
            <td style="text-align:right; font-size: 13px; color:var(--text-muted); border-bottom: 1px solid var(--border-subtle);">
              ${count.toLocaleString()}
            </td>
          </tr>
        `;
      });
    });

    container.innerHTML = html;

  } catch (e) {
    console.error("Error loading employer data:", e);
    container.innerHTML = '<tr><td colspan="2" style="text-align:center;color:var(--error);">Failed to load employer data</td></tr>';
  }
}

// Expose to window so tab switching can call it
window.renderEmployer = renderEmployer;
