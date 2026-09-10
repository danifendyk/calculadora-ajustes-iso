const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const path = require("path");

class Element {
  constructor(id) {
    this.id = id;
    this.value = id === "diameter" ? "100" : "";
    this.textContent = "";
    this.innerHTML = "";
    this.options = [];
    this.className = "";
    this.classList = { add() {} };
  }
  add(option) { this.options.push(option); }
  addEventListener() {}
  setAttribute() {}
}

const elements = new Map();
global.window = { addEventListener() {} };
global.document = {
  title: "",
  modelContext: undefined,
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, new Element(id));
    return elements.get(id);
  },
};
global.Option = function Option(text, value) { this.text = text; this.value = value; };

const root = path.resolve(__dirname, "..");
vm.runInThisContext(fs.readFileSync(path.join(root, "dist", "iso-data.js"), "utf8"));
vm.runInThisContext(fs.readFileSync(path.join(root, "dist", "app.js"), "utf8"));

const calculate = window.isoFitCalculator.calculate;
const data = window.ISO_FIT_DATA;
const close = (actual, expected, label) => {
  assert.ok(Math.abs(actual - expected) <= 1e-9, `${label}: ${actual} != ${expected}`);
};

const knownCases = [
  [{ diameter: 100, holeZone: "H", holeGrade: 8, shaftZone: "G", shaftGrade: 6 }, [100, 100.054, 99.966, 99.988, "CON JUEGO"]],
  [{ diameter: 3.5, holeZone: "H", holeGrade: 7, shaftZone: "G", shaftGrade: 6 }, [3.5, 3.512, 3.488, 3.496, "CON JUEGO"]],
  [{ diameter: 50, holeZone: "H", holeGrade: 7, shaftZone: "H", shaftGrade: 6 }, [50, 50.025, 49.984, 50, "CON JUEGO"]],
  [{ diameter: 600, holeZone: "H", holeGrade: 12, shaftZone: "H", shaftGrade: 12 }, [600, 600.7, 599.3, 600, "CON JUEGO"]],
  [{ diameter: 3000, holeZone: "H", holeGrade: 1, shaftZone: "H", shaftGrade: 1 }, [3000, 3000.026, 2999.974, 3000, "CON JUEGO"]],
  [{ diameter: 100, holeZone: "M", holeGrade: 7, shaftZone: "H", shaftGrade: 6 }, [99.965, 100, 99.978, 100, "DE TRANSICIÓN"]],
  [{ diameter: 100, holeZone: "H", holeGrade: 7, shaftZone: "K", shaftGrade: 6 }, [100, 100.035, 100.003, 100.025, "DE TRANSICIÓN"]],
  // ISO 286-2, tabla N9–N14: para 3 < D ≤ 500 el límite superior del agujero es cero.
  [{ diameter: 100, holeZone: "N", holeGrade: 9, shaftZone: "H", shaftGrade: 6 }, [99.913, 100, 99.978, 100, "DE TRANSICIÓN"]],
  [{ diameter: 100, holeZone: "N", holeGrade: 14, shaftZone: "H", shaftGrade: 6 }, [99.13, 100, 99.978, 100, "DE TRANSICIÓN"]],
  // Caso especial M6 de ISO 286-1 para 250 < D ≤ 315: ES = −9 µm.
  [{ diameter: 300, holeZone: "M", holeGrade: 6, shaftZone: "H", shaftGrade: 6 }, [299.959, 299.991, 299.968, 300, "DE TRANSICIÓN"]],
  // En D = 250 todavía se aplica la regla general con delta.
  [{ diameter: 250, holeZone: "M", holeGrade: 6, shaftZone: "H", shaftGrade: 6 }, [249.963, 249.992, 249.971, 250, "DE TRANSICIÓN"]],
  // Las zonas superiores siguen siendo calculables por encima de 500 mm.
  [{ diameter: 600, holeZone: "K", holeGrade: 7, shaftZone: "H", shaftGrade: 6 }, [599.93, 600, 599.956, 600, "DE TRANSICIÓN"]],
  [{ diameter: 600, holeZone: "M", holeGrade: 7, shaftZone: "H", shaftGrade: 6 }, [599.904, 599.974, 599.956, 600, "DE TRANSICIÓN"]],
  [{ diameter: 600, holeZone: "N", holeGrade: 9, shaftZone: "H", shaftGrade: 6 }, [599.781, 599.956, 599.956, 600, "CON INTERFERENCIA"]],
  // Valores corregidos por las correcciones técnicas publicadas de las partes 1 y 2.
  [{ diameter: 4, holeZone: "JS", holeGrade: 1, shaftZone: "H", shaftGrade: 6 }, [3.9995, 4.0005, 3.992, 4, "DE TRANSICIÓN"]],
  [{ diameter: 8, holeZone: "JS", holeGrade: 1, shaftZone: "H", shaftGrade: 6 }, [7.9995, 8.0005, 7.991, 8, "DE TRANSICIÓN"]],
  [{ diameter: 110, holeZone: "S", holeGrade: 9, shaftZone: "H", shaftGrade: 6 }, [109.834, 109.921, 109.978, 110, "CON INTERFERENCIA"]],
  [{ diameter: 500, holeZone: "S", holeGrade: 9, shaftZone: "H", shaftGrade: 6 }, [499.593, 499.748, 499.96, 500, "CON INTERFERENCIA"]],
  [{ diameter: 15, holeZone: "S", holeGrade: 10, shaftZone: "H", shaftGrade: 6 }, [14.902, 14.972, 14.989, 15, "CON INTERFERENCIA"]],
  [{ diameter: 4, holeZone: "H", holeGrade: 7, shaftZone: "K", shaftGrade: 13 }, [4, 4.012, 4, 4.18, "DE TRANSICIÓN"]],
];

