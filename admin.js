const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let editingId = null;

/* LOGIN */
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert("Erro no login");
  } else {
    document.getElementById("login-box").style.display = "none";
    document.getElementById("admin-panel").style.display = "block";
    loadGifts();
  }
}

/* LISTAR */
async function loadGifts() {
  const { data } = await supabase
    .from("gifts")
    .select("*")
    .order("price_order");

  const list = document.getElementById("gift-list");
  list.innerHTML = "";

  data.forEach(g => {
    const div = document.createElement("div");
    div.innerHTML = `
      <strong>${g.name}</strong> — ${g.price_range || ""}
      <button onclick="editGift('${g.id}')">Editar</button>
    `;
    list.appendChild(div);
  });
}

/* EDITAR */
async function editGift(id) {
  const { data } = await supabase
    .from("gifts")
    .select("*")
    .eq("id", id)
    .single();

  editingId = id;

  document.getElementById("gift-name").value = data.name;
  document.getElementById("gift-desc").value = data.description;
  document.getElementById("gift-price").value = data.price_range;
  document.getElementById("gift-order").value = data.price_order;
  document.getElementById("gift-links").value =
    (data.reference_links || []).join("\n");
}

/* SALVAR */
async function saveGift() {
  const gift = {
    name: document.getElementById("gift-name").value,
    description: document.getElementById("gift-desc").value,
    price_range: document.getElementById("gift-price").value,
    price_order: Number(document.getElementById("gift-order").value),
    reference_links:
      document.getElementById("gift-links").value.split("\n")
  };

  if (editingId) {
    await supabase.from("gifts")
      .update(gift)
      .eq("id", editingId);
  } else {
    await supabase.from("gifts").insert(gift);
  }

  editingId = null;
  loadGifts();
}

// expor funções para o HTML (onclick)
window.login = login;
window.saveGift = saveGift;
window.editGift = editGift;
window.deleteGift = deleteGift;
