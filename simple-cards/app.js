// Ключ для localStorage
const STORAGE_KEY = "livestock_cards_v1";

const state = {
  mode: "seller", // 'seller' | 'buyer' | 'saved'
  cards: []
};

// ЭЛЕМЕНТЫ DOM
const modeSellerBtn = document.getElementById("mode-seller");
const modeBuyerBtn = document.getElementById("mode-buyer");
const modeSavedBtn = document.getElementById("mode-saved");

const formSection = document.getElementById("form-section");
const formTitle = document.getElementById("form-title");
const form = document.getElementById("card-form");

const cardsSection = document.getElementById("cards-section");
const cardsList = document.getElementById("cards-list");

// ЗАГРУЗКА ИЗ localStorage
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      state.cards = parsed;
    }
  } catch (e) {
    console.error("Ошибка чтения localStorage", e);
  }
}

// СОХРАНЕНИЕ В localStorage
function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cards));
  } catch (e) {
    console.error("Ошибка записи localStorage", e);
  }
}

// ПЕРЕКЛЮЧЕНИЕ РЕЖИМА
function setMode(mode) {
  state.mode = mode;

  // кнопки
  [modeSellerBtn, modeBuyerBtn, modeSavedBtn].forEach((btn) =>
    btn.classList.remove("active")
  );

  if (mode === "seller") modeSellerBtn.classList.add("active");
  if (mode === "buyer") modeBuyerBtn.classList.add("active");
  if (mode === "saved") modeSavedBtn.classList.add("active");

  // заголовок формы и видимость
  if (mode === "seller") {
    formTitle.textContent = "Карточка продавца";
    formSection.style.display = "";
  } else if (mode === "buyer") {
    formTitle.textContent = "Карточка покупателя";
    formSection.style.display = "";
  } else {
    // сохранённые — форма не нужна
    formSection.style.display = "none";
  }

  renderCards();
}

// СОЗДАНИЕ КАРТОЧКИ ИЗ ФОРМЫ
function createCardFromForm() {
  const formData = new FormData(form);
  const animal = formData.get("animal")?.toString().trim();
  const category = formData.get("category")?.toString();
  const age = formData.get("age")?.toString().trim();
  const count = formData.get("count")?.toString().trim();
  const price = formData.get("price")?.toString().trim();
  const region = formData.get("region")?.toString().trim();
  const contact = formData.get("contact")?.toString().trim();
  const notes = formData.get("notes")?.toString().trim();

  if (!animal) {
    alert("Заполни поле «Что продаём / ищем»");
    return null;
  }

  const card = {
    id: Date.now(),
    mode: state.mode, // seller / buyer
    animal,
    category,
    age,
    count,
    price,
    region,
    contact,
    notes,
    createdAt: new Date().toISOString()
  };

  return card;
}

// УДАЛЕНИЕ КАРТОЧКИ
function deleteCard(id) {
  state.cards = state.cards.filter((c) => c.id !== id);
  saveToStorage();
  renderCards();
}

// КОПИРОВАНИЕ ТЕКСТА КАРТОЧКИ
function copyCardText(card) {
  const lines = [];

  lines.push(
    card.mode === "seller" ? "🔹 Карточка продавца" : "🔹 Карточка покупателя"
  );
  lines.push(`Животное / товар: ${card.animal}`);
  if (card.category) lines.push(`Тип: ${card.category}`);
  if (card.age) lines.push(`Возраст: ${card.age} лет`);
  if (card.count) lines.push(`Количество: ${card.count} гол.`);
  if (card.price) lines.push(`Цена: ${card.price}`);
  if (card.region) lines.push(`Регион: ${card.region}`);
  if (card.contact) lines.push(`Контакты: ${card.contact}`);
  if (card.notes) lines.push(`Описание: ${card.notes}`);

  const text = lines.join("\n");

  navigator.clipboard
    .writeText(text)
    .then(() => {
      alert("Текст карточки скопирован в буфер обмена");
    })
    .catch((err) => {
      console.error(err);
      alert("Не удалось скопировать текст");
    });
}

// РЕНДЕР КАРТОЧЕК
function renderCards() {
  cardsList.innerHTML = "";

  let cardsToShow = state.cards;

  if (state.mode === "seller") {
    cardsToShow = state.cards.filter((c) => c.mode === "seller");
  } else if (state.mode === "buyer") {
    cardsToShow = state.cards.filter((c) => c.mode === "buyer");
  }

  if (!cardsToShow.length) {
    const empty = document.createElement("p");
    empty.textContent = "Пока нет карточек.";
    empty.style.fontSize = "13px";
    empty.style.color = "#6b7280";
    cardsList.appendChild(empty);
    return;
  }

  cardsToShow.forEach((card) => {
    const cardEl = document.createElement("article");
    cardEl.className = "card";

    const header = document.createElement("div");
    header.className = "card-header";

    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = card.animal || "Без названия";

    const tag = document.createElement("span");
    tag.className = "card-tag";
    tag.textContent = card.mode === "seller" ? "Продавец" : "Покупатель";

    header.appendChild(title);
    header.appendChild(tag);

    const body = document.createElement("div");
    body.className = "card-body";

    const lines = [];

    if (card.category) lines.push(`Тип: ${card.category}`);
    if (card.age) lines.push(`Возраст: ${card.age} лет`);
    if (card.count) lines.push(`Количество: ${card.count} гол.`);
    if (card.price) lines.push(`Цена: ${card.price}`);
    if (card.region) lines.push(`Регион: ${card.region}`);
    if (card.contact) lines.push(`Контакты: ${card.contact}`);
    if (card.notes) lines.push(`Описание: ${card.notes}`);

    body.innerHTML = lines.join("<br>");

    const meta = document.createElement("div");
    meta.className = "card-meta";
    const date = new Date(card.createdAt);
    meta.textContent = `Создано: ${date.toLocaleString()}`;

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const copyBtn = document.createElement("button");
    copyBtn.className = "card-btn";
    copyBtn.textContent = "Скопировать текст";
    copyBtn.addEventListener("click", () => copyCardText(card));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "card-btn danger";
    deleteBtn.textContent = "Удалить";
    deleteBtn.addEventListener("click", () => deleteCard(card.id));

    actions.appendChild(copyBtn);
    actions.appendChild(deleteBtn);

    cardEl.appendChild(header);
    cardEl.appendChild(body);
    cardEl.appendChild(meta);
    cardEl.appendChild(actions);

    cardsList.appendChild(cardEl);
  });
}

// ОБРАБОТЧИКИ
modeSellerBtn.addEventListener("click", () => setMode("seller"));
modeBuyerBtn.addEventListener("click", () => setMode("buyer"));
modeSavedBtn.addEventListener("click", () => setMode("saved"));

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const card = createCardFromForm();
  if (!card) return;

  state.cards.unshift(card); // новая — наверх
  saveToStorage();
  renderCards();
  form.reset();
});

// ИНИЦИАЛИЗАЦИЯ
loadFromStorage();
setMode("seller");
