// ── F1 Points System (positions 1–10) ──────────────────
const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

function getPoints(position) {
  const idx = position - 1;
  return idx >= 0 && idx < POINTS.length ? POINTS[idx] : 0;
}

// ── CSV Parsing ────────────────────────────────────────
function parseCSV(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Detect whether the first line is a header
  const firstCols = lines[0].split(",").map((c) => c.trim());
  const startsWithHeader = isNaN(Number(firstCols[0]));
  const dataLines = startsWithHeader ? lines.slice(1) : lines;

  const results = [];
  const raceSet = new Set();

  for (const line of dataLines) {
    const cols = line.split(",").map((c) => c.trim());
    if (cols.length < 3) continue;

    const race = parseInt(cols[0], 10);
    const name = cols[1];
    const position = parseInt(cols[2], 10);
    const prize = cols.length >= 4 ? parseInt(cols[3], 10) === 1 : false;
    const crashed = cols.length >= 5 ? parseInt(cols[4], 10) === 1 : false;

    if (isNaN(race) || isNaN(position) || !name) continue;

    raceSet.add(race);
    results.push({ race, name, position, prize, crashed });
  }

  if (results.length === 0) {
    throw new Error(
      "No valid data rows found. Expected format: race number, name, finishing position",
    );
  }

  return { results, races: [...raceSet].sort((a, b) => a - b) };
}

// ── Build Standings ────────────────────────────────────
function buildStandings(results, races) {
  const drivers = {};

  for (const { race, name, position, prize, crashed } of results) {
    if (!drivers[name]) {
      drivers[name] = { name, raceResults: {}, total: 0 };
    }
    const pts = getPoints(position);
    drivers[name].raceResults[race] = { position, points: pts, prize, crashed };
    drivers[name].total += pts;
  }

  return Object.values(drivers).sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.name.localeCompare(b.name);
  });
}

// ── Render Table ───────────────────────────────────────
function render(standings, races) {
  const thead = document.getElementById("scoreboardHead");
  const tbody = document.getElementById("scoreboardBody");

  let headHTML = "<tr><th>#</th><th>Driver</th>";
  for (const r of races) {
    headHTML += `<th>R${r}</th>`;
  }
  headHTML += "<th>Total</th></tr>";
  thead.innerHTML = headHTML;

  let bodyHTML = "";
  standings.forEach((driver, i) => {
    // Assign shared rank: count how many drivers have strictly more points
    const rank = standings.filter((d) => d.total > driver.total).length + 1;
    let rowClass = "";
    let badge = rank;

    if (rank === 1) {
      rowClass = "row-gold";
      badge = "🥇";
    }
    if (rank === 2) {
      rowClass = "row-silver";
      badge = "🥈";
    }
    if (rank === 3) {
      rowClass = "row-bronze";
      badge = "🥉";
    }

    bodyHTML += `<tr class="${rowClass}">`;
    bodyHTML += `<td><span class="rank-badge">${badge}</span></td>`;
    bodyHTML += `<td>${escapeHTML(driver.name)}</td>`;

    for (const r of races) {
      const res = driver.raceResults[r];
      if (res) {
        const ptClass = res.points > 0 ? "has-points" : "";
        const crashSkull = res.crashed
          ? ` <span class="race-crash" title="Crashed">💀</span>`
          : "";
        const prizeTag = res.prize
          ? `<span class="race-prize" title="$1,000,000 prize winner">$1M</span>`
          : "";
        bodyHTML += `<td>
          <div class="race-cell">
            <span class="race-pos">P${res.position}${crashSkull}</span>
            <span class="race-pts ${ptClass}">${res.points > 0 ? "+" + res.points : "—"}</span>
            ${prizeTag}
          </div>
        </td>`;
      } else {
        bodyHTML += '<td><span class="race-pts">–</span></td>';
      }
    }

    bodyHTML += `<td class="total-cell">${driver.total}</td>`;
    bodyHTML += "</tr>";
  });

  tbody.innerHTML = bodyHTML;
  document.getElementById("scoreboardWrapper").classList.remove("hidden");
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ── Error Display ──────────────────────────────────────
function showError(msg) {
  const el = document.getElementById("errorMsg");
  el.textContent = msg;
  el.classList.remove("hidden");
}

// ── Load CSV on page load ──────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  try {
    const { results, races } = parseCSV(RESULTS_CSV);
    const standings = buildStandings(results, races);
    render(standings, races);
  } catch (err) {
    showError(err.message);
  }
});
