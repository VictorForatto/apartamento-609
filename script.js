const SUPABASE_URL = "https://hyopntdqlmvivlcfsvoh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5b3BudGRxbG12aXZsY2Zzdm9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0Mjc2MTYsImV4cCI6MjA5MjAwMzYxNn0.HuSBNc9X-G1K2ZUqJz71Gd8JzFS50fUFrqu8OmvYTC4";

let giftSelecionado = null;
let rsvpSelecionado  = null; // ID do convidado selecionado na lista

// ---------- UTIL ----------
function escapeApostrophe(str = "") {
  return str.replace(/'/g, "\\'");
}

/*
  toTitleCase():
  Normaliza qualquer variação de capitalização para Title Case.
  Exemplos:
    "victor forato"  → "Victor Forato"
    "VICTOR FORATO"  → "Victor Forato"
    "vIcToR fOrAtO"  → "Victor Forato"

  Como funciona:
  - toLowerCase() garante que tudo fique minúsculo primeiro
  - split(" ") quebra em palavras individuais
  - filter(Boolean) remove espaços duplos acidentais
  - map() pega a primeira letra de cada palavra e a coloca em
    maiúsculo, concatenando com o restante
  - join(" ") reconstrói a string final
*/
function toTitleCase(str = "") {
  return str
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function parseRpcReturn(resp) {
  const data = await resp.json();
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    if (data.id) return data.id;
    const firstKey = Object.keys(data)[0];
    if (firstKey) return data[firstKey];
  }
  return null;
}

// ---------- TOAST ----------
let toastTimer = null;

function showToast(message, type = "success", duration = 3500) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  clearTimeout(toastTimer);
  toast.classList.remove("toast--visible", "toast--success", "toast--error");
  void toast.offsetWidth;

  toast.textContent = message;
  toast.classList.add("toast--visible", `toast--${type}`);

  toastTimer = setTimeout(() => {
    toast.classList.remove("toast--visible");
  }, duration);
}

// ============================================================
// CONFIRMAÇÃO DE PRESENÇA — DROPDOWN (RSVP)
// ============================================================

let convidadosCarregados = false;

/*
  toggleListaConvidados():
  Abre/fecha o accordion. Na primeira abertura busca os
  convidados do banco e popula o <select>.
  Após confirmação bem-sucedida, chamamos fecharAccordion()
  para recolher automaticamente.
*/
function toggleListaConvidados() {
  const body = document.getElementById("rsvp-accordion-body");
  const btn  = document.getElementById("rsvp-accordion-btn");
  if (!body || !btn) return;

  const isOpen = body.classList.contains("rsvp-accordion-body--open");

  if (isOpen) {
    body.classList.remove("rsvp-accordion-body--open");
    btn.classList.remove("rsvp-accordion-btn--open");
  } else {
    body.classList.add("rsvp-accordion-body--open");
    btn.classList.add("rsvp-accordion-btn--open");
    if (!convidadosCarregados) {
      carregarConvidadosNoSelect();
      convidadosCarregados = true;
    }
  }
}

function fecharAccordion() {
  const body = document.getElementById("rsvp-accordion-body");
  const btn  = document.getElementById("rsvp-accordion-btn");
  if (body) body.classList.remove("rsvp-accordion-body--open");
  if (btn)  btn.classList.remove("rsvp-accordion-btn--open");
}

/*
  carregarConvidadosNoSelect():
  Busca convidados do banco e popula o <select>.
  - Pendentes aparecem normalmente como opções selecionáveis
  - Confirmados aparecem com "(já confirmado)" e ficam desabilitados
  - Um option vazio no topo serve como placeholder
*/
async function carregarConvidadosNoSelect() {
  const select = document.getElementById("rsvp-select");
  if (!select) return;

  select.innerHTML = `<option value="">Carregando...</option>`;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rsvp?select=id,name,confirmed&order=name.asc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    if (!response.ok) throw new Error("Erro ao buscar convidados");

    const convidados = await response.json();

    // Option vazio como placeholder — valor "" impede confirmação acidental
    select.innerHTML = `<option value="">Selecione seu nome...</option>`;

    convidados.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;

      if (c.confirmed) {
        // Desabilitado para quem já confirmou
        opt.textContent = `${c.name} ✓ (já confirmado)`;
        opt.disabled = true;
        opt.style.color = "#6b7280";
      } else {
        opt.textContent = c.name;
      }

      select.appendChild(opt);
    });

  } catch (e) {
    console.error(e);
    select.innerHTML = `<option value="">Erro ao carregar — tente reabrir</option>`;
    convidadosCarregados = false; // permite tentar novamente
  }
}

