const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function toSafeInteger(value, name) {
  const n = Number(value);
  if (!Number.isSafeInteger(n)) {
    throw new Error(`${name} must be a whole number within the safe integer range.`);
  }
  return n;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "ISA Problem Solver backend is running." });
});

app.post("/api/convert", (req, res) => {
  try {
    const { value, from } = req.body;
    const raw = String(value ?? "").trim();
    if (!raw) return res.status(400).json({ error: "Enter a number to convert." });

    let decimal;
    if (from === "binary") {
      if (!/^[01]+$/.test(raw)) return res.status(400).json({ error: "Binary numbers can contain only 0 and 1." });
      decimal = parseInt(raw, 2);
    } else if (from === "hex") {
      if (!/^[0-9a-f]+$/i.test(raw)) return res.status(400).json({ error: "Enter a valid hexadecimal number." });
      decimal = parseInt(raw, 16);
    } else {
      if (!/^-?\\d+$/.test(raw)) return res.status(400).json({ error: "Enter a valid decimal whole number." });
      decimal = Number(raw);
    }

    if (!Number.isSafeInteger(decimal)) return res.status(400).json({ error: "Number is too large." });
    res.json({
      input: raw,
      decimal,
      binary: decimal < 0 ? "-" + Math.abs(decimal).toString(2) : decimal.toString(2),
      hexadecimal: decimal < 0 ? "-" + Math.abs(decimal).toString(16).toUpperCase() : decimal.toString(16).toUpperCase()
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/effective-address", (req, res) => {
  const { mode, address, register, displacement } = req.body;
  const base = Number(address);
  const reg = Number(register || 0);
  const disp = Number(displacement || 0);

  if (![base, reg, disp].every(Number.isFinite)) {
    return res.status(400).json({ error: "Address, register and displacement must be valid numbers." });
  }

  let result;
  let explanation;
  switch (mode) {
    case "direct":
      result = base;
      explanation = "Direct addressing: the address field itself identifies the memory location.";
      break;
    case "indirect":
      result = base;
      explanation = "Indirect addressing: the address field points to a memory location containing the effective address. This demo displays the supplied pointer location; it does not model physical memory contents.";
      break;
    case "register":
      result = reg;
      explanation = "Register addressing: the operand is in the selected register; no memory effective address is calculated.";
      break;
    case "indexed":
      result = base + reg;
      explanation = "Indexed addressing: effective address = address field + index register.";
      break;
    case "base-displacement":
      result = reg + disp;
      explanation = "Base plus displacement: effective address = base register + displacement.";
      break;
    default:
      return res.status(400).json({ error: "Choose a supported addressing mode." });
  }

  res.json({ mode, result, explanation, formula:
    mode === "indexed" ? `${base} + ${reg} = ${result}` :
    mode === "base-displacement" ? `${reg} + ${disp} = ${result}` :
    mode === "register" ? `Register value = ${result}` : `Address field = ${result}`
  });
});

// Small educational register-machine simulator (not a real processor ISA).
app.post("/api/simulate", (req, res) => {
  const { instruction, a, b, initial = 0 } = req.body;
  const x = Number(a);
  const y = Number(b);
  const start = Number(initial);

  if (![x, y, start].every(Number.isFinite)) {
    return res.status(400).json({ error: "Enter valid numeric operands." });
  }

  let result;
  let explanation;
  switch (instruction) {
    case "ADD": result = x + y; explanation = `ADD: ${x} + ${y}`; break;
    case "SUB": result = x - y; explanation = `SUB: ${x} - ${y}`; break;
    case "MUL": result = x * y; explanation = `MUL: ${x} × ${y}`; break;
    case "AND": result = (x | 0) & (y | 0); explanation = `AND: bitwise ${x} AND ${y}`; break;
    case "OR": result = (x | 0) | (y | 0); explanation = `OR: bitwise ${x} OR ${y}`; break;
    case "XOR": result = (x | 0) ^ (y | 0); explanation = `XOR: bitwise ${x} XOR ${y}`; break;
    case "LOAD": result = x; explanation = `LOAD: copy the supplied value ${x} into the destination register.`; break;
    case "INC": result = start + 1; explanation = `INC: increment initial register value ${start} by 1.`; break;
    default: return res.status(400).json({ error: "Choose a supported instruction." });
  }

  res.json({ instruction, result, explanation, binary: Number.isInteger(result) ? (result >>> 0).toString(2) : null });
});

// Demonstration 16-bit educational instruction encoder:
// opcode(4) | destination(3) | source1(3) | source2(3) | function(3)
app.post("/api/encode", (req, res) => {
  const { opcode, rd, rs1, rs2, func = 0 } = req.body;
  const fields = [
    ["Opcode", Number(opcode), 4],
    ["Destination register", Number(rd), 3],
    ["Source register 1", Number(rs1), 3],
    ["Source register 2", Number(rs2), 3],
    ["Function", Number(func), 3]
  ];
  for (const [name, value, bits] of fields) {
    if (!Number.isInteger(value) || value < 0 || value >= (1 << bits)) {
      return res.status(400).json({ error: `${name} must be from 0 to ${(1 << bits) - 1} (${bits} bits).` });
    }
  }
  const binary = fields.map(([, value, bits]) => value.toString(2).padStart(bits, "0")).join("");
  res.json({
    binary,
    hex: parseInt(binary, 2).toString(16).toUpperCase().padStart(4, "0"),
    fields: fields.map(([name, value, bits]) => ({ name, value, bits, binary: value.toString(2).padStart(bits, "0") })),
    note: "This is a simplified teaching format created for this project. Actual instruction formats differ between ISAs such as ARM, RISC-V and x86."
  });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`ISA Problem Solver running at http://localhost:${PORT}`);
});
