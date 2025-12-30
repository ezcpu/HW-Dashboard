async function renderEmployer() {
  const container = document.getElementById("employerList");
  if (!container) return;

  if (!window.CFG || !window.CFG.EMPLOYERS) {
    container.innerHTML = '<tr><td colspan="2" style="text-align:center;">No data source configured</td></tr>';
    return;
  }

  try {
    // 1. Fetch and parse the single employers CSV
    const results = await new Promise((resolve, reject) => {
      Papa.parse(window.CFG.EMPLOYERS, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: resolve,
        error: reject
      });
    });

    const rows = results.data || [];
    const stats = {};

    // 2. Identify columns
    const headers = results.meta.fields || [];
    
    // Helper to find column by loose matching
    const findCol = (terms) => headers.find(h => {
      const norm = h.trim().toLowerCase();
      return terms.some(t => norm === t || norm.includes(t));
    });

    // UPDATED: Prioritize "Club Name" as requested (Column A)
    const clubCol = findCol(["club name", "club", "location"]) || "Club Name";
    const groupCol = findCol(["group", "company", "employer"]) || "Group";

    // 3. Aggregate Data
    rows.forEach(row => {
      const groupName = (row[groupCol] || "").trim();
      const clubName = (row[clubCol] || "Unknown Club").trim();

      if (groupName) {
        if (!stats[groupName]) {
          stats[groupName] = { total: 0, clubs: {} };
        }
        
        // Increment Group Total
        stats[groupName].total++;

        // Increment Club Breakdown
        if (clubName) {
          stats[groupName].clubs[clubName] = (stats[groupName].clubs[clubName] || 0) + 1;
        }
      }
    });

    // 4. Sort Groups by Total Count Descending
    const sortedGroups = Object.entries(stats)
      .sort((a, b) => b[1].total - a[1].total);

    if (sortedGroups.length === 0) {
      container.innerHTML = '<tr><td colspan="2" style="text-align:center;">No employer data found</td></tr>';
      return;
    }

    // 5. Build HTML
    let html = "";
    
    sortedGroups.forEach(([company, data]) => {
      // Main Group Row (Company)
      html += `
        <tr style="background-color:var(--bg-subtle);">
          <td style="font-weight:700; color:var(--text);">${company}</td>
          <td style="text-align:right; font-weight:700; color:var(--text);">${data.total.toLocaleString()}</td>
        </tr>
      `;

      // Sort Clubs within this Group (by count desc)
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