/*
  abrirModalRsvpDoSelect():
  Lê o valor selecionado no <select> e abre o modal de e-mail.
  Validação: impede abrir o modal se nenhum nome foi escolhido.
*/
function abrirModalRsvpDoSelect() {
  const select = document.getElementById("rsvp-select");
  if (!select) return;

  const id   = select.value;
  const nome = select.options[select.selectedIndex]?.text;

  if (!id) {
    return showToast("Selecione seu nome antes de confirmar.", "error");
  }

  abrirModalRsvp(id, nome);
}

function abrirModalRsvp(id, nome) {
  rsvpSelecionado = id;

  const title = document.getElementById("rsvp-modal-title");
  if (title) title.innerText = `Olá, ${nome}! 💚`;

  const emailInput = document.getElementById("rsvp-email");
  if (emailInput) emailInput.value = "";

  const overlay = document.getElementById("rsvp-modal-overlay");
  if (overlay) overlay.style.display = "flex";
}

function fecharModalRsvp() {
  const overlay = document.getElementById("rsvp-modal-overlay");
  if (overlay) overlay.style.display = "none";
  rsvpSelecionado = null;
}

window.toggleListaConvidados   = toggleListaConvidados;
window.abrirModalRsvpDoSelect  = abrirModalRsvpDoSelect;
window.abrirModalRsvp          = abrirModalRsvp;
window.fecharModalRsvp         = fecharModalRsvp;

