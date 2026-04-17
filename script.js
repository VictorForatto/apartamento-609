const SUPABASE_URL = "https://hyopntdqlmvivlcfsvoh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5b3BudGRxbG12aXZsY2Zzdm9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0Mjc2MTYsImV4cCI6MjA5MjAwMzYxNn0.HuSBNc9X-G1K2ZUqJz71Gd8JzFS50fUFrqu8OmvYTC4";

async function carregarPresentes() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/gifts?select=*`,
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

  div.innerHTML = `
    <h4 class="gift-name">${presente.name}</h4>
  
    <p class="gift-description">
      ${presente.description || ""}
    </p>
  
    <p class="gift-status">
      <strong>Status:</strong>
      ${presente.status === "disponivel" ? "✅ Disponível" : "🔒 Reservado"}
    </p>
  
    ${
      presente.status === "disponivel"
        ? `<button class="reserve-btn" onclick="abrirFormulario('${presente.id}', '${presente.name}')">
             Quero presentear
           </button>`
        : ""
    }
  `;

    lista.appendChild(div);
  });
}

carregarPresentes();
