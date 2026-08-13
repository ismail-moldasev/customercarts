(() => {
  'use strict';

  const STORAGE = {
    draft: 'livestock-card-creator:v2:draft',
    saved: 'livestock-card-creator:v2:saved',
    history: 'livestock-card-creator:v2:history',
  };

  const CATEGORY_META = {
    livestock: { label: 'Живой скот', symbol: '♞', className: 'market-card--livestock' },
    meat: { label: 'Мясо', symbol: '◇', className: 'market-card--meat' },
    dairy: { label: 'Молочная продукция', symbol: '◒', className: 'market-card--dairy' },
  };

  const SPECIES = {
    cattle: {
      label: 'КРС',
      male: [
        ['bull-calf', 'Бычок'],
        ['bull', 'Бык'],
        ['breeding-bull', 'Бык-производитель'],
      ],
      female: [
        ['heifer-calf', 'Тёлка'],
        ['cow', 'Корова'],
        ['breeding-cow', 'Племенная корова'],
      ],
    },
    sheep: {
      label: 'Овцы',
      male: [['ram-lamb', 'Барашек'], ['ram', 'Баран']],
      female: [['ewe-lamb', 'Ярка'], ['ewe', 'Овцематка']],
    },
    goats: {
      label: 'Козы',
      male: [['buckling', 'Козлёнок'], ['buck', 'Козёл']],
      female: [['doeling', 'Козочка'], ['doe', 'Козоматка']],
    },
    horses: {
      label: 'Лошади',
      male: [['colt', 'Жеребёнок'], ['stallion', 'Жеребец'], ['gelding', 'Мерин']],
      female: [['filly', 'Кобылка'], ['mare', 'Кобыла']],
    },
    camels: {
      label: 'Верблюды',
      male: [['male-calf', 'Верблюжонок'], ['male-camel', 'Самец']],
      female: [['female-calf', 'Верблюжка'], ['female-camel', 'Самка']],
    },
  };

  const MEAT_TYPES = [
    ['beef', 'Говядина'],
    ['lamb', 'Баранина'],
    ['horse', 'Конина'],
    ['goat', 'Козлятина'],
    ['camel', 'Верблюжатина'],
  ];

  const DAIRY_TYPES = [
    ['milk', 'Молоко'],
    ['kumis', 'Кумыс'],
    ['shubat', 'Шубат'],
    ['cream', 'Сметана / каймак'],
    ['cheese', 'Сыр'],
    ['butter', 'Масло'],
    ['curd', 'Творог / құрт'],
  ];

  const DEFAULT_VALUES = {
    species: 'cattle',
    sex: 'male',
    animalClass: 'bull-calf',
    age: '12',
    ageUnit: 'months',
    quantity: '10',
    averageWeight: '',
    condition: 'fattening',
    price: '',
    priceMode: 'per-head',
    budget: '',
    budgetMode: 'total',
    delivery: 'pickup',
    deliveryNeeded: false,
    veterinaryDocs: false,
    tags: false,
    pregnant: false,
    withOffspring: false,
    offspringCount: '',
    castrated: false,
    breeding: false,
    bargain: false,
    meatType: 'beef',
    meatCut: 'carcass',
    meatTemperature: 'chilled',
    meatWeight: '100',
    meatPrice: '',
    meatBudget: '',
    meatPackaging: 'none',
    halalDocs: false,
    dairyType: 'milk',
    dairyVolume: '50',
    dairyUnit: 'litre-day',
    dairyFat: '',
    dairyPrice: '',
    dairyBudget: '',
    dairyPackaging: 'bottle',
    production: 'daily',
    contactName: '',
    phone: '',
    location: '',
    notes: '',
  };

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const byId = (id) => document.getElementById(id);

  function safeRead(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value === null ? fallback : value;
    } catch (error) {
      console.warn(`Не удалось прочитать ${key}`, error);
      return fallback;
    }
  }

  function safeWrite(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`Не удалось сохранить ${key}`, error);
      return false;
    }
  }

  function createId(prefix = 'mc') {
    if (globalThis.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeDraft(raw = {}) {
    return {
      role: raw.role === 'client' ? 'client' : 'seller',
      category: CATEGORY_META[raw.category] ? raw.category : 'livestock',
      values: { ...DEFAULT_VALUES, ...(raw.values || {}) },
    };
  }

  function migrateLegacyCard(card, index) {
    const type = card.type === 'meat' || card.type === 'dairy' ? card.type : 'livestock';
    const role = card.role === 'client' || card.mode === 'buyer' ? 'client' : 'seller';
    const values = {
      ...DEFAULT_VALUES,
      contactName: card.contactName || card.contact || '',
      phone: card.phone || '',
      location: card.location || card.city || card.region || '',
      notes: card.notes || '',
    };

    if (type === 'livestock') {
      values.quantity = String(card.headCount || card.count || card.qty || '');
      values.price = String(card.price || '').replace(/[^0-9.,]/g, '');
      values.age = String(card.age || '').replace(/[^0-9.,]/g, '');
    } else if (type === 'meat') {
      values.meatWeight = String(card.weight || card.qty || '').replace(/[^0-9.,]/g, '');
      values.meatPrice = String(card.price || '').replace(/[^0-9.,]/g, '');
    } else {
      values.dairyVolume = String(card.volume || card.qty || '').replace(/[^0-9.,]/g, '');
      values.dairyPrice = String(card.price || '').replace(/[^0-9.,]/g, '');
    }

    const snapshot = normalizeDraft({ role, category: type, values });
    const derived = deriveCard(snapshot);
    return {
      id: card.id || `legacy-${index}-${Date.now().toString(36)}`,
      number: `MC-${String(index + 1).padStart(4, '0')}`,
      createdAt: card.createdAt || new Date().toISOString(),
      updatedAt: card.updatedAt || card.createdAt || new Date().toISOString(),
      snapshot,
      title: card.title || derived.title,
      summary: derived.description,
    };
  }

  function loadSavedCards() {
    const current = safeRead(STORAGE.saved, null);
    if (Array.isArray(current)) return current;

    const legacy = [
      ...safeRead('my-cards', []),
      ...safeRead('favorites', []),
    ];
    const migrated = legacy.map(migrateLegacyCard);
    if (migrated.length) safeWrite(STORAGE.saved, migrated);
    return migrated;
  }

  function loadHistory() {
    const current = safeRead(STORAGE.history, null);
    if (Array.isArray(current)) return current;

    const legacy = safeRead('history', []);
    const migrated = legacy.map((card, index) => {
      const savedCard = migrateLegacyCard(card, index);
      return {
        id: createId('history'),
        action: 'imported',
        at: savedCard.updatedAt,
        snapshot: savedCard.snapshot,
        title: savedCard.title,
      };
    });
    if (migrated.length) safeWrite(STORAGE.history, migrated);
    return migrated;
  }

  const state = {
    draft: normalizeDraft(safeRead(STORAGE.draft, {})),
    saved: loadSavedCards(),
    history: loadHistory(),
    editingId: null,
    activeTab: 'saved',
  };

  let saveTimer = null;
  let toastTimer = null;

  function optionLabel(options, value, fallback = '—') {
    return options.find(([optionValue]) => optionValue === value)?.[1] || fallback;
  }

  function formatNumber(value) {
    if (value === '' || value === null || value === undefined) return '—';
    const normalized = String(value).replace(',', '.').replace(/\s/g, '');
    const numeric = Number(normalized);
    if (!Number.isFinite(numeric)) return String(value);
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(numeric);
  }

  function ageInYears(values) {
    const numeric = Number(String(values.age || 0).replace(',', '.'));
    return values.ageUnit === 'months' ? numeric / 12 : numeric;
  }

  function ageLabel(values) {
    if (!values.age) return 'Возраст не указан';
    return `${formatNumber(values.age)} ${values.ageUnit === 'months' ? 'мес.' : 'г.'}`;
  }

  function roleLabel(role) {
    return role === 'seller' ? 'Продавец' : 'Клиент';
  }

  function deliveryLabel(value) {
    return optionLabel([
      ['pickup', 'Самовывоз'],
      ['seller-delivery', 'Доставка продавца'],
      ['carrier', 'Через перевозчика'],
      ['negotiable', 'По договорённости'],
    ], value);
  }

  function animalClassOptions(values) {
    const species = SPECIES[values.species] || SPECIES.cattle;
    return species[values.sex] || species.male;
  }

  function ensureAnimalClass() {
    const options = animalClassOptions(state.draft.values);
    if (!options.some(([value]) => value === state.draft.values.animalClass)) {
      state.draft.values.animalClass = options[0][0];
    }
  }

  function deriveLivestock(draft) {
    const { values, role } = draft;
    const species = SPECIES[values.species] || SPECIES.cattle;
    const animalClass = optionLabel(species[values.sex] || species.male, values.animalClass, values.sex === 'female' ? 'Самка' : 'Самец');
    const condition = optionLabel([
      ['fattening', 'На откорм'],
      ['breeding', 'Племенной'],
      ['slaughter', 'На забой'],
      ['mixed', 'Смешанная партия'],
    ], values.condition);
    const priceMode = optionLabel([
      ['per-head', 'за голову'],
      ['per-kg', 'за кг живого веса'],
      ['batch', 'за всю партию'],
    ], values.priceMode);
    const budgetMode = values.budgetMode === 'per-head' ? 'на голову' : 'на всю покупку';

    const metrics = role === 'seller'
      ? [
          ['Количество', values.quantity ? `${formatNumber(values.quantity)} гол.` : '—'],
          ['Цена', values.price ? `${formatNumber(values.price)} ₸` : 'Договорная'],
          ['Возраст', ageLabel(values)],
        ]
      : [
          ['Нужно', values.quantity ? `${formatNumber(values.quantity)} гол.` : '—'],
          ['Бюджет', values.budget ? `до ${formatNumber(values.budget)} ₸` : 'Обсудим'],
          ['Возраст', ageLabel(values)],
        ];

    const chips = [condition];
    if (values.averageWeight) chips.push(`≈ ${formatNumber(values.averageWeight)} кг/гол.`);
    if (role === 'seller' && values.price) chips.push(priceMode);
    if (role === 'client' && values.budget) chips.push(budgetMode);
    if (values.veterinaryDocs) chips.push(role === 'seller' ? 'Ветдокументы есть' : 'Нужны ветдокументы');
    if (values.tags) chips.push(role === 'seller' ? 'Бирки есть' : 'Нужны бирки');
    if (values.sex === 'female' && values.pregnant) chips.push('Стельные / суягные');
    if (values.sex === 'female' && values.withOffspring) chips.push('С молодняком');
    if (values.offspringCount && values.sex === 'female' && values.species === 'cattle' && ageInYears(values) >= 2) {
      chips.push(`${formatNumber(values.offspringCount)} гол. молодняка`);
    }
    if (values.sex === 'male' && values.castrated) chips.push('Кастрированные');
    if (values.sex === 'male' && values.breeding) chips.push('Племенные');
    if (values.bargain && role === 'seller') chips.push('Торг уместен');
    if (values.deliveryNeeded && role === 'client') chips.push('Нужна доставка');
    if (role === 'seller') chips.push(deliveryLabel(values.delivery));

    const base = role === 'seller'
      ? `Предлагается ${species.label.toLowerCase()}: ${animalClass.toLowerCase()}, ${ageLabel(values).toLowerCase()}.`
      : `Ищу ${species.label.toLowerCase()}: ${animalClass.toLowerCase()}, ${ageLabel(values).toLowerCase()}.`;

    return {
      title: `${species.label} · ${animalClass}`,
      description: values.notes || `${base} ${values.quantity ? `Количество — ${formatNumber(values.quantity)} голов.` : ''}`.trim(),
      metrics,
      chips,
    };
  }

  function deriveMeat(draft) {
    const { values, role } = draft;
    const meat = optionLabel(MEAT_TYPES, values.meatType);
    const cut = optionLabel([
      ['carcass', 'Туша'],
      ['half', 'Полутуша'],
      ['cuts', 'Разделка'],
      ['boxed', 'Коробочная разделка'],
      ['mince', 'Фарш'],
    ], values.meatCut);
    const temperature = optionLabel([
      ['chilled', 'Охлаждённое'],
      ['frozen', 'Замороженное'],
      ['fresh', 'Парное'],
    ], values.meatTemperature);
    const packaging = optionLabel([
      ['none', 'Без упаковки'],
      ['bags', 'Пакеты'],
      ['vacuum', 'Вакуум'],
      ['boxes', 'Коробки'],
    ], values.meatPackaging);
    const value = role === 'seller' ? values.meatPrice : values.meatBudget;
    const metrics = [
      ['Объём', values.meatWeight ? `${formatNumber(values.meatWeight)} кг` : '—'],
      [role === 'seller' ? 'Цена / кг' : 'Бюджет', value ? `${role === 'client' ? 'до ' : ''}${formatNumber(value)} ₸` : role === 'seller' ? 'Договорная' : 'Обсудим'],
      ['Хранение', temperature],
    ];
    const chips = [cut, packaging];
    if (values.halalDocs) chips.push(role === 'seller' ? 'Документы / халал' : 'Нужны документы / халал');
    if (role === 'seller') chips.push(deliveryLabel(values.delivery));
    if (role === 'client' && values.deliveryNeeded) chips.push('Нужна доставка');
    if (role === 'seller' && values.bargain) chips.push('Торг уместен');

    return {
      title: `${meat} · ${cut}`,
      description: values.notes || (role === 'seller'
        ? `Предлагается ${meat.toLowerCase()}, ${temperature.toLowerCase()}. Партия ${formatNumber(values.meatWeight)} кг.`
        : `Ищу ${meat.toLowerCase()}, ${temperature.toLowerCase()}. Нужный объём — ${formatNumber(values.meatWeight)} кг.`),
      metrics,
      chips,
    };
  }

  function deriveDairy(draft) {
    const { values, role } = draft;
    const product = optionLabel(DAIRY_TYPES, values.dairyType);
    const unit = optionLabel([
      ['litre-day', 'л / день'],
      ['litre-week', 'л / неделю'],
      ['kg-day', 'кг / день'],
      ['kg-week', 'кг / неделю'],
      ['batch', 'ед. / партия'],
    ], values.dairyUnit);
    const packaging = optionLabel([
      ['bottle', 'Бутылки'],
      ['canister', 'Канистры'],
      ['bag', 'Пакеты'],
      ['container', 'Контейнеры'],
      ['buyer', 'Тара покупателя'],
    ], values.dairyPackaging);
    const production = optionLabel([
      ['daily', 'Ежедневно'],
      ['weekly', 'Еженедельно'],
      ['once', 'Разовая партия'],
      ['seasonal', 'Сезонно'],
    ], values.production);
    const value = role === 'seller' ? values.dairyPrice : values.dairyBudget;
    const metrics = [
      ['Объём', values.dairyVolume ? `${formatNumber(values.dairyVolume)} ${unit}` : '—'],
      [role === 'seller' ? 'Цена' : 'Бюджет', value ? `${role === 'client' ? 'до ' : ''}${formatNumber(value)} ₸` : role === 'seller' ? 'Договорная' : 'Обсудим'],
      ['Поставка', production],
    ];
    const chips = [packaging];
    if (values.dairyFat) chips.push(`Жирность ${formatNumber(values.dairyFat)}%`);
    if (role === 'seller') chips.push(deliveryLabel(values.delivery));
    if (role === 'client' && values.deliveryNeeded) chips.push('Нужна доставка');
    if (role === 'seller' && values.bargain) chips.push('Торг уместен');

    return {
      title: product,
      description: values.notes || (role === 'seller'
        ? `Предлагается ${product.toLowerCase()}. Объём — ${formatNumber(values.dairyVolume)} ${unit}.`
        : `Ищу ${product.toLowerCase()}. Нужный объём — ${formatNumber(values.dairyVolume)} ${unit}.`),
      metrics,
      chips,
    };
  }

  function deriveCard(draft = state.draft) {
    const details = draft.category === 'livestock'
      ? deriveLivestock(draft)
      : draft.category === 'meat'
        ? deriveMeat(draft)
        : deriveDairy(draft);

    return {
      ...details,
      role: draft.role,
      category: draft.category,
      contactName: draft.values.contactName || 'Имя или хозяйство',
      phone: draft.values.phone || '',
      location: draft.values.location || 'Город или район',
    };
  }

  function fieldBase(label, fieldName, required = false) {
    const wrapper = document.createElement('label');
    wrapper.className = 'field';
    const caption = document.createElement('span');
    caption.textContent = label;
    if (required) {
      const mark = document.createElement('b');
      mark.textContent = ' *';
      caption.appendChild(mark);
    }
    wrapper.appendChild(caption);
    return wrapper;
  }

  function inputField(label, fieldName, options = {}) {
    const wrapper = fieldBase(label, fieldName, options.required);
    const input = document.createElement('input');
    input.id = fieldName;
    input.dataset.field = fieldName;
    input.type = options.type || 'text';
    if (options.required) input.required = true;
    if (options.min !== undefined) input.min = String(options.min);
    if (options.max !== undefined) input.max = String(options.max);
    if (options.step !== undefined) input.step = String(options.step);
    if (options.placeholder) input.placeholder = options.placeholder;
    if (options.inputMode) input.inputMode = options.inputMode;
    input.value = state.draft.values[fieldName] ?? '';
    wrapper.appendChild(input);
    if (options.required) {
      const error = document.createElement('small');
      error.className = 'field-error';
      error.dataset.errorFor = fieldName;
      wrapper.appendChild(error);
    }
    return wrapper;
  }

  function selectField(label, fieldName, options, config = {}) {
    const wrapper = fieldBase(label, fieldName, config.required);
    const select = document.createElement('select');
    select.id = fieldName;
    select.dataset.field = fieldName;
    if (config.required) select.required = true;
    options.forEach(([value, text]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      select.appendChild(option);
    });
    select.value = state.draft.values[fieldName] ?? options[0]?.[0] ?? '';
    wrapper.appendChild(select);
    return wrapper;
  }

  function checkboxField(label, fieldName) {
    const wrapper = document.createElement('label');
    wrapper.className = 'check-card';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = fieldName;
    input.dataset.field = fieldName;
    input.checked = Boolean(state.draft.values[fieldName]);
    const span = document.createElement('span');
    span.textContent = label;
    wrapper.append(input, span);
    return wrapper;
  }

  function fieldGrid(...children) {
    const grid = document.createElement('div');
    grid.className = `field-grid field-grid--${children.length >= 3 ? 'three' : 'two'}`;
    grid.append(...children);
    return grid;
  }

  function checkGrid(...children) {
    const grid = document.createElement('div');
    grid.className = 'check-grid';
    grid.append(...children);
    return grid;
  }

  function formSection(title, ...children) {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'form-section';
    const legend = document.createElement('legend');
    legend.textContent = title;
    fieldset.append(legend, ...children);
    return fieldset;
  }

  function conditionalNote(text) {
    const note = document.createElement('div');
    note.className = 'conditional-note';
    note.innerHTML = '<span aria-hidden="true">↳</span>';
    const content = document.createElement('span');
    content.textContent = text;
    note.appendChild(content);
    return note;
  }

  function renderLivestockForm(container) {
    ensureAnimalClass();
    const values = state.draft.values;
    const role = state.draft.role;
    const details = formSection(
      'Животное',
      fieldGrid(
        selectField('Вид скота', 'species', Object.entries(SPECIES).map(([key, item]) => [key, item.label]), { required: true }),
        selectField('Пол', 'sex', [['male', 'Самец'], ['female', 'Самка']], { required: true }),
      ),
      fieldGrid(
        selectField('Категория животного', 'animalClass', animalClassOptions(values), { required: true }),
        inputField('Возраст', 'age', { type: 'number', min: 0, step: 0.5, required: true, inputMode: 'decimal' }),
        selectField('Единица', 'ageUnit', [['months', 'Месяцев'], ['years', 'Лет']]),
      ),
    );

    const conditionChildren = [];
    if (values.sex === 'female') {
      conditionChildren.push(checkGrid(
        checkboxField(role === 'seller' ? 'Стельная / суягная' : 'Рассмотрю стельных / суягных', 'pregnant'),
        checkboxField(role === 'seller' ? 'Продаётся с молодняком' : 'Рассмотрю с молодняком', 'withOffspring'),
      ));
      if (values.species === 'cattle' && ageInYears(values) >= 2) {
        conditionChildren.push(
          inputField(role === 'seller' ? 'Сколько молодняка в наличии' : 'Сколько молодняка желательно', 'offspringCount', {
            type: 'number', min: 0, step: 1, inputMode: 'numeric',
          }),
          conditionalNote('Это поле появилось автоматически: выбрана самка КРС в возрасте от двух лет.'),
        );
      }
    } else {
      conditionChildren.push(checkGrid(
        checkboxField(role === 'seller' ? 'Кастрирован' : 'Рассмотрю кастрированных', 'castrated'),
        checkboxField(role === 'seller' ? 'Племенной' : 'Нужен племенной', 'breeding'),
      ));
    }
    const conditionSection = formSection('Дополнительные признаки', ...conditionChildren);

    const quantityFields = [
      inputField(role === 'seller' ? 'Количество голов' : 'Сколько голов нужно', 'quantity', {
        type: 'number', min: 1, step: 1, required: true, inputMode: 'numeric',
      }),
      inputField(role === 'seller' ? 'Средний вес, кг' : 'Желаемый вес, кг', 'averageWeight', {
        type: 'number', min: 0, step: 1, inputMode: 'decimal',
      }),
      selectField(role === 'seller' ? 'Назначение партии' : 'Для чего покупка', 'condition', [
        ['fattening', 'На откорм'],
        ['breeding', 'Племенной скот'],
        ['slaughter', 'На забой'],
        ['mixed', 'Смешанная партия'],
      ]),
    ];

    const dealFields = role === 'seller'
      ? [
          fieldGrid(
            inputField('Цена, ₸', 'price', { type: 'number', min: 0, step: 1000, inputMode: 'numeric' }),
            selectField('Формат цены', 'priceMode', [
              ['per-head', 'За голову'],
              ['per-kg', 'За кг живого веса'],
              ['batch', 'За всю партию'],
            ]),
          ),
          selectField('Доставка', 'delivery', [
            ['pickup', 'Самовывоз'],
            ['seller-delivery', 'Могу привезти'],
            ['carrier', 'Через перевозчика'],
            ['negotiable', 'По договорённости'],
          ]),
          checkGrid(
            checkboxField('Ветдокументы есть / сделаю', 'veterinaryDocs'),
            checkboxField('Бирки и учёт есть', 'tags'),
            checkboxField('Торг уместен', 'bargain'),
          ),
        ]
      : [
          fieldGrid(
            inputField('Максимальный бюджет, ₸', 'budget', { type: 'number', min: 0, step: 1000, inputMode: 'numeric' }),
            selectField('Бюджет рассчитан', 'budgetMode', [['total', 'На всю покупку'], ['per-head', 'На одну голову']]),
          ),
          checkGrid(
            checkboxField('Нужна доставка', 'deliveryNeeded'),
            checkboxField('Обязательны ветдокументы', 'veterinaryDocs'),
            checkboxField('Обязательны бирки', 'tags'),
          ),
        ];

    container.append(
      details,
      conditionSection,
      formSection('Количество и назначение', fieldGrid(...quantityFields)),
      formSection(role === 'seller' ? 'Цена и условия' : 'Бюджет и требования', ...dealFields),
    );
  }

  function renderMeatForm(container) {
    const role = state.draft.role;
    container.append(
      formSection(
        'Продукт',
        fieldGrid(
          selectField('Вид мяса', 'meatType', MEAT_TYPES, { required: true }),
          selectField('Формат разделки', 'meatCut', [
            ['carcass', 'Туша'],
            ['half', 'Полутуша'],
            ['cuts', 'Разделка'],
            ['boxed', 'Коробочная разделка'],
            ['mince', 'Фарш'],
          ]),
          selectField('Состояние', 'meatTemperature', [
            ['chilled', 'Охлаждённое'],
            ['frozen', 'Замороженное'],
            ['fresh', 'Парное'],
          ]),
        ),
      ),
      formSection(
        role === 'seller' ? 'Партия и цена' : 'Объём и бюджет',
        fieldGrid(
          inputField(role === 'seller' ? 'Вес партии, кг' : 'Сколько нужно, кг', 'meatWeight', {
            type: 'number', min: 1, step: 1, required: true, inputMode: 'decimal',
          }),
          inputField(role === 'seller' ? 'Цена за кг, ₸' : 'Бюджет за кг, ₸', role === 'seller' ? 'meatPrice' : 'meatBudget', {
            type: 'number', min: 0, step: 100, inputMode: 'numeric',
          }),
          selectField('Упаковка', 'meatPackaging', [
            ['none', 'Без упаковки'],
            ['bags', 'Пакеты'],
            ['vacuum', 'Вакуум'],
            ['boxes', 'Коробки'],
          ]),
        ),
        role === 'seller'
          ? selectField('Доставка', 'delivery', [
              ['pickup', 'Самовывоз'],
              ['seller-delivery', 'Могу привезти'],
              ['carrier', 'Через перевозчика'],
              ['negotiable', 'По договорённости'],
            ])
          : checkGrid(checkboxField('Нужна доставка', 'deliveryNeeded')),
        checkGrid(
          checkboxField(role === 'seller' ? 'Есть документы / халал' : 'Нужны документы / халал', 'halalDocs'),
          ...(role === 'seller' ? [checkboxField('Торг уместен', 'bargain')] : []),
        ),
      ),
    );
  }

  function renderDairyForm(container) {
    const role = state.draft.role;
    container.append(
      formSection(
        'Продукт',
        fieldGrid(
          selectField('Что именно', 'dairyType', DAIRY_TYPES, { required: true }),
          inputField('Жирность, %', 'dairyFat', { type: 'number', min: 0, max: 100, step: 0.1, inputMode: 'decimal' }),
          selectField('Тара', 'dairyPackaging', [
            ['bottle', 'Бутылки'],
            ['canister', 'Канистры'],
            ['bag', 'Пакеты'],
            ['container', 'Контейнеры'],
            ['buyer', 'Тара покупателя'],
          ]),
        ),
      ),
      formSection(
        role === 'seller' ? 'Объём и цена' : 'Объём и бюджет',
        fieldGrid(
          inputField(role === 'seller' ? 'Доступный объём' : 'Нужный объём', 'dairyVolume', {
            type: 'number', min: 0, step: 0.1, required: true, inputMode: 'decimal',
          }),
          selectField('Единица', 'dairyUnit', [
            ['litre-day', 'Литров / день'],
            ['litre-week', 'Литров / неделю'],
            ['kg-day', 'Кг / день'],
            ['kg-week', 'Кг / неделю'],
            ['batch', 'Единиц / партия'],
          ]),
          inputField(role === 'seller' ? 'Цена за единицу, ₸' : 'Бюджет за единицу, ₸', role === 'seller' ? 'dairyPrice' : 'dairyBudget', {
            type: 'number', min: 0, step: 10, inputMode: 'numeric',
          }),
        ),
        fieldGrid(
          selectField(role === 'seller' ? 'Как часто доступно' : 'Как часто нужно', 'production', [
            ['daily', 'Ежедневно'],
            ['weekly', 'Еженедельно'],
            ['once', 'Разовая партия'],
            ['seasonal', 'Сезонно'],
          ]),
          role === 'seller'
            ? selectField('Доставка', 'delivery', [
                ['pickup', 'Самовывоз'],
                ['seller-delivery', 'Могу привезти'],
                ['carrier', 'Через перевозчика'],
                ['negotiable', 'По договорённости'],
              ])
            : checkboxField('Нужна доставка', 'deliveryNeeded'),
        ),
        ...(role === 'seller' ? [checkGrid(checkboxField('Торг уместен', 'bargain'))] : []),
      ),
    );
  }

  function syncCommonFields() {
    ['contactName', 'phone', 'location', 'notes'].forEach((fieldName) => {
      const input = byId(fieldName);
      if (input) input.value = state.draft.values[fieldName] ?? '';
    });
    byId('notes-count').textContent = String((state.draft.values.notes || '').length);
  }

  function renderForm() {
    ensureAnimalClass();
    const container = byId('dynamic-form');
    container.replaceChildren();

    if (state.draft.category === 'livestock') renderLivestockForm(container);
    if (state.draft.category === 'meat') renderMeatForm(container);
    if (state.draft.category === 'dairy') renderDairyForm(container);

    byId('form-kicker').textContent = `Карточка ${state.draft.role === 'seller' ? 'продавца' : 'клиента'}`;
    byId('form-title').textContent = CATEGORY_META[state.draft.category].label;
    byId('save-card').lastChild.textContent = state.editingId ? ' Обновить карточку' : ' Сохранить карточку';
    syncCommonFields();
  }

  function updateSwitches() {
    $$('[data-role]').forEach((button) => {
      const active = button.dataset.role === state.draft.role;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $$('[data-category]').forEach((button) => {
      const active = button.dataset.category === state.draft.category;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function renderPreview() {
    const derived = deriveCard();
    const meta = CATEGORY_META[state.draft.category];
    const preview = byId('preview-card');
    preview.className = `market-card ${meta.className}${state.draft.role === 'client' ? ' market-card--client' : ''}`;
    byId('preview-role').textContent = state.draft.role === 'seller' ? 'ПРОДАВЕЦ' : 'КЛИЕНТ';
    byId('preview-intent').textContent = state.draft.role === 'seller' ? 'ПРЕДЛАГАЕТСЯ' : 'ТРЕБУЕТСЯ';
    byId('preview-symbol').textContent = meta.symbol;
    byId('preview-card-title').textContent = derived.title;
    byId('preview-description').textContent = derived.description;
    byId('preview-contact').textContent = derived.contactName;
    byId('preview-location').textContent = derived.location;

    const metrics = byId('preview-metrics');
    metrics.replaceChildren(...derived.metrics.map(([label, value]) => {
      const item = document.createElement('div');
      item.className = 'metric';
      const caption = document.createElement('span');
      caption.textContent = label;
      const strong = document.createElement('strong');
      strong.textContent = value;
      item.append(caption, strong);
      return item;
    }));

    const chips = byId('preview-chips');
    chips.replaceChildren(...derived.chips.slice(0, 7).map((text) => {
      const chip = document.createElement('span');
      chip.className = 'preview-chip';
      chip.textContent = text;
      return chip;
    }));

    const existing = state.editingId ? state.saved.find((card) => card.id === state.editingId) : null;
    byId('preview-number').textContent = `#${existing?.number || `MC-${String(state.saved.length + 1).padStart(4, '0')}`}`;
  }

  function scheduleDraftSave() {
    clearTimeout(saveTimer);
    const status = byId('autosave-status');
    status.textContent = 'Сохраняем черновик…';
    status.classList.add('is-saving');
    saveTimer = setTimeout(() => {
      const saved = safeWrite(STORAGE.draft, state.draft);
      status.textContent = saved ? 'Черновик сохранён на устройстве' : 'Не удалось сохранить черновик';
      status.classList.remove('is-saving');
    }, 280);
  }

  function handleFieldInput(event) {
    const input = event.target.closest('[data-field]');
    if (!input) return;
    state.draft.values[input.dataset.field] = input.type === 'checkbox' ? input.checked : input.value;
    if (input.dataset.field === 'notes') byId('notes-count').textContent = String(input.value.length);
    clearFieldError(input.dataset.field);
    renderPreview();
    scheduleDraftSave();
  }

  function handleFieldChange(event) {
    const input = event.target.closest('[data-field]');
    if (!input) return;
    const field = input.dataset.field;
    state.draft.values[field] = input.type === 'checkbox' ? input.checked : input.value;
    clearFieldError(field);
    if (['species', 'sex', 'age', 'ageUnit'].includes(field)) {
      ensureAnimalClass();
      renderForm();
    }
    renderPreview();
    scheduleDraftSave();
  }

  function clearFieldError(fieldName) {
    const input = byId(fieldName);
    const wrapper = input?.closest('.field');
    wrapper?.classList.remove('has-error');
    const error = $(`[data-error-for="${fieldName}"]`);
    if (error) error.textContent = '';
  }

  function validateForm() {
    let firstInvalid = null;
    $$('[required]', byId('card-form')).forEach((input) => {
      const valid = String(input.value || '').trim() !== '' && input.checkValidity();
      const wrapper = input.closest('.field');
      wrapper?.classList.toggle('has-error', !valid);
      const error = $(`[data-error-for="${input.id}"]`);
      if (error) error.textContent = valid ? '' : 'Заполните это поле';
      if (!valid && !firstInvalid) firstInvalid = input;
    });

    if (firstInvalid) {
      firstInvalid.focus();
      showToast('Проверьте обязательные поля');
      return false;
    }
    return true;
  }

  function addHistory(action, snapshot, title) {
    state.history.unshift({
      id: createId('history'),
      action,
      at: new Date().toISOString(),
      snapshot: clone(snapshot),
      title,
    });
    state.history = state.history.slice(0, 50);
    safeWrite(STORAGE.history, state.history);
  }

  function saveCard(event) {
    event.preventDefault();
    if (!validateForm()) return;

    const now = new Date().toISOString();
    const snapshot = clone(state.draft);
    const derived = deriveCard(snapshot);
    let card;

    if (state.editingId) {
      const index = state.saved.findIndex((item) => item.id === state.editingId);
      if (index >= 0) {
        card = {
          ...state.saved[index],
          updatedAt: now,
          snapshot,
          title: derived.title,
          summary: derived.description,
        };
        state.saved.splice(index, 1, card);
        addHistory('updated', snapshot, derived.title);
      }
    }

    if (!card) {
      card = {
        id: createId('card'),
        number: `MC-${String(state.saved.length + 1).padStart(4, '0')}`,
        createdAt: now,
        updatedAt: now,
        snapshot,
        title: derived.title,
        summary: derived.description,
      };
      state.saved.unshift(card);
      state.editingId = card.id;
      addHistory('created', snapshot, derived.title);
    }

    clearTimeout(saveTimer);
    safeWrite(STORAGE.draft, state.draft);
    safeWrite(STORAGE.saved, state.saved);
    renderForm();
    renderPreview();
    renderLibrary();
    showToast(state.editingId === card.id && card.createdAt === card.updatedAt ? 'Карточка сохранена на устройстве' : 'Карточка обновлена');
  }

  function resetDraft() {
    state.draft = normalizeDraft({ role: state.draft.role, category: state.draft.category, values: {} });
    state.editingId = null;
    safeWrite(STORAGE.draft, state.draft);
    updateSwitches();
    renderForm();
    renderPreview();
    showToast('Форма очищена — можно создать новую карточку');
  }

  function cardText(draft = state.draft) {
    const derived = deriveCard(draft);
    const lines = [
      `${draft.role === 'seller' ? 'ПРОДАВЕЦ' : 'КЛИЕНТ'} · ${CATEGORY_META[draft.category].label}`,
      derived.title,
      derived.description,
      '',
      ...derived.metrics.map(([label, value]) => `${label}: ${value}`),
    ];
    if (derived.chips.length) lines.push(`Условия: ${derived.chips.join(' · ')}`);
    lines.push('', `Контакт: ${derived.contactName}`, `Локация: ${derived.location}`);
    if (derived.phone) lines.push(`Телефон: ${derived.phone}`);
    return lines.join('\n');
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      showToast('Текст карточки скопирован');
    } catch (error) {
      console.warn('Копирование недоступно', error);
      showToast('Не удалось скопировать текст');
    }
  }

  async function shareCurrentCard() {
    const derived = deriveCard();
    const text = cardText();
    if (navigator.share) {
      try {
        await navigator.share({ title: `Mal Cards — ${derived.title}`, text });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    await copyText(text);
  }

  function historyActionLabel(action) {
    return ({ created: 'Создано', updated: 'Обновлено', deleted: 'Удалено', imported: 'Импортировано' })[action] || 'Сохранено';
  }

  function formattedDate(value) {
    try {
      return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
    } catch {
      return '';
    }
  }

  function makeLibraryCard(item, source) {
    const snapshot = item.snapshot;
    const derived = deriveCard(snapshot);
    const article = document.createElement('article');
    article.className = 'library-card';
    article.dataset.role = snapshot.role;

    const top = document.createElement('div');
    top.className = 'library-card__top';
    const label = document.createElement('span');
    label.className = 'library-card__label';
    label.textContent = source === 'history' ? historyActionLabel(item.action) : roleLabel(snapshot.role);
    const time = document.createElement('time');
    time.dateTime = source === 'history' ? item.at : item.updatedAt;
    time.textContent = formattedDate(time.dateTime);
    top.append(label, time);

    const title = document.createElement('h3');
    title.textContent = item.title || derived.title;
    const summary = document.createElement('p');
    summary.textContent = derived.description;
    const meta = document.createElement('div');
    meta.className = 'library-card__meta';
    [CATEGORY_META[snapshot.category].label, derived.metrics[0]?.[1], derived.metrics[1]?.[1]].filter(Boolean).forEach((text) => {
      const chip = document.createElement('span');
      chip.textContent = text;
      meta.appendChild(chip);
    });

    const actions = document.createElement('div');
    actions.className = 'library-card__actions';
    const restore = document.createElement('button');
    restore.type = 'button';
    restore.dataset.action = source === 'saved' ? 'edit' : 'restore';
    restore.dataset.id = item.id;
    restore.textContent = source === 'saved' ? 'Открыть' : 'Восстановить';
    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.dataset.action = 'copy';
    copyButton.dataset.id = item.id;
    copyButton.textContent = 'Копировать';
    actions.append(restore, copyButton);

    if (source === 'saved') {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'delete-action';
      remove.dataset.action = 'delete';
      remove.dataset.id = item.id;
      remove.textContent = 'Удалить';
      actions.appendChild(remove);
    }

    article.append(top, title, summary, meta, actions);
    return article;
  }

  function renderEmpty(container, source) {
    const fragment = byId('empty-state-template').content.cloneNode(true);
    $('h3', fragment).textContent = source === 'saved' ? 'Пока нет сохранённых карточек' : 'История пока пуста';
    $('p', fragment).textContent = source === 'saved'
      ? 'Заполните форму выше и сохраните первую карточку — она останется на этом устройстве.'
      : 'Здесь появятся версии созданных и обновлённых карточек.';
    $('button', fragment).addEventListener('click', () => byId('composer').scrollIntoView({ behavior: 'smooth' }));
    container.appendChild(fragment);
  }

  function renderLibrary() {
    byId('saved-count').textContent = String(state.saved.length);
    byId('saved-tab-count').textContent = String(state.saved.length);
    byId('history-tab-count').textContent = String(state.history.length);

    const savedList = byId('saved-list');
    savedList.replaceChildren();
    if (state.saved.length) state.saved.forEach((item) => savedList.appendChild(makeLibraryCard(item, 'saved')));
    else renderEmpty(savedList, 'saved');

    const historyList = byId('history-list');
    historyList.replaceChildren();
    if (state.history.length) state.history.forEach((item) => historyList.appendChild(makeLibraryCard(item, 'history')));
    else renderEmpty(historyList, 'history');
  }

  function setTab(tabName) {
    state.activeTab = tabName;
    $$('.tab').forEach((tab) => {
      const active = tab.dataset.tab === tabName;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    $$('.tab-panel').forEach((panel) => {
      const active = panel.id === `${tabName}-panel`;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    });
  }

  function restoreSnapshot(snapshot, editingId = null) {
    state.draft = normalizeDraft(clone(snapshot));
    state.editingId = editingId;
    safeWrite(STORAGE.draft, state.draft);
    updateSwitches();
    renderForm();
    renderPreview();
    byId('composer').scrollIntoView({ behavior: 'smooth' });
    showToast(editingId ? 'Карточка открыта для редактирования' : 'Версия восстановлена как новый черновик');
  }

  function handleLibraryAction(event, source) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const collection = source === 'saved' ? state.saved : state.history;
    const item = collection.find((entry) => entry.id === button.dataset.id);
    if (!item) return;

    if (button.dataset.action === 'edit') restoreSnapshot(item.snapshot, item.id);
    if (button.dataset.action === 'restore') restoreSnapshot(item.snapshot);
    if (button.dataset.action === 'copy') copyText(cardText(item.snapshot));
    if (button.dataset.action === 'delete') {
      if (!confirm(`Удалить карточку «${item.title}»?`)) return;
      state.saved = state.saved.filter((entry) => entry.id !== item.id);
      if (state.editingId === item.id) state.editingId = null;
      addHistory('deleted', item.snapshot, item.title);
      safeWrite(STORAGE.saved, state.saved);
      renderForm();
      renderPreview();
      renderLibrary();
      showToast('Карточка удалена');
    }
  }

  function clearLibrary() {
    if (!state.saved.length && !state.history.length) {
      showToast('Локальная база уже пуста');
      return;
    }
    if (!confirm('Удалить все сохранённые карточки и всю историю с этого устройства?')) return;
    state.saved = [];
    state.history = [];
    state.editingId = null;
    safeWrite(STORAGE.saved, []);
    safeWrite(STORAGE.history, []);
    renderForm();
    renderPreview();
    renderLibrary();
    showToast('Сохранённые карточки и история удалены');
  }

  function showToast(message) {
    const toast = byId('toast');
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('is-visible');
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
  }

  function switchRole(role) {
    if (state.draft.role === role) return;
    state.draft.role = role;
    state.editingId = null;
    updateSwitches();
    renderForm();
    renderPreview();
    scheduleDraftSave();
  }

  function switchCategory(category) {
    if (state.draft.category === category) return;
    state.draft.category = category;
    state.editingId = null;
    updateSwitches();
    renderForm();
    renderPreview();
    scheduleDraftSave();
  }

  function bindEvents() {
    $$('[data-role]').forEach((button) => button.addEventListener('click', () => switchRole(button.dataset.role)));
    $$('[data-category]').forEach((button) => button.addEventListener('click', () => switchCategory(button.dataset.category)));
    byId('card-form').addEventListener('input', handleFieldInput);
    byId('card-form').addEventListener('change', handleFieldChange);
    byId('card-form').addEventListener('submit', saveCard);
    byId('reset-form').addEventListener('click', resetDraft);
    byId('copy-card').addEventListener('click', () => copyText(cardText()));
    byId('share-card').addEventListener('click', shareCurrentCard);
    byId('open-library').addEventListener('click', () => byId('library').scrollIntoView({ behavior: 'smooth' }));
    byId('clear-library').addEventListener('click', clearLibrary);
    $$('.tab').forEach((tab) => tab.addEventListener('click', () => setTab(tab.dataset.tab)));
    byId('saved-list').addEventListener('click', (event) => handleLibraryAction(event, 'saved'));
    byId('history-list').addEventListener('click', (event) => handleLibraryAction(event, 'history'));
  }

  function init() {
    ensureAnimalClass();
    updateSwitches();
    renderForm();
    renderPreview();
    renderLibrary();
    setTab('saved');
    bindEvents();
  }

  init();
})();