/*
  confirmarPresenca():
  - Valida o e-mail informado
  - Chama o RPC confirm_rsvp(p_id, p_email) no Supabase
  - Em caso de sucesso: fecha modal, atualiza a lista no DOM,
    exibe toast e dispara e-mail via Edge Function
*/
async function confirmarPresenca() {
  const email = (document.getElementById("rsvp-email")?.value || "").trim();

  if (!email.includes("@")) {
    return showToast("Por favor, informe um e-mail válido.", "error");
  }

  if (!rsvpSelecionado) {
    return showToast("Nenhum convidado selecionado.", "error");
  }

  const btn = document.querySelector("#rsvp-modal-overlay .confirm-btn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Aguarde...";
  }

  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/confirm_rsvp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({
        p_id:    rsvpSelecionado,
        p_email: email
      })
    });

    if (!resp.ok) {
      let msg = "Não foi possível confirmar presença.";
      try {
        const errText = await resp.text();
        if (errText.includes("Presença já confirmada")) {
          msg = "Esta presença já foi confirmada anteriormente 💚";
        }
      } catch (_) {}
      showToast(msg, "error");
      return;
    }

    const rsvpId = await parseRpcReturn(resp);

    fecharModalRsvp();
    fecharAccordion();  // fecha o accordion automaticamente após confirmar
    showToast("Presença confirmada! Até lá 🥂💚", "success", 4500);

    // Força recarga do select na próxima abertura para refletir o novo confirmado
    convidadosCarregados = false;

    // Dispara e-mail — fire and forget
    if (rsvpId) {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-rsvp-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`
          },
          body: JSON.stringify({ rsvp_id: rsvpId })
        });
      } catch (e) {
        console.warn("Falha ao enviar e-mail de presença:", e);
      }
    }

  } catch (e) {
    console.error(e);
    showToast("Erro ao confirmar presença. Tente novamente.", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Confirmar presença";
    }
  }
}

window.confirmarPresenca = confirmarPresenca;

// ============================================================
// LISTA DE PRESENTES
// ============================================================
async function carregarPresentes() {
  const lista = document.getElementById("lista-presentes");
  if (!lista) return;

  lista.innerHTML = `<p style="color:#666;">Carregando presentes...</p>`;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/gifts?select=*&order=price_order.asc.nullslast`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    if (!response.ok) {
      const err = await response.text();
      lista.innerHTML = `<p style="color:#b91c1c;">Erro ao carregar lista: ${err}</p>`;
      return;
    }

    const presentes = await response.json();
    lista.innerHTML = "";

    // Busca todas as reservas para exibir quem reservou cada item
    // Fazemos uma segunda requisição paralela para não atrasar a lista
    let todasReservas = [];
    try {
      const resReservas = await fetch(
        `${SUPABASE_URL}/rest/v1/reservations?select=gift_id,reserved_by_name,quantity&order=created_at.asc`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      if (resReservas.ok) todasReservas = await resReservas.json();
    } catch (_) { /* falha silenciosa — não impede a lista de carregar */ }

    // Agrupa as reservas por gift_id para acesso rápido no forEach
    // Resultado: { "uuid-do-gift": ["Nome A", "Nome B (x2)"], ... }
    const reservasPorGift = todasReservas.reduce((acc, r) => {
      if (!acc[r.gift_id]) acc[r.gift_id] = [];
      const label = r.quantity > 1
        ? `${r.reserved_by_name} (x${r.quantity})`
        : r.reserved_by_name;
      acc[r.gift_id].push(label);
      return acc;
    }, {});

    const { totalGeral, reservadasGeral } = presentes.reduce(
      (acc, p) => ({
        totalGeral:     acc.totalGeral     + (p.quantity_total    ?? 1),
        reservadasGeral: acc.reservadasGeral + (p.quantity_reserved ?? 0),
      }),
      { totalGeral: 0, reservadasGeral: 0 }
    );

    const contador = document.createElement("p");
    contador.className = "gifts-counter";
    contador.innerHTML = `💚 <strong>${reservadasGeral}</strong> de <strong>${totalGeral}</strong> presentes já reservados`;
    lista.appendChild(contador);

    const tudoReservado = presentes.every(
      (p) => (p.quantity_reserved ?? 0) >= (p.quantity_total ?? 1)
    );

    if (tudoReservado) {
      const vazio = document.createElement("div");
      vazio.className = "gifts-empty";
      vazio.innerHTML = `
        <p class="gifts-empty-emoji">🎉</p>
        <h4>Todos os presentes foram reservados!</h4>
        <p>Ficamos sem palavras de tanta gratidão.<br>Cada gesto de carinho de vocês significa muito para nós 🤍</p>
      `;
      lista.appendChild(vazio);
      return;
    }

    presentes.forEach((presente) => {
      const total      = presente.quantity_total    ?? 1;
      const reservadas = presente.quantity_reserved ?? 0;
      const disponiveis = total - reservadas;
      const isDisponivel = disponiveis > 0;

      let links = [];
      try {
        const parsed = JSON.parse(presente.reference_links || "[]");
        links = Array.isArray(parsed)
          ? parsed.filter((l) => typeof l === "string" && l.startsWith("http"))
          : [];
      } catch (_) { links = []; }

      const linksHTML = links.length > 0
        ? `<div class="gift-links">
             ${links.map((url, i) =>
               `<a class="gift-link-btn" href="${url}" target="_blank" rel="noopener noreferrer">
                  Ver sugestão de produto${links.length > 1 ? ` ${i + 1}` : ""} 🔗
                </a>`
             ).join("")}
           </div>`
        : "";

      const div = document.createElement("div");
      div.className = `gift ${isDisponivel ? "" : "gift--reserved"}`;

      div.innerHTML = `
        <div class="gift-top">
          <h4 class="gift-name">${presente.name}</h4>
          ${presente.price_range
            ? `<span class="gift-price-pill"><span class="gift-price-label">Faixa de preço:</span> ${presente.price_range}</span>`
            : ""}
        </div>
        ${presente.description ? `<p class="gift-description">${presente.description}</p>` : ""}
        ${linksHTML}
        <p class="gift-status"><strong>Disponível:</strong> ${disponiveis} de ${total}</p>
        ${(() => {
          // Monta o bloco de nomes dos reservantes para itens esgotados
          // A IIFE (função auto-executada) permite lógica complexa dentro do template string
          const nomes = reservasPorGift[presente.id] || [];
          if (!isDisponivel && nomes.length > 0) {
            const listaFormatada = nomes
              .map(n => `<span class="gift-reserver-name">${n}</span>`)
              .join("");
            return `<p class="gift-note gift-note--reserved">
                      Reservado por: ${listaFormatada}
                    </p>`;
          }
          return "";
        })()}
        ${disponiveis > 0
          ? `<button class="reserve-btn" onclick="abrirFormulario('${presente.id}', '${escapeApostrophe(presente.name)}')">
               Selecionar presente
             </button>`
          : `<p class="gift-note">Todas as unidades já foram reservadas 🤍</p>`}
      `;

      lista.appendChild(div);
    });

  } catch (e) {
    console.error(e);
    lista.innerHTML = `<p style="color:#b91c1c;">Falha ao carregar lista (ver Console).</p>`;
  }
}

