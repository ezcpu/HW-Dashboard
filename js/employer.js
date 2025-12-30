async function renderEmployer() {
  const container = document.getElementById("employerList");
  if (!container) return;

  if (!window.CFG || !window.CFG.EMPLOYERS) {
    container.innerHTML = '<tr><td colspan="2" style="text-align:center;">No data source configured</td></tr>';
    return;
  }

  try {
    // Fetch and parse the single employers CSV
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
    const groupCounts = {};

    // Find the 'group' column (handle case sensitivity)
    const headers = results.meta.fields || [];
    const groupCol = headers.find(h => h.trim().toLowerCase() === "group") || "Group";

    // Count members per group
    rows.forEach(row => {
      // Get the group name, normalize it slightly
      const groupName = (row[groupCol] || "").trim();
      if (groupName) {
        groupCounts[groupName] = (groupCounts[groupName] || 0) + 1;
      }
    });

    // Convert to array and sort by count descending
    const sortedGroups = Object.entries(groupCounts)
      .sort((a, b) => b[1] - a[1]);

    if (sortedGroups.length === 0) {
      container.innerHTML = '<tr><td colspan="2" style="text-align:center;">No employer data found</td></tr>';
      return;
    }

    // Build HTML
    container.innerHTML = sortedGroups.map(([company, count]) => `
      <tr>
        <td><strong>${company}</strong></td>
        <td style="text-align:right; font-weight:700;">${count.toLocaleString()}</td>
      </tr>
    `).join("");

  } catch (e) {
    console.error("Error loading employer data:", e);
    container.innerHTML = '<tr><td colspan="2" style="text-align:center;color:var(--error);">Failed to load employer data</td></tr>';
  }
}

// Expose to window so tab switching can call it
window.renderEmployer = renderEmployer;