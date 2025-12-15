const sections = document.querySelectorAll('main > section');
const goTo = (id) => {
  sections.forEach((s) => s.classList.toggle('hidden', s.id !== id));
  sections.forEach((s) => s.classList.toggle('visible', s.id === id));
};

document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-target]');
  if (target) {
    goTo(target.dataset.target);
  }
});

// Species and categories
const speciesOptions = {
  cattle: { label: 'КРС', categories: ['теленок', 'бычок', 'тёлка', 'корова', 'бык-производитель'] },
  sheep: { label: 'овцы', categories: ['ягнёнок', 'матка', 'баран'] },
  goats: { label: 'козы', categories: ['козлёнок', 'матка', 'козёл'] },
  horses: { label: 'лошади', categories: ['жеребёнок', 'кобыла', 'жеребец'] },
  camels: { label: 'верблюды', categories: ['двухгорбый', 'одногорбый', 'самка', 'самец'] },
};

const speciesSelect = document.getElementById('species-select');
const categorySelect = document.getElementById('category-select');

Object.entries(speciesOptions).forEach(([value, data]) => {
  const opt = document.createElement('option');
  opt.value = value;
  opt.textContent = data.label;
  speciesSelect.appendChild(opt);
});

const syncCategories = () => {
  const selected = speciesSelect.value;
  categorySelect.innerHTML = '';
  speciesOptions[selected].categories.forEach((c) => {
    const opt = document.createElement('option');
    opt.textContent = c;
    categorySelect.appendChild(opt);
  });
  renderDynamicFields();
};

speciesSelect.addEventListener('change', syncCategories);
document.getElementById('sex-select').addEventListener('change', renderDynamicFields);
document.getElementById('age-value').addEventListener('input', renderDynamicFields);
document.getElementById('age-unit').addEventListener('change', renderDynamicFields);

syncCategories();

// Rule table for dynamic fields
const ruleTable = [
  {
    id: 'young-stock',
    match: { species: 'cattle', sex: 'female', minYears: 2 },
    fields: [
      { type: 'number', name: 'calves', label: 'Сколько молодняка в наличии?' },
      { type: 'checkbox', name: 'with-herd', label: 'Продаётся вместе с матками/стадом' },
    ],
  },
  {
    id: 'pregnant',
    match: { sex: 'female' },
    fields: [
      { type: 'checkbox', name: 'pregnant', label: 'Беременная?' },
      { type: 'checkbox', name: 'with-offspring', label: 'С телёнком/ягнёнком?' },
    ],
  },
  {
    id: 'male-status',
    match: { sex: 'male' },
    fields: [
      { type: 'checkbox', name: 'castrated', label: 'Кастрирован?' },
      { type: 'checkbox', name: 'stud', label: 'Племенной?' },
    ],
  },
];

const dynamicValues = {};

function matches(rule) {
  const species = speciesSelect.value;
  const sex = document.getElementById('sex-select').value;
  const age = Number(document.getElementById('age-value').value || 0);
  const unit = document.getElementById('age-unit').value;
  const years = unit === 'months' ? age / 12 : age;
  if (rule.match.species && rule.match.species !== species) return false;
  if (rule.match.sex && rule.match.sex !== sex) return false;
  if (rule.match.minYears && years < rule.match.minYears) return false;
  return true;
}

function renderDynamicFields() {
  const container = document.getElementById('dynamic-fields');
  container.innerHTML = '';
  ruleTable.filter(matches).forEach((rule) => {
    rule.fields.forEach((field) => {
      const wrapper = document.createElement('label');
      wrapper.textContent = field.label;
      wrapper.dataset.fieldName = field.name;
      if (field.type === 'checkbox') {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = Boolean(dynamicValues[field.name]);
        input.addEventListener('change', () => {
          dynamicValues[field.name] = input.checked;
          renderPreview();
        });
        wrapper.prepend(input);
        wrapper.classList.add('checkbox-row');
      } else {
        const input = document.createElement('input');
        input.type = 'number';
        input.value = dynamicValues[field.name] || '';
        input.addEventListener('input', () => {
          dynamicValues[field.name] = input.value;
          renderPreview();
        });
        wrapper.appendChild(input);
      }
      container.appendChild(wrapper);
    });
  });
  renderPreview();
}

// Preview logic
const previewCard = document.getElementById('preview-card');
const savedCards = JSON.parse(localStorage.getItem('my-cards') || '[]');
const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
const history = JSON.parse(localStorage.getItem('history') || '[]');

