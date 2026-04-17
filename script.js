const SUPABASE_URL = "https://hyopntdqlmvivlcfsvoh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5b3BudGRxbG12aXZsY2Zzdm9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0Mjc2MTYsImV4cCI6MjA5MjAwMzYxNn0.HuSBNc9X-G1K2ZUqJz71Gd8JzFS50fUFrqu8OmvYTC4";

async function carregarPresentes() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/gifts?select=*&order=price_order.asc.nullslast`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    }
  );

  const presentes = await response.json();
  const lista = document.getElementById("lista-presentes");

  lista.innerHTML = "";

  presentes.forEach(presente => {
    const div = document.createElement("div");
    div.className = "gift";

    const isDisponivel = presente.status === "disponivel";
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
        <strong>Status:</strong>
        ${presente.status === "disponivel" ? "✅ Disponível" : "🔒 Reservado"}
      </p>

      ${!isDisponivel ? `<p class="gift-note">Obrigado! Este item já foi reservado 🤍</p>` : ""}
    
      ${
        presente.status === "disponivel"
          ? `<button class="reserve-btn" onclick="abrirFormulario('${presente.id}', '${presente.name.replace(/'/g, "\\'")}')">
               Quero presentear
             </button>`
          : ""
      }
    `;

    lista.appendChild(div);
  });
}

carregarPresentes();

let giftSelecionado = null;

function abrirFormulario(id, nome) {
  giftSelecionado = id;
  document.getElementById("modal-title").innerText =
    `Você vai presentear: ${nome}`;
  document.getElementById("modal-overlay").style.display = "flex";
}

function fecharModal() {
  document.getElementById("modal-overlay").style.display = "none";
}

async function confirmarReserva() {

  const nome = document.getElementById("nome").value.trim();
  const email = document.getElementById("email").value.trim();
  const mensagem = document.getElementById("mensagem").value.trim(

  if (!giftSelecionado) return alert("Nenhum presente selecionado.");
  if (nome.length < 2) return alert("Informe seu nome.");
  if (!email.includes("@")) return alert("Informe um e-mail válido.


  try {

    // 1) Reserva no banco
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

    
    const reservationId = await resp.json(); // <-- uuid retornado
    
      // 2) Chama Edge Function para enviar e-mail (vamos criar já já)
      await fetch(`${SUPABASE_URL}/functions/v1/send-reservation-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({ reservation_id: reservationId })
      });


    // Sucesso
    fecharModal();
    document.getElementById("nome").value = "";
    document.getElementById("email").value = "";
    document.getElementById("mensagem").value = "";

    alert("Reserva registrada! 💙 Obrigado pelo carinho!");
    carregarPresentes(); // recarrega lista e some botão

  } catch (e) {
    alert("Erro ao reservar. Tente novamente em instantes.");
    console.error(e);
  }
}

