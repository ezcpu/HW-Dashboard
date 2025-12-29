function norm(s) {
  return (s || "").toString().trim().toLowerCase();
}

function findGrp(headers) {
  const n = headers.map(h => norm(h));
  const i = n.findIndex(h => h === "group" || h === "groups" || h.includes("group"));
  return i >= 0 ? headers[i] : headers[0];
}

async function countGrp(url, match) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: r => {
        try {
          const rows = r.data || [];
          if (!rows.length) return resolve(0);

          const hdrs = Object.keys(rows[0]);
          const key = findGrp(hdrs);
          const tot = rows.filter(row =>
            ((row[key] || "") + "").toLowerCase().includes(match.toLowerCase())
          ).length;

          resolve(tot);
        } catch (e) {
          reject(e);
        }
      },
      error: e => reject(e)
    });
  });
}

async function renderEmployer() {
  for (const emp of CFG.EMPLOYER) {
    const el = document.getElementById(emp.target);
    if (!el) continue;

    el.textContent = "...";

    try {
      const tot = await countGrp(emp.url, emp.groupKey);
      el.textContent = tot.toLocaleString();
    } catch (e) {
      console.error(`Employer error for ${emp.company}:`, e);
      el.textContent = "—";
    }
  }
}