function renderPreview() {
  const speciesLabel = speciesOptions[speciesSelect.value].label;
  const ageValue = document.getElementById('age-value').value || '—';
  const ageUnit = document.getElementById('age-unit').selectedOptions[0].textContent;
  const sex = document.getElementById('sex-select').selectedOptions[0].textContent;
  const category = categorySelect.value;
  const headCount = document.getElementById('head-count').value || '—';
  const price = document.getElementById('price').value;
  const priceType = document.getElementById('price-type').selectedOptions[0].textContent;
  const location = document.getElementById('location').value || 'локация не указана';

  const dynamicLines = Object.entries(dynamicValues)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v === true ? 'да' : v}`)
    .join(' · ');

  previewCard.innerHTML = `
    <div class="title">${speciesLabel} • ${sex} • ${ageValue} ${ageUnit}</div>
    <div class="chips">
      <span class="chip">${category}</span>
      <span class="chip">${headCount} голов</span>
      ${dynamicLines ? `<span class="chip">${dynamicLines}</span>` : ''}
      ${price ? `<span class="chip">${priceType} ${price}</span>` : ''}
      <span class="chip">${location}</span>
    </div>
  `;
}

renderPreview();

function addToHistory(card) {
  const updated = [card, ...history].slice(0, 20);
  localStorage.setItem('history', JSON.stringify(updated));
}

function saveCard(status = 'draft') {
  const card = {
    id: crypto.randomUUID(),
    species: speciesOptions[speciesSelect.value].label,
    sex: document.getElementById('sex-select').selectedOptions[0].textContent,
    age: `${document.getElementById('age-value').value} ${document.getElementById('age-unit').selectedOptions[0].textContent}`,
    category: categorySelect.value,
    headCount: document.getElementById('head-count').value,
    price: document.getElementById('price').value,
    priceType: document.getElementById('price-type').selectedOptions[0].textContent,
    location: document.getElementById('location').value,
    delivery: document.getElementById('delivery').value,
    status,
    dynamic: { ...dynamicValues },
  };
  savedCards.unshift(card);
  localStorage.setItem('my-cards', JSON.stringify(savedCards));
  addToHistory({ ...card, type: 'livestock' });
  populateSaved();
}

document.getElementById('save-draft').addEventListener('click', () => saveCard('draft'));
document.getElementById('publish-card').addEventListener('click', () => saveCard('published'));
document.getElementById('share-card').addEventListener('click', () => {
  navigator.clipboard?.writeText(previewCard.innerText);
  alert('Карточка скопирована в буфер обмена');
});

// Meat preview
function renderMeatPreview() {
  const title = `${document.getElementById('meat-type').value} • ${document.getElementById('meat-temp').value}`;
  const chips = [
    `${document.getElementById('meat-cut').value}`,
    `${document.getElementById('meat-weight').value} кг`,
    `${document.getElementById('meat-price').value || '—'} за кг`,
    document.getElementById('meat-delivery').value || 'доставка/самовывоз',
  ];
  document.getElementById('meat-preview').innerHTML = `
    <div class="title">${title}</div>
    <div class="chips">${chips.map((c) => `<span class=\"chip\">${c}</span>`).join('')}</div>
  `;
}
['meat-type','meat-temp','meat-cut','meat-weight','meat-price','meat-delivery'].forEach((id)=>{
  document.getElementById(id).addEventListener('input', renderMeatPreview);
});
renderMeatPreview();

document.getElementById('save-meat').addEventListener('click', () => {
  const card = {
    id: crypto.randomUUID(),
    type: 'meat',
    title: `${document.getElementById('meat-type').value} (${document.getElementById('meat-cut').value})`,
    qty: `${document.getElementById('meat-weight').value} кг`,
    price: `${document.getElementById('meat-price').value} за кг`,
  };
  favorites.unshift(card);
  localStorage.setItem('favorites', JSON.stringify(favorites));
  addToHistory(card);
  populateSaved();
});

document.getElementById('share-meat').addEventListener('click', renderMeatPreview);

// Dairy preview
function renderDairyPreview() {
  const chips = [
    document.getElementById('dairy-volume').value || 'объём',
    document.getElementById('dairy-fat').value || 'жирность',
    document.getElementById('dairy-pack').value,
    `${document.getElementById('dairy-price').value || '—'} тг`,
  ];
  document.getElementById('dairy-preview').innerHTML = `
    <div class="title">${document.getElementById('dairy-product').value}</div>
    <div class="chips">${chips.map((c) => `<span class=\"chip\">${c}</span>`).join('')}</div>
  `;
}
['dairy-product','dairy-volume','dairy-fat','dairy-pack','dairy-price','dairy-delivery'].forEach((id)=>{
  document.getElementById(id).addEventListener('input', renderDairyPreview);
});
renderDairyPreview();

document.getElementById('save-dairy').addEventListener('click', () => {
  const card = {
    id: crypto.randomUUID(),
    type: 'dairy',
    title: document.getElementById('dairy-product').value,
    volume: document.getElementById('dairy-volume').value,
  };
  favorites.unshift(card);
  localStorage.setItem('favorites', JSON.stringify(favorites));
  addToHistory(card);
  populateSaved();
});

document.getElementById('share-dairy').addEventListener('click', renderDairyPreview);

// Client feeds
const livestockSamples = [
  { id: 'l1', title: 'КРС • Самка • 2 года', qty: '10 голов', price: '450 000 тг/гол', city: 'Туркестан', delivery: true, docs: true },
  { id: 'l2', title: 'Овцы матки • 1.5 года', qty: '35 голов', price: '70 000 тг/гол', city: 'Караганда', delivery: false, docs: true },
  { id: 'l3', title: 'Козы племенные', qty: '14 голов', price: '85 000 тг/гол', city: 'Алматы', delivery: true, docs: false },
];

const meatSamples = [
  { id: 'm1', title: 'Говядина охлаждённая', qty: '120 кг', price: '2 400 тг/кг', delivery: 'доставка завтра' },
  { id: 'm2', title: 'Конина замороженная', qty: '80 кг', price: '2 900 тг/кг', delivery: 'самовывоз' },
];

const dairySamples = [
  { id: 'd1', title: 'Молоко 3.2%', qty: '50 л/день', price: '350 тг/л', delivery: 'доставка в городе' },
  { id: 'd2', title: 'Кумыс фермерский', qty: '20 л/день', price: '900 тг/л', delivery: 'самовывоз' },
];

function renderFeed(list, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = list
    .map(
      (item) => `
    <div class="card-item">
      <header>
        <strong>${item.title}</strong>
        <button class="ghost" data-fav="${item.id}">⭐</button>
      </header>
      <div class="meta">${item.qty} • ${item.price}${item.city ? ' • ' + item.city : ''}</div>
      ${item.delivery ? `<div class="chips"><span class=\"chip\">${item.delivery === true ? 'доставка' : item.delivery}</span></div>` : ''}
      <div class="actions">
        <button class="primary" style="padding:8px 12px;font-size:14px;">Позвонить</button>
        <button class="ghost" style="padding:8px 12px;font-size:14px;">WhatsApp</button>
      </div>
    </div>
    `
    )
    .join('');
}

renderFeed(livestockSamples, 'livestock-feed');
renderFeed(meatSamples, 'meat-feed');
renderFeed(dairySamples, 'dairy-feed');

// Filters placeholder
const livestockFilters = ['вид', 'пол', 'возраст', 'цена', 'локация', 'доставка'];
const meatFilters = ['вид мяса', 'температура', 'разделка', 'цена/кг', 'доставка'];
const dairyFilters = ['продукт', 'объём', 'тара', 'доставка'];

function renderFilters(list, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = list.map((f) => `<span class="filter">${f}</span>`).join('');
}

renderFilters(livestockFilters, 'livestock-filters');
renderFilters(meatFilters, 'meat-filters');
renderFilters(dairyFilters, 'dairy-filters');

// Saving and history
function populateSaved() {
  const favContainer = document.getElementById('tab-favorites');
  const myContainer = document.getElementById('tab-my');
  const historyContainer = document.getElementById('tab-history');
  favContainer.innerHTML = favorites.length ? '' : '<p class="muted">Пока пусто.</p>';
  favorites.forEach((c) => {
    favContainer.insertAdjacentHTML('beforeend', `<div class="card-item"><strong>${c.title || c.species}</strong><div class="meta">${c.qty || c.age || ''}</div></div>`);
  });
  myContainer.innerHTML = savedCards.length ? '' : '<p class="muted">Создайте первую карточку.</p>';
  savedCards.forEach((c) => {
    myContainer.insertAdjacentHTML('beforeend', `<div class="card-item"><strong>${c.species}</strong><div class="meta">${c.headCount} голов • ${c.price || '—'}</div><div class="meta">${c.status}</div></div>`);
  });
  historyContainer.innerHTML = history.length ? '' : '<p class="muted">История пуста.</p>';
  history.forEach((c) => {
    historyContainer.insertAdjacentHTML('beforeend', `<div class="card-item"><strong>${c.title || c.species}</strong><div class="meta">${c.qty || c.age || ''}</div></div>`);
  });
}

populateSaved();

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const key = tab.dataset.tab;
    document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.remove('active'));
    document.getElementById(`tab-${key}`).classList.add('active');
  });
});

document.addEventListener('click', (e) => {
  const favButton = e.target.closest('[data-fav]');
  if (favButton) {
    const id = favButton.dataset.fav;
    const sample = [...livestockSamples, ...meatSamples, ...dairySamples].find((i) => i.id === id);
    if (sample) {
      favorites.unshift(sample);
      localStorage.setItem('favorites', JSON.stringify(favorites));
      addToHistory(sample);
      populateSaved();
    }
  }
});