// ============================================================
// MODAL DE PRESENTE
// ============================================================
async function abrirFormulario(id, nome) {
  giftSelecionado = id;

  const title = document.getElementById("modal-title");
  if (title) title.innerText = `Você irá nos presentear com um(a): ${nome}`;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/gifts?id=eq.${id}&select=quantity_total,quantity_reserved`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (!response.ok) throw new Error();

    const data  = await response.json();
    const gift  = data[0];
    const total      = gift.quantity_total    ?? 1;
    const reservadas = gift.quantity_reserved ?? 0;
    const disponiveis = total - reservadas;

    const quantidadeInput = document.getElementById("quantidade");
    if (quantidadeInput) { quantidadeInput.max = disponiveis; quantidadeInput.value = 1; }

    const quantidadeWrapper = document.getElementById("quantidade-wrapper");
    if (quantidadeWrapper) quantidadeWrapper.style.display = total <= 1 ? "none" : "block";

  } catch (e) { console.warn("Não foi possível carregar quantidade:", e); }

  const overlay = document.getElementById("modal-overlay");
  if (overlay) overlay.style.display = "flex";
}

function fecharModal() {
  const overlay = document.getElementById("modal-overlay");
  if (overlay) overlay.style.display = "none";
}

window.abrirFormulario = abrirFormulario;
window.fecharModal     = fecharModal;

// ============================================================
// CONFIRMAR RESERVA DE PRESENTE
// ============================================================
async function confirmarReserva() {
  // toTitleCase() normaliza o nome antes de qualquer validação ou envio
  // "victor forato" / "VICTOR FORATO" / "vIcToR" → "Victor Forato"
  const nome      = toTitleCase((document.getElementById("nome")?.value    || "").trim());
  const email     = (document.getElementById("email")?.value   || "").trim();
  const mensagem  = (document.getElementById("mensagem")?.value || "").trim();
  const quantidade = parseInt(document.getElementById("quantidade")?.value || "1", 10);

  if (!quantidade || quantidade < 1) return showToast("Informe uma quantidade válida.", "error");
  if (!giftSelecionado)              return showToast("Nenhum presente selecionado.", "error");
  if (nome.length < 2)               return showToast("Por favor, informe seu nome.", "error");
  if (!email.includes("@"))          return showToast("Por favor, informe um e-mail válido.", "error");

  const confirmBtn = document.querySelector(".confirm-btn");
  if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = "Aguarde..."; }

  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/reserve_gift`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({
        p_gift_id: giftSelecionado,
        p_name:    nome,
        p_email:   email,
        p_message: mensagem || null,
        p_quantity: quantidade
      })
    });

    if (!resp.ok) {
      let errorMessage = "Não foi possível realizar a reserva.";
      try {
        const errText = await resp.text();
        if (errText.includes("Quantidade solicitada maior que o disponível"))
          errorMessage = "A quantidade escolhida é maior do que a disponível 🤍 Escolha uma quantidade menor.";
        else if (errText.includes("Presente já está totalmente reservado"))
          errorMessage = "Este presente já foi totalmente reservado 🤍";
      } catch (_) {}
      showToast(errorMessage, "error");
      return;
    }

    const reservationId = await parseRpcReturn(resp);

    fecharModal();
    document.getElementById("nome").value     = "";
    document.getElementById("email").value    = "";
    document.getElementById("mensagem").value = "";

    showToast("Reserva registrada! 💚 Obrigado pelo carinho!", "success");
    carregarPresentes();

    if (reservationId) {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-reservation-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`
          },
          body: JSON.stringify({ reservation_id: reservationId })
        });
      } catch (e) { console.warn("Falha ao enviar e-mail:", e); }
    }

  } catch (e) {
    console.error(e);
    showToast("Erro ao reservar. Tente novamente em instantes.", "error");
  } finally {
    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = "Confirmar"; }
  }
}

window.confirmarReserva = confirmarReserva;

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  // Fecha modal de presente ao clicar fora
  const overlay = document.getElementById("modal-overlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => { if (e.target === overlay) fecharModal(); });
  }

  // Fecha modal de presença ao clicar fora
  const rsvpOverlay = document.getElementById("rsvp-modal-overlay");
  if (rsvpOverlay) {
    rsvpOverlay.addEventListener("click", (e) => { if (e.target === rsvpOverlay) fecharModalRsvp(); });
  }

  carregarPresentes();
});
