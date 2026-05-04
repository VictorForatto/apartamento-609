const SUPABASE_URL = "https://hyopntdqlmvivlcfsvoh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5b3BudGRxbG12aXZsY2Zzdm9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0Mjc2MTYsImV4cCI6MjA5MjAwMzYxNn0.HuSBNc9X-G1K2ZUqJz71Gd8JzFS50fUFrqu8OmvYTC4";

let giftSelecionado = null;

// ---------- UTIL ----------
function escapeApostrophe(str = "") {
  return str.replace(/'/g, "\\'");
}

// Helper para parsear retorno do RPC (às vezes vem string, às vezes objeto)
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

// ---------- LISTA PRESENTES ----------
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

    presentes.forEach((presente) => {

      const total = presente.quantity_total ?? 1;
      const reservadas = presente.quantity_reserved ?? 0;
      const disponiveis = total - reservadas;
      const isDisponivel = disponiveis > 0;

      const div = document.createElement("div");
      div.className = `gift ${isDisponivel ? "" : "gift--reserved"}`;

      div.innerHTML = `
        <div class="gift-top">
          <h4 class="gift-name">${presente.name}</h4>
          ${
            presente.price_range
              ? `<span class="gift-price-pill"><span class="gift-price-label">Faixa de preço:</span> ${presente.price_range}</span>`
              : ""
          }
        </div>

        ${presente.description ? `<p class="gift-description">${presente.description}</p>` : ""}


        <p class="gift-status">
          <strong>Disponível:</strong>
          ${disponiveis} de ${total}
        </p>

        ${
          !isDisponivel
            ? `<p class="gift-note">Obrigado! Este item já foi reservado 🤍</p>`
            : ""
        }


        ${
          disponiveis > 0
            ? `<button class="reserve-btn"
                 onclick="abrirFormulario('${presente.id}', '${escapeApostrophe(presente.name)}')">
                 Selecionar presente
               </button>`
            : `<p class="gift-note">Todas as unidades já foram reservadas 🤍</p>`
        }

      `;

      lista.appendChild(div);
    });
  } catch (e) {
    console.error(e);
    lista.innerHTML = `<p style="color:#b91c1c;">Falha ao carregar lista (ver Console).</p>`;
  }
}

// ---------- MODAL ----------
function abrirFormulario(id, nome) {
  giftSelecionado = id;
  const title = document.getElementById("modal-title");
  if (title) title.innerText = `Você irá nos presentear com um(a): ${nome}`;

  const overlay = document.getElementById("modal-overlay");
  if (overlay) overlay.style.display = "flex";
}

function fecharModal() {
  const overlay = document.getElementById("modal-overlay");
  if (overlay) overlay.style.display = "none";
}

// expõe para o onclick funcionar
window.abrirFormulario = abrirFormulario;
window.fecharModal = fecharModal;

// ---------- CONFIRMAR RESERVA ----------
async function confirmarReserva() {

  const nome = (document.getElementById("nome")?.value || "").trim();
  const email = (document.getElementById("email")?.value || "").trim();
  const mensagem = (document.getElementById("mensagem")?.value || "").trim();
  const quantidade = parseInt(
    document.getElementById("quantidade")?.value || "1",
    10
  );

  if (!quantidade || quantidade < 1) {
  return alert("Informe uma quantidade válida.");
  }

  if (!giftSelecionado) return alert("Nenhum presente selecionado.");
  if (nome.length < 2) return alert("Por favor, informe seu nome.");
  if (!email.includes("@")) return alert("Por favor, informe um e-mail válido.");

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
        p_name: nome,
        p_email: email,
        p_message: mensagem || null
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      alert("Não foi possível reservar. Talvez alguém já tenha reservado este item.\n\n" + errText);
      return;
    }

    const reservationId = await parseRpcReturn(resp);

    // atualiza UI imediatamente
    fecharModal();
    document.getElementById("nome").value = "";
    document.getElementById("email").value = "";
    document.getElementById("mensagem").value = "";

    alert("Reserva registrada! 💚 Obrigado pelo carinho!");
    carregarPresentes();

    // ✅ por enquanto, NÃO deixa e-mail quebrar nada
    // Só tentamos disparar se reservationId existir
    if (reservationId) {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-reservation-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`
          },
          body: JSON.stringify({
            reservation_id: reservationId
          })
        });
      } catch (e) {
        console.warn("Falha ao enviar e-mail:", e);
      }
    }

  } catch (e) {
    console.error(e);
    alert("Erro ao reservar. Tente novamente em instantes.");
  }
}

window.confirmarReserva = confirmarReserva;

// ---------- START ----------
document.addEventListener("DOMContentLoaded", () => {
  carregarPresentes();
});