for (const [input, expected] of knownCases) {
  const result = calculate(input);
  assert.ok(!result.error, `${JSON.stringify(input)}: ${result.error}`);
  close(result.holeMin, expected[0], "holeMin");
  close(result.holeMax, expected[1], "holeMax");
  close(result.shaftMin, expected[2], "shaftMin");
  close(result.shaftMax, expected[3], "shaftMax");
  assert.strictEqual(result.classification, expected[4], `classification ${JSON.stringify(input)}`);
}

const invalidCases = [
  { diameter: 0, holeZone: "H", holeGrade: 8, shaftZone: "H", shaftGrade: 6 },
  { diameter: 3200, holeZone: "H", holeGrade: 8, shaftZone: "H", shaftGrade: 8 },
  { diameter: 100, holeZone: "A", holeGrade: 8, shaftZone: "H", shaftGrade: 6 },
  { diameter: 100, holeZone: "H", holeGrade: 0, shaftZone: "H", shaftGrade: 6 },
  { diameter: 100, holeZone: "H", holeGrade: 8.5, shaftZone: "H", shaftGrade: 6 },
  { diameter: 1, holeZone: "H", holeGrade: 14, shaftZone: "H", shaftGrade: 6 },
  { diameter: 1, holeZone: "H", holeGrade: 8, shaftZone: "H", shaftGrade: 14 },
  { diameter: 0.5, holeZone: "N", holeGrade: 9, shaftZone: "H", shaftGrade: 6 },
  { diameter: 24, holeZone: "T", holeGrade: 7, shaftZone: "H", shaftGrade: 6 },
  { diameter: 24, holeZone: "H", holeGrade: 7, shaftZone: "T", shaftGrade: 6 },
];

for (const input of invalidCases) {
  assert.ok(calculate(input).error, `La entrada inválida no fue rechazada: ${JSON.stringify(input)}`);
}
assert.ok(!calculate({ diameter: 24.000001, holeZone: "T", holeGrade: 7, shaftZone: "H", shaftGrade: 6 }).error, "T debe estar disponible para D > 24 mm");
assert.ok(!calculate({ diameter: 1.000001, holeZone: "H", holeGrade: 14, shaftZone: "H", shaftGrade: 6 }).error, "IT14 debe estar disponible para D > 1 mm");

function expectRestriction(diameter, holeZone, holeGrade, shaftZone, shaftGrade) {
  return diameter <= 1 && (holeGrade === 14 || shaftGrade === 14)
    || diameter <= 1 && holeZone === "N" && holeGrade > 8
    || diameter <= 24 && (holeZone === "T" || shaftZone === "T");
}

function checkInvariants(result, input) {
  close(result.holeUpper - result.holeLower, result.holeIT, `ancho agujero ${JSON.stringify(input)}`);
  close(result.shaftUpper - result.shaftLower, result.shaftIT, `ancho eje ${JSON.stringify(input)}`);
  assert.ok(result.holeMin <= result.holeMax, `límites agujero invertidos: ${JSON.stringify(input)}`);
  assert.ok(result.shaftMin <= result.shaftMax, `límites eje invertidos: ${JSON.stringify(input)}`);
  close(result.clearanceMin, result.holeMin - result.shaftMax, `juego mínimo ${JSON.stringify(input)}`);
  close(result.clearanceMax, result.holeMax - result.shaftMin, `juego máximo ${JSON.stringify(input)}`);
  assert.ok(["CON JUEGO", "DE TRANSICIÓN", "CON INTERFERENCIA"].includes(result.classification), `clasificación desconocida: ${JSON.stringify(input)}`);
}

const boundaryDiameters = new Set([0.5, 1, 1.000001, 3, 3.000001, 24, 24.000001, 250, 250.000001, 315, 500, 500.000001, 3150]);
for (const band of [...data.itBands, ...data.deviationBands]) {
  if (band.max > 0 && band.max <= 3150) boundaryDiameters.add(band.max);
  if (band.max > 0 && band.max < 3150) boundaryDiameters.add(Math.min(3150, band.max + 0.000001));
}

let matrixChecks = 0;
for (const diameter of [...boundaryDiameters].sort((a, b) => a - b)) {
  for (const zone of data.zones) {
    for (let grade = 1; grade <= 14; grade += 1) {
      const holeInput = { diameter, holeZone: zone, holeGrade: grade, shaftZone: "H", shaftGrade: 6 };
      const shaftInput = { diameter, holeZone: "H", holeGrade: 8, shaftZone: zone, shaftGrade: grade };
      for (const input of [holeInput, shaftInput]) {
        const result = calculate(input);
        if (expectRestriction(diameter, input.holeZone, input.holeGrade, input.shaftZone, input.shaftGrade)) {
          assert.ok(result.error, `Faltó rechazar la restricción: ${JSON.stringify(input)}`);
        } else {
          assert.ok(!result.error, `${JSON.stringify(input)}: ${result.error}`);
          checkInvariants(result, input);
        }
        matrixChecks += 1;
      }
    }
  }
}

console.log(`OK: ${knownCases.length} casos de referencia, ${invalidCases.length + 2} límites y ${matrixChecks} combinaciones de borde verificadas`);
