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

// ---------- TOAST ----------
/*
  showToast() substitui todos os alert() do projeto.

  Como funciona:
  1. Pega o elemento #toast (já existe no HTML, oculto por padrão via CSS)
  2. Define o texto e o tipo visual (success = verde, error = vermelho)
  3. Adiciona a classe CSS "toast--visible" que dispara a animação de entrada
  4. Após `duration` ms, remove a classe — o CSS cuida da saída suavemente
  5. O clearTimeout garante que chamadas rápidas em sequência não se sobreponham
*/
let toastTimer = null;

function showToast(message, type = "success", duration = 3500) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  // Cancela qualquer toast anterior que ainda esteja na tela
  clearTimeout(toastTimer);
  toast.classList.remove("toast--visible", "toast--success", "toast--error");

  // Força reflow para reiniciar a animação caso o toast já estivesse visível.
  // Sem isso, remover e adicionar a classe no mesmo frame não reinicia a transição.
  void toast.offsetWidth;

  toast.textContent = message;
  toast.classList.add("toast--visible", `toast--${type}`);

  toastTimer = setTimeout(() => {
    toast.classList.remove("toast--visible");
  }, duration);
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
async function abrirFormulario(id, nome) {
  giftSelecionado = id;

  const title = document.getElementById("modal-title");
  if (title) {
    title.innerText = `Você irá nos presentear com um(a): ${nome}`;
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/gifts?id=eq.${id}&select=quantity_total,quantity_reserved`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    if (!response.ok) throw new Error("Falha ao buscar quantidade do presente");

    const data = await response.json();
    const gift = data[0];

    const total = gift.quantity_total ?? 1;
    const reservadas = gift.quantity_reserved ?? 0;
    const disponiveis = total - reservadas;

    const quantidadeInput = document.getElementById("quantidade");
    if (quantidadeInput) {
      quantidadeInput.max = disponiveis;
      quantidadeInput.value = 1;
    }

  } catch (e) {
    console.warn("Não foi possível carregar a quantidade disponível:", e);
  }

  const overlay = document.getElementById("modal-overlay");
  if (overlay) overlay.style.display = "flex";
}

function fecharModal() {
  const overlay = document.getElementById("modal-overlay");
  if (overlay) overlay.style.display = "none";
}

// ✅ FIX 2: Fechar modal ao clicar fora do conteúdo
/*
  O overlay (#modal-overlay) ocupa a tela inteira.
  O conteúdo real (.modal-content) fica centralizado dentro dele.

  Quando o usuário clica no overlay, o evento dispara nele — mas
  se clicar dentro do .modal-content, o evento "borbulha" (bubble)
  até o overlay também.

  A verificação `event.target === overlay` distingue os dois casos:
  - Clicou no fundo escuro (target É o overlay)  → fecha
  - Clicou dentro do card branco (target É outro elemento) → ignora
*/
document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("modal-overlay");
  if (overlay) {
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        fecharModal();
      }
    });
  }

  carregarPresentes();
});

// expõe para os onclick inline funcionarem
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

  // ✅ FIX 3: showToast() no lugar de alert() em todas as validações
  if (!quantidade || quantidade < 1) {
    return showToast("Informe uma quantidade válida.", "error");
  }
  if (!giftSelecionado) return showToast("Nenhum presente selecionado.", "error");
  if (nome.length < 2) return showToast("Por favor, informe seu nome.", "error");
  if (!email.includes("@")) return showToast("Por favor, informe um e-mail válido.", "error");

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
        p_message: mensagem || null,
        p_quantity: quantidade
      })
    });

    if (!resp.ok) {
      let errorMessage = "Não foi possível realizar a reserva.";

      try {
        const errText = await resp.text();
        if (errText.includes("Quantidade solicitada maior que o disponível")) {
          errorMessage = "A quantidade escolhida é maior do que a disponível 🤍 Escolha uma quantidade menor.";
        } else if (errText.includes("Presente já está totalmente reservado")) {
          errorMessage = "Este presente já foi totalmente reservado 🤍";
        }
      } catch (_) {
        // fallback silencioso
      }

      showToast(errorMessage, "error");
      return;
    }

    const reservationId = await parseRpcReturn(resp);

    fecharModal();
    document.getElementById("nome").value = "";
    document.getElementById("email").value = "";
    document.getElementById("mensagem").value = "";

    // ✅ FIX 3: toast de sucesso no lugar do alert()
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
      } catch (e) {
        console.warn("Falha ao enviar e-mail:", e);
      }
    }

  } catch (e) {
    console.error(e);
    showToast("Erro ao reservar. Tente novamente em instantes.", "error");
  }
}

window.confirmarReserva = confirmarReserva;
