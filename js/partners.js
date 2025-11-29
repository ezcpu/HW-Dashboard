function renderPartners() {
  if (ST.partnersLoaded) return;

  const statusEl = document
    .getElementById("activeStatus")
    .querySelector("span:last-child");

  const listEl = document.getElementById("partnersList");
  statusEl.textContent = "Loading...";

  Papa.parse(CFG.PARTNERS, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: r => {
      const rows = r.data || [];
      if (!rows.length) {
        statusEl.textContent = "No partners found";
        return;
      }

      const clean = rows.map(row => {
        const o = {};
        for (const k in row) o[k.trim().toLowerCase()] = (row[k] || "").trim();
        return o;
      });

      const partners = clean.map(r => {
        const name = r["company name"] || r["company"] || "Unknown";
        let region = r["region"] || "Unknown";
        region = region
          .replace(/east canada|eastern canada/i, "East")
          .replace(/west canada|western canada/i, "West")
          .replace(/canada/i, "Canada");

        const promo = r["promotion type"] || r["promotion"] || "";
        const payment =
          r["payment arrangement"] ||
          r["payment arrangements"] ||
          r["payment"] ||
          r["payment type"] ||
          r["paymentarrangement"] ||
          r["paymentarrangements"] ||
          r["paymenttype"] ||
          r["employee reimbursement"] ||
          r["company paid"] ||
          r["employee paid"] ||
          "";

        const website = "";
        const docsLink =
          r["supporting documents (urls)"] ||
          r["supporting documents"] ||
          r["supporting document"] ||
          r["documents"] ||
          r["document link"] ||
          r["link"] ||
          "";

        return { name, region, promo, payment, website, docsLink };
      });

      if (!partners.length) {
        statusEl.textContent = "No partners found";
        return;
      }

      partners.sort((a, b) => a.name.localeCompare(b.name));

      const badgeClass = payment => {
        const p = payment.toLowerCase();
        if (p.includes("employee paid")) return "badge payment-employee-paid";
        if (p.includes("employee reimbursement")) return "badge payment-employee-reimb";
        if (p.includes("company paid")) return "badge payment-company-paid";
        return "badge payment";
      };

      const palette = pal();

      listEl.innerHTML = partners
        .map(
          p => `
          <li>
            <span class="badge ${p.region === "Canada" ? "can" : "us"}">${p.region}</span>
            <span class="name">${p.name}</span>
            <span class="meta">
              ${
                p.payment
                  ? `<span class="${badgeClass(p.payment)}">${p.payment}</span>`
                  : ""
              }
              ${
                p.docsLink
                  ? `<a href="${p.docsLink}" target="_blank" rel="noopener noreferrer">📄 Flyer</a>`
                  : ""
              }
            </span>
          </li>`
        )
        .join("");

      // --- CHART 1: Geographic Distribution (Donut) ---
      const pCounts = partners.reduce((acc, p) => {
        acc[p.region] = (acc[p.region] || 0) + 1;
        return acc;
      }, {});

      // Sort for consistent colors
      const sortedKeys = Object.keys(pCounts).sort();
      
      Plotly.newPlot("partnersByRegion", [{
        labels: sortedKeys,
        values: sortedKeys.map(k => pCounts[k]),
        type: "pie",
        hole: 0.5, // Makes it a Donut chart
        marker: {
          colors: sortedKeys.map(k =>
            k === "Canada" ? palette.can :
            k === "East" ? palette.us :
            palette.accent)
        },
        textinfo: "label+value", // Shows "West 25" on the slice
        textfont: { color: "white" },
        hoverinfo: "label+value+percent"
      }], {
        paper_bgcolor: palette.paper,
        plot_bgcolor: palette.plot,
        font: { family: "Plus Jakarta Sans", color: palette.font },
        margin: { t: 30, b: 30, l: 30, r: 30 },
        showlegend: true,
        legend: { orientation: "h", xanchor: "center", x: 0.5, y: -0.1 },
        height: 300
      }, pcfg);

      // --- CHART 2: Payment Arrangement (Donut) ---
      const payCounts = {};
      partners.forEach(p => {
        if (p.payment) payCounts[p.payment] = (payCounts[p.payment] || 0) + 1;
      });

      const payKeys = Object.keys(payCounts).sort();

      const payColor = type => {
        const t = type.toLowerCase();
        if (t.includes("employee paid")) return "#3b82f6";
        if (t.includes("employee reimbursement")) return "#f59e0b";
        if (t.includes("company paid")) return "#10b981";
        return palette.accent;
      };

      if (payKeys.length > 0) {
        Plotly.newPlot("paymentByRegion", [{
          labels: payKeys,
          values: payKeys.map(k => payCounts[k]),
          type: "pie",
          hole: 0.5, // Makes it a Donut chart
          marker: { colors: payKeys.map(k => payColor(k)) },
          textinfo: "value", // Just show the number (e.g., "43")
          textfont: { color: "white" },
          hoverinfo: "label+value+percent"
        }], {
          paper_bgcolor: palette.paper,
          plot_bgcolor: palette.plot,
          font: { family: "Plus Jakarta Sans", color: palette.font },
          margin: { t: 30, b: 30, l: 30, r: 30 },
          showlegend: true,
          legend: { orientation: "h", xanchor: "center", x: 0.5, y: -0.1 },
          height: 300
        }, pcfg);
      } else {
        document.getElementById("paymentByRegion").innerHTML =
          '<div class="empty-state"><div class="empty-state-icon">💳</div><p>No payment arrangement data</p></div>';
      }

      statusEl.textContent = `${partners.length} partners`;
      ST.partnersLoaded = true;
      requestAnimationFrame(resizeCharts);
    },

    error: e => {
      console.error("Partners error:", e);
      statusEl.textContent = "Failed to load";
    }
  });
}