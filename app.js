const $ = (id) => document.getElementById(id);

function showOutput(id, html, type = "success") {
  const el = $(id);
  el.className = "output " + type;
  el.innerHTML = html;
}

async function api(path, data) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Something went wrong.");
  return result;
}

async function checkBackend() {
  try {
    const r = await fetch("/api/health");
    if (!r.ok) throw new Error("offline");
    $("backendStatus").textContent = "Backend connected";
    $("backendStatus").style.color = "#087443";
  } catch {
    $("backendStatus").textContent = "Backend not connected";
    $("backendStatus").style.color = "#b42318";
  }
}

document.querySelectorAll(".tab").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    button.classList.add("active");
    $(button.dataset.panel).classList.add("active");
  });
});

$("convertBtn").addEventListener("click", async () => {
  try {
    const r = await api("/api/convert", {
      value: $("convertValue").value,
      from: $("convertFrom").value
    });
    showOutput("convertOutput", `
      <strong>Conversion result</strong>
      <div class="result-grid">
        <div class="result-cell"><small>Decimal</small><strong>${r.decimal}</strong></div>
        <div class="result-cell"><small>Binary</small><strong>${r.binary}</strong></div>
        <div class="result-cell"><small>Hexadecimal</small><strong>${r.hexadecimal}</strong></div>
      </div>`);
  } catch (e) { showOutput("convertOutput", e.message, "error"); }
});

$("addressBtn").addEventListener("click", async () => {
  try {
    const r = await api("/api/effective-address", {
      mode: $("addressMode").value,
      address: $("addressField").value,
      register: $("registerValue").value,
      displacement: $("displacement").value
    });
    showOutput("addressOutput", `<strong>Result: ${r.result}</strong><br>${r.formula}<br><br>${r.explanation}`);
  } catch (e) { showOutput("addressOutput", e.message, "error"); }
});

$("simulateBtn").addEventListener("click", async () => {
  try {
    const r = await api("/api/simulate", {
      instruction: $("instruction").value,
      a: $("operandA").value,
      b: $("operandB").value,
      initial: $("initialValue").value
    });
    showOutput("simulateOutput", `<strong>${r.instruction} result: ${r.result}</strong><br>${r.explanation}${r.binary ? `<br>Unsigned 32-bit binary representation: ${r.binary}` : ""}`);
  } catch (e) { showOutput("simulateOutput", e.message, "error"); }
});

$("encodeBtn").addEventListener("click", async () => {
  try {
    const r = await api("/api/encode", {
      opcode: $("opcode").value, rd: $("rd").value,
      rs1: $("rs1").value, rs2: $("rs2").value,
      func: $("func").value
    });
    const rows = r.fields.map(f => `<div class="result-cell"><small>${f.name} (${f.bits} bits)</small><strong>${f.binary}</strong></div>`).join("");
    showOutput("encodeOutput", `<strong>16-bit instruction</strong><div class="result-grid">${rows}</div><p><strong>Binary:</strong> ${r.binary}<br><strong>Hexadecimal:</strong> ${r.hex}</p><small>${r.note}</small>`);
  } catch (e) { showOutput("encodeOutput", e.message, "error"); }
});

const questions = [
  { q: "What does ISA stand for?", a: ["Internal Storage Array", "Instruction Set Architecture", "Integrated System Application"], correct: 1, why: "ISA means Instruction Set Architecture." },
  { q: "Which part of a processor architecture defines the instructions software can use?", a: ["ISA", "Monitor", "Power supply"], correct: 0, why: "The ISA defines the programmer-visible instructions and related rules." },
  { q: "Which instruction is commonly used to add two values?", a: ["STORE", "JUMP", "ADD"], correct: 2, why: "ADD performs an addition operation." },
  { q: "In indexed addressing, a common effective-address formula is:", a: ["Address field + index register", "Opcode × register", "Instruction length only"], correct: 0, why: "Indexed addressing commonly adds the address field and index register." },
  { q: "Which is an example of a RISC ISA?", a: ["RISC-V", "HTML", "USB"], correct: 0, why: "RISC-V is an open standard RISC instruction set architecture." }
];

function renderQuiz() {
  $("quizQuestions").innerHTML = questions.map((q, i) => `
    <div class="quiz-item">
      <p>${i + 1}. ${q.q}</p>
      ${q.a.map((answer, j) => `<label><input type="radio" name="q${i}" value="${j}"> ${answer}</label>`).join("")}
    </div>`).join("");
}
$("quizSubmit").addEventListener("click", () => {
  let score = 0;
  const feedback = questions.map((q, i) => {
    const selected = document.querySelector(`input[name="q${i}"]:checked`);
    if (selected && Number(selected.value) === q.correct) score++;
    return `<p><strong>Q${i + 1}:</strong> ${selected && Number(selected.value) === q.correct ? "Correct" : "Review"} — ${q.why}</p>`;
  }).join("");
  showOutput("quizOutput", `<strong>Your score: ${score} / ${questions.length}</strong>${feedback}`, "success");
});
$("quizReset").addEventListener("click", () => {
  document.querySelectorAll('#quizQuestions input').forEach(input => input.checked = false);
  showOutput("quizOutput", "Choose one answer for each question.", "");
});

renderQuiz();
checkBackend();
