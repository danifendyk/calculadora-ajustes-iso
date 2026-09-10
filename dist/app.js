(() => {
  "use strict";

  const data = window.ISO_FIT_DATA;
  const zones = data.zones;
  const lowerZones = new Set(["D", "E", "F", "G", "H"]);
  const specialKMN = new Set(["K", "M", "N"]);
  const specialPRSTU = new Set(["P", "R", "S", "T", "U"]);
  const elements = Object.fromEntries([
    "diameter", "hole-zone", "hole-grade", "shaft-zone", "shaft-grade", "status-card",
    "fit-class", "fit-code", "hole-min", "hole-max", "shaft-min", "shaft-max",
    "clearance-min", "clearance-max", "hole-it", "shaft-it", "roughness", "hole-band",
    "shaft-band", "clearance-indicator", "chart-labels", "assembly-hole-label",
    "assembly-shaft-label", "diagram-fit-code", "housing-upper", "housing-lower",
    "section-lines", "assembly-clearance", "bore-edge-upper", "bore-edge-lower",
    "shaft-body", "shaft-end", "shaft-rim", "scale-label", "reset-button", "fit-form"
  ].map((id) => [id, document.getElementById(id)]));

  function fillSelects() {
    for (const zone of zones) {
      elements["hole-zone"].add(new Option(zone, zone));
      elements["shaft-zone"].add(new Option(zone.toLowerCase(), zone));
    }
    for (let grade = 1; grade <= 14; grade += 1) {
      elements["hole-grade"].add(new Option(`IT${grade}`, String(grade)));
      elements["shaft-grade"].add(new Option(`IT${grade}`, String(grade)));
    }
    elements["hole-zone"].value = "H";
    elements["hole-grade"].value = "8";
    elements["shaft-zone"].value = "G";
    elements["shaft-grade"].value = "6";
  }

  function bandFor(value, bands) {
    return value > 0 ? bands.find((band) => value <= band.max) : undefined;
  }

  function itValue(diameter, grade) {
    const band = bandFor(diameter, data.itBands);
    return band ? band.values[grade - 1] : null;
  }

  function kOffset(diameter) {
    const index = diameter > 0 ? data.itBands.slice(0, 13).findIndex((band) => diameter <= band.max) : -1;
    return index >= 0 ? data.kCorrection[index] : 0;
  }

  function fundamental(diameter, zone, grade) {
    if (zone === "JS") return 0;
    if (zone === "K" && grade >= 4 && grade <= 7 && diameter <= 500) return kOffset(diameter);
    const band = bandFor(diameter, data.deviationBands);
    return band ? band.values[zone] : null;
  }

  function calculate(input) {
    const { diameter, holeZone, holeGrade, shaftZone, shaftGrade } = input;
    if (!Number.isFinite(diameter) || diameter <= 0 || diameter > 3150) {
      return { error: "Fuera de alcance: ingrese 0 < D ≤ 3150 mm" };
    }
    if (!zones.includes(holeZone) || !zones.includes(shaftZone)) {
      return { error: "Zona no válida para el alcance implementado" };
    }
    if (![holeGrade, shaftGrade].every((grade) => Number.isInteger(grade) && grade >= 1 && grade <= 14)) {
      return { error: "Grado no válido: seleccione un entero entre IT1 e IT14" };
    }
    if (diameter <= 1 && (holeGrade === 14 || shaftGrade === 14)) {
      return { error: "IT14 no debe utilizarse para diámetros nominales de hasta 1 mm" };
    }
    if (diameter <= 1 && holeZone === "N" && holeGrade > 8) {
      return { error: "Los agujeros N9–N14 no deben utilizarse para diámetros de hasta 1 mm" };
    }
    if (diameter <= 24 && (holeZone === "T" || shaftZone === "T")) {
      return { error: "La zona T está disponible únicamente para diámetros mayores de 24 mm" };
    }

    const holeIT = itValue(diameter, holeGrade);
    const shaftIT = itValue(diameter, shaftGrade);
    const holeBase = fundamental(diameter, holeZone, holeGrade);
    const shaftBase = fundamental(diameter, shaftZone, shaftGrade);
    if ([holeIT, shaftIT, holeBase, shaftBase].some((value) => !Number.isFinite(value))) {
      return { error: "No hay datos disponibles para esta combinación" };
    }

    let holeLower;
    let holeUpper;
    if (holeZone === "JS") {
      holeLower = -holeIT / 2;
      holeUpper = holeIT / 2;
    } else if (lowerZones.has(holeZone)) {
      holeLower = holeBase;
      holeUpper = holeBase + holeIT;
    } else if (holeZone === "N" && holeGrade > 8 && diameter > 3 && diameter <= 500) {
      holeUpper = 0;
      holeLower = -holeIT;
    } else if (holeZone === "M" && holeGrade === 6 && diameter > 250 && diameter <= 315) {
      holeUpper = -9;
      holeLower = holeUpper - holeIT;
    } else {
      const appliesDelta = diameter > 3 && diameter <= 500 && holeGrade >= 2 && (
        (specialKMN.has(holeZone) && holeGrade <= 8) ||
        (specialPRSTU.has(holeZone) && holeGrade <= 7)
      );
      const delta = appliesDelta ? holeIT - itValue(diameter, holeGrade - 1) : 0;
      holeUpper = -holeBase + delta;
      holeLower = holeUpper - holeIT;
    }

    let shaftLower;
    let shaftUpper;
    if (shaftZone === "JS") {
      shaftLower = -shaftIT / 2;
      shaftUpper = shaftIT / 2;
    } else if (lowerZones.has(shaftZone)) {
      shaftUpper = -shaftBase;
      shaftLower = shaftUpper - shaftIT;
    } else {
      shaftLower = shaftBase;
      shaftUpper = shaftBase + shaftIT;
    }

    const holeMin = diameter + holeLower / 1000;
    const holeMax = diameter + holeUpper / 1000;
    const shaftMin = diameter + shaftLower / 1000;
    const shaftMax = diameter + shaftUpper / 1000;
    const clearanceMin = holeMin - shaftMax;
    const clearanceMax = holeMax - shaftMin;
    const epsilon = 1e-10;
    const classification = clearanceMin >= -epsilon
      ? "CON JUEGO"
      : clearanceMax <= epsilon
        ? "CON INTERFERENCIA"
        : "DE TRANSICIÓN";

    return {
      diameter, holeZone, holeGrade, shaftZone, shaftGrade, holeIT, shaftIT,
      holeLower, holeUpper, shaftLower, shaftUpper, holeMin, holeMax, shaftMin,
      shaftMax, clearanceMin, clearanceMax, classification,
      roughHole: roughnessFor(holeIT / 1000),
      roughShaft: roughnessFor(shaftIT / 1000),
    };
  }

  function roughnessFor(widthMm) {
    const item = data.roughness.find((band, index) => widthMm <= band.max && (index === 0 ? widthMm >= band.min : widthMm > band.min));
    return item ? item.label : "—";
  }

  function readInput() {
    return {
      diameter: Number(String(elements.diameter.value).replace(",", ".")),
      holeZone: elements["hole-zone"].value,
      holeGrade: Number(elements["hole-grade"].value),
      shaftZone: elements["shaft-zone"].value,
      shaftGrade: Number(elements["shaft-grade"].value),
    };
  }

  function formatMm(value) {
    if (!Number.isFinite(value)) return "—";
    let text = value.toFixed(6);
    while (text.includes(".") && text.endsWith("0") && text.split(".")[1].length > 3) text = text.slice(0, -1);
    return text.replace(".", ",");
  }

  function formatMicron(value) {
    const rounded = Math.round(value * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1).replace(".", ",")} µm`;
  }

  function formatSignedMicron(value) {
    const rounded = Math.round(value * 10) / 10;
    const number = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(".", ",");
    return `${rounded > 0 ? "+" : ""}${number} µm`;
  }

  function setText(id, value) { elements[id].textContent = value; }

  function setSvgAttribute(id, name, value) {
    const element = elements[id];
    if (typeof element?.setAttribute === "function") element.setAttribute(name, value);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function render() {
    const input = readInput();
    const result = calculate(input);
    const code = `${input.holeZone}${input.holeGrade}/${input.shaftZone.toLowerCase()}${input.shaftGrade}`;
    setText("fit-code", code);
    elements["status-card"].className = "status-card";

    if (result.error) {
      elements["status-card"].classList.add("error");
      setText("fit-class", result.error);
      for (const id of ["hole-min", "hole-max", "shaft-min", "shaft-max", "clearance-min", "clearance-max"]) setText(id, "—");
      setText("hole-it", "—");
      setText("shaft-it", "—");
      setText("roughness", "—");
      renderEmptyDiagram(result.error);
      document.title = `Entrada no válida · ${code}`;
      return;
    }

    if (result.classification === "DE TRANSICIÓN") elements["status-card"].classList.add("transition");
    if (result.classification === "CON INTERFERENCIA") elements["status-card"].classList.add("interference");
    setText("fit-class", result.classification.replace("CON ", "Con ").replace("DE ", "De ").toLowerCase().replace(/^./, (c) => c.toUpperCase()));
    setText("hole-min", formatMm(result.holeMin));
    setText("hole-max", formatMm(result.holeMax));
    setText("shaft-min", formatMm(result.shaftMin));
    setText("shaft-max", formatMm(result.shaftMax));
    setText("clearance-min", formatMm(result.clearanceMin));
    setText("clearance-max", formatMm(result.clearanceMax));
    setText("hole-it", formatMicron(result.holeIT));
    setText("shaft-it", formatMicron(result.shaftIT));
    setText("roughness", `${result.roughHole} / ${result.roughShaft}`);
    renderDiagram(result);
    document.title = `${code} · Calculadora de ajustes ISO`;
  }

  function renderDiagram(result) {
    const values = [result.holeLower, result.holeUpper, result.shaftLower, result.shaftUpper];
    const span = Math.max(30, Math.max(...values) - Math.min(...values), ...values.map(Math.abs));
    const scale = Math.min(2.65, 145 / span);
    const zeroY = 240;
    const mapY = (value) => zeroY - value * scale;
    setText("assembly-hole-label", `Ø ${formatMm(result.holeMin)} — ${formatMm(result.holeMax)} mm`);
    setText("assembly-shaft-label", `Ø ${formatMm(result.shaftMin)} — ${formatMm(result.shaftMax)} mm`);
    setText("diagram-fit-code", `${result.holeZone}${result.holeGrade} / ${result.shaftZone.toLowerCase()}${result.shaftGrade}`);
    renderAssembly(result);

    const band = (id, lower, upper, x, width, label, klass) => {
      const top = mapY(upper);
      const bottom = mapY(lower);
      const height = Math.max(8, bottom - top);
      elements[id].innerHTML = `
        <rect class="tol-band ${klass}" x="${x}" y="${top.toFixed(2)}" width="${width}" height="${height.toFixed(2)}"></rect>
        <line class="band-cap ${klass}" x1="${x - 7}" y1="${top.toFixed(2)}" x2="${x + width + 7}" y2="${top.toFixed(2)}"></line>
        <line class="band-cap ${klass}" x1="${x - 7}" y1="${bottom.toFixed(2)}" x2="${x + width + 7}" y2="${bottom.toFixed(2)}"></line>
        <text class="band-label" x="${x + width / 2}" y="${(top + height / 2 + 5).toFixed(2)}" text-anchor="middle">${label}</text>`;
      return { x, width, top, bottom };
    };

    const hole = band("hole-band", result.holeLower, result.holeUpper, 490, 112, `${result.holeZone}${result.holeGrade}`, "hole");
    const shaft = band("shaft-band", result.shaftLower, result.shaftUpper, 700, 112, `${result.shaftZone.toLowerCase()}${result.shaftGrade}`, "shaft");

    const edgeLabels = (info, lower, upper, side) => {
      const upperY = mapY(upper);
      const lowerY = mapY(lower);
      const close = Math.abs(lowerY - upperY) < 34;
      const upperTextY = upperY + (close ? -10 : -7);
      const lowerTextY = lowerY + (close ? 20 : 18);
      const left = side === "left";
      const edgeX = left ? info.x : info.x + info.width;
      const elbowX = edgeX + (left ? -13 : 13);
      const textX = left ? edgeX - 20 : 856;
      const anchor = "end";
      const guideEndX = left ? textX + 6 : textX - 6;
      const make = (value, actualY, textY, name) => `
        <path class="edge-guide ${name}" d="M${edgeX} ${actualY.toFixed(2)} H${elbowX} V${(textY + 4).toFixed(2)} H${guideEndX}"></path>
        <text class="edge-value" x="${textX}" y="${textY.toFixed(2)}" text-anchor="${anchor}">${formatMm(result.diameter + value / 1000)}<tspan class="deviation-inline"> / ${formatSignedMicron(value)}</tspan></text>`;
      return make(upper, upperY, upperTextY, "upper") + make(lower, lowerY, lowerTextY, "lower");
    };

    const clearanceStart = mapY(result.holeLower);
    const clearanceEnd = mapY(result.shaftUpper);
    const clearanceMiddle = (clearanceStart + clearanceEnd) / 2;
    const isGap = result.clearanceMin >= 0;
    const indicatorClass = isGap ? "positive" : "negative";
    const marker = isGap ? "gapArrow" : "overlapArrow";
    const indicatorText = isGap
      ? `JUEGO MÍNIMO · ${formatMicron(result.clearanceMin * 1000)}`
      : `SOLAPE · ${formatMicron(Math.abs(result.clearanceMin) * 1000)}`;
    elements["clearance-indicator"].innerHTML = `
      <line class="clearance-line ${indicatorClass}" x1="651" y1="${clearanceStart.toFixed(2)}" x2="651" y2="${clearanceEnd.toFixed(2)}" marker-start="url(#${marker})" marker-end="url(#${marker})"></line>
      <path class="clearance-leader ${indicatorClass}" d="M651 ${clearanceMiddle.toFixed(2)} V421"></path>
      <rect class="clearance-callout ${indicatorClass}" x="526" y="421" width="250" height="36" rx="3"></rect>
      <text class="clearance-text" x="651" y="444" text-anchor="middle">${indicatorText}</text>`;

    elements["chart-labels"].innerHTML = `
      ${edgeLabels(hole, result.holeLower, result.holeUpper, "left")}
      ${edgeLabels(shaft, result.shaftLower, result.shaftUpper, "right")}`;
    setText("scale-label", `Escala automática · 1 µm = ${scale.toFixed(2).replace(".", ",")} px`);
  }

  function renderAssembly(result) {
    const centerY = 240;
    const maxDeviation = Math.max(35, Math.abs(result.holeLower), Math.abs(result.shaftUpper));
    const geometryScale = Math.min(0.75, 27 / maxDeviation);
    const holeRadius = clamp(32 + result.holeLower * geometryScale, 23, 47);
    const shaftRadius = clamp(32 + result.shaftUpper * geometryScale, 23, 47);
    const boreTop = centerY - holeRadius;
    const boreBottom = centerY + holeRadius;
    const shaftTop = centerY - shaftRadius;
    const shaftBottom = centerY + shaftRadius;

    setSvgAttribute("housing-upper", "d", `M68 121 H322 L348 147 V${boreTop.toFixed(2)} H68 Z`);
    setSvgAttribute("housing-lower", "d", `M68 ${boreBottom.toFixed(2)} H348 V333 L322 359 H68 Z`);
    setSvgAttribute("section-lines", "d", `M68 121 H322 L348 147 V${boreTop.toFixed(2)} H68 Z M68 ${boreBottom.toFixed(2)} H348 V333 L322 359 H68 Z`);
    setSvgAttribute("bore-edge-upper", "y1", boreTop.toFixed(2));
    setSvgAttribute("bore-edge-upper", "y2", boreTop.toFixed(2));
    setSvgAttribute("bore-edge-lower", "y1", boreBottom.toFixed(2));
    setSvgAttribute("bore-edge-lower", "y2", boreBottom.toFixed(2));
    setSvgAttribute("shaft-body", "y", shaftTop.toFixed(2));
    setSvgAttribute("shaft-body", "height", (shaftRadius * 2).toFixed(2));
    setSvgAttribute("shaft-end", "ry", shaftRadius.toFixed(2));
    setSvgAttribute("shaft-rim", "ry", shaftRadius.toFixed(2));

    const gapMicron = result.clearanceMin * 1000;
    const isGap = gapMicron >= 0;
    const topY = Math.min(boreTop, shaftTop);
    const bandHeight = Math.max(2, Math.abs(shaftTop - boreTop));
    const className = isGap ? "fit-space gap" : "fit-space overlap";
    const label = isGap ? `JUEGO MÍN. ${formatMicron(gapMicron)}` : `SOLAPE ${formatMicron(Math.abs(gapMicron))}`;
    elements["assembly-clearance"].innerHTML = `
      <rect class="${className}" x="68" y="${topY.toFixed(2)}" width="280" height="${bandHeight.toFixed(2)}"></rect>
      <rect class="${className}" x="68" y="${(centerY + Math.min(holeRadius, shaftRadius)).toFixed(2)}" width="280" height="${bandHeight.toFixed(2)}"></rect>
      <rect class="fit-state ${isGap ? "gap" : "overlap"}" x="190" y="112" width="158" height="24" rx="3"></rect>
      <text class="fit-state-label" x="269" y="129" text-anchor="middle">${label}</text>`;
  }

  function renderEmptyDiagram(message) {
    elements["hole-band"].innerHTML = "";
    elements["shaft-band"].innerHTML = "";
    elements["clearance-indicator"].innerHTML = "";
    elements["assembly-clearance"].innerHTML = "";
    setText("assembly-hole-label", "Ø —");
    setText("assembly-shaft-label", "Ø —");
    setText("diagram-fit-code", "— / —");
    elements["chart-labels"].innerHTML = `<text class="value-label" x="640" y="278" text-anchor="middle">${message}</text>`;
    setText("scale-label", "Sin escala disponible");
  }

  function reset() {
    elements.diameter.value = "100";
    elements["hole-zone"].value = "H";
    elements["hole-grade"].value = "8";
    elements["shaft-zone"].value = "G";
    elements["shaft-grade"].value = "6";
    render();
  }

  function registerWebMcp() {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    window.addEventListener("pagehide", () => lifecycle.abort(), { once: true });
    const registration = context.registerTool({
      name: "calculate_iso_fit",
      title: "Calcular ajuste ISO",
      description: "Configura la calculadora visible y devuelve límites, juego o interferencia para un ajuste dimensional.",
      inputSchema: {
        type: "object",
        properties: {
          diameter: { type: "number", exclusiveMinimum: 0, maximum: 3150, description: "Diámetro nominal en milímetros." },
          holeZone: { type: "string", enum: zones, description: "Zona del agujero en mayúsculas." },
          holeGrade: { type: "integer", minimum: 1, maximum: 14 },
          shaftZone: { type: "string", enum: zones, description: "Zona del eje; se acepta en mayúsculas." },
          shaftGrade: { type: "integer", minimum: 1, maximum: 14 },
        },
        required: ["diameter", "holeZone", "holeGrade", "shaftZone", "shaftGrade"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const candidate = {
          diameter: Number(input.diameter),
          holeZone: String(input.holeZone).toUpperCase(),
          holeGrade: Number(input.holeGrade),
          shaftZone: String(input.shaftZone).toUpperCase(),
          shaftGrade: Number(input.shaftGrade),
        };
        if (!zones.includes(candidate.holeZone) || !zones.includes(candidate.shaftZone) ||
            !Number.isInteger(candidate.holeGrade) || !Number.isInteger(candidate.shaftGrade)) {
          throw new TypeError("La zona o el grado IT no son válidos.");
        }
        const result = calculate(candidate);
        if (result.error) throw new RangeError(result.error);
        elements.diameter.value = String(candidate.diameter);
        elements["hole-zone"].value = candidate.holeZone;
        elements["hole-grade"].value = String(candidate.holeGrade);
        elements["shaft-zone"].value = candidate.shaftZone;
        elements["shaft-grade"].value = String(candidate.shaftGrade);
        render();
        return {
          fit: `${candidate.holeZone}${candidate.holeGrade}/${candidate.shaftZone.toLowerCase()}${candidate.shaftGrade}`,
          classification: result.classification,
          hole: { minMm: result.holeMin, maxMm: result.holeMax },
          shaft: { minMm: result.shaftMin, maxMm: result.shaftMax },
          clearance: { minMm: result.clearanceMin, maxMm: result.clearanceMax },
        };
      },
    }, { signal: lifecycle.signal });
    Promise.resolve(registration).catch((error) => console.warn("WebMCP no disponible", error));
  }

  fillSelects();
  elements["fit-form"].addEventListener("input", render);
  elements["fit-form"].addEventListener("change", render);
  elements["reset-button"].addEventListener("click", reset);
  render();
  registerWebMcp();

  window.isoFitCalculator = Object.freeze({ calculate });
})();
