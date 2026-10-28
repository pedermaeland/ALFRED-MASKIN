/*
  APP.JS - kobler HTML-sidene til dataene

  Finn seksjonen du trenger med Ctrl+F:
    1. Små hjelpefunksjoner
    2. Data og trygg lagring
    3. Åpne riktig side
    4. Runder (index.html og runde.html)
    5. Arbeidsregistrering (arbeid.html)
    6. Kunder (kunder.html og kunde.html)
    7. Historikk (historikk.html)
    8. Eksport og nedlasting (data.html)
    9. Søkefelt og knapper
   10. Lagre skjemaer
   11. Start siden

  Ord brukt i koden:
    customer = kunde, address = arbeidsadresse, record = arbeidsregistrering.
    round = en gjenbrukbar runde. run = én bestemt kjøring av runden.
    appData = alle dataene som denne siden har lest fra nettleseren.

  Sidens layout og skjemaer ligger i HTML-filene.
  Listene fylles med JavaScript fordi innholdet kommer fra lagrede data.
  Funksjonene er samlet inni (() => { ... })() for å holde navnene lokale.
*/
(() => {

  // ==========================================================
  // 1. SMÅ HJELPEFUNKSJONER
  // ==========================================================
  const root = document.querySelector('#app');
  const feedback = document.querySelector('#feedback');
  // Vis brukerens tekst som tekst. Den skal ikke kunne bli til HTML-kode.
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
  const createId = () => crypto.randomUUID();
  const formatDate = value => new Date(value).toLocaleString('nb-NO', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
  // Datofeltet trenger lokal tid som YYYY-MM-DDTHH:mm.
  const toLocalDateTime = (value = new Date()) => {
    const d = new Date(value);
    return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  const createButtonHtml = (label, action, id = '', style = '') =>
    `<button type="button" class="${style}" data-action="${action}" data-id="${escapeHtml(id)}">${label}</button>`;
  const emptyMessageHtml = text => `<p class="empty">${text}</p>`;
  const status = {
    pending: 'Gjenstår',
    completed: 'Fullført',
    skipped: 'Hoppet over'
  };

  // ==========================================================
  // 2. DATA OG TRYGG LAGRING
  // ==========================================================
  let appData; // Kopien av nettleserens lagrede data som denne siden bruker.
  let savingBlocked = false;
  const params = new URLSearchParams(location.search);
  const page = document.body.dataset.page;
  let selectedRun = params.get('run'); // ID til kjøringen vi har åpnet.
  let stopIndex = Number(params.get('stop') || 0); // Første stopp har indeks 0.
  let draftRound = null; // Endringer i runden før brukeren trykker Lagre.

  function showMessage(text, error = false) {
    feedback.textContent = text;
    feedback.hidden = false;
    feedback.className = error ? 'feedback error' : 'feedback success';
    feedback.setAttribute('role', error ? 'alert' : 'status');
    if (error) feedback.scrollIntoView({
      block: 'nearest'
    });
  }
  try {
    appData = Alfred.storage.load();
  } catch (error) {
    savingBlocked = true;
    appData = Alfred.seed();
    showMessage(
      'Kunne ikke lese lagrede data. Ingen data blir overskrevet. Prøv å åpne siden igjen før du fortsetter.',
      true);
  }
  // 1) Kopier dataene. 2) Endre kopien. 3) Lagre. 4) Bruk kopien.
  // Hvis lagringen feiler, beholdes gamle data og det åpne skjemaet.
  function saveChanges(change) {
    if (savingBlocked) throw new Error(
      'Lagring er sperret fordi eksisterende data ikke kunne leses.');
    const next = structuredClone(appData);
    change(next);
    Alfred.storage.save(next); // Kaster ved feil. Da beholdes appData og skjemaet.
    appData = next;
  }
  const customer = id => appData.customers.find(c => c.id === id);
  const address = id => appData.addresses.find(a => a.id === id);
  const availableAddresses = () => {
    return appData.addresses.filter(workAddress => {
      const owner = customer(workAddress.customerId);
      return !owner.archived;
    });
  };

  // ==========================================================
  // 3. ÅPNE RIKTIG SIDE
  // ==========================================================
  function goToPage(nextPage) {
    location.href = ({
      rounds: 'index.html',
      customers: 'kunder.html',
      history: 'historikk.html',
      data: 'data.html'
    })[nextPage] + '?saved=1';
  }

  function initialiseCurrentPage() {
    try {
      ({
        rounds: renderRounds,
        customers: renderCustomers,
        history: renderHistory,
        data: renderData,
        'customer-edit': () => renderCustomerEditor(params.get('id')),
        'round-edit': () => {
          draftRound = structuredClone(appData.rounds.find(r => r.id === params.get('id')) ||
          {
            name: '',
            addressIds: []
          });
          renderRoundEditor();
        },
        work: renderWork
      })[page]();
    } catch (error) {
      root.querySelectorAll('form, [data-action]').forEach(el => el.hidden = true);
      showMessage('Kunne ikke åpne siden: ' + error.message, true);
    }
  }

  // ==========================================================
  // 4. RUNDER - index.html og runde.html
  // ==========================================================
  function renderRounds() {
    document.querySelector("#round-list").innerHTML = appData.rounds.map(r => `<article class="card">
<p class="eyebrow">FAST RUNDE</p>
<h2>${escapeHtml(r.name)}</h2>
<p>${r.addressIds.length} adresser</p>
<div class="actions">${createButtonHtml('Start ny kjøring', 'start-run', r.id, 'primary')}${createButtonHtml('Rediger', 'edit-round', r.id)}</div>
</article>`).join('') || emptyMessageHtml('Ingen runder ennå.');
    document.querySelector("#run-list").innerHTML = [...appData.runs].reverse().map(r => `<article class="card row">
<div>
<h3>${escapeHtml(r.name)}</h3>
<p>${formatDate(r.startedAt)} · ${r.stops.filter(s => s.status === 'completed').length}/${r.stops.length} fullført</p>
</div>${createButtonHtml('Åpne', 'open-run', r.id)}</article>`).join('') || emptyMessageHtml(
      'Start en runde for å komme i gang.');
  }

  function renderRoundEditor() {
    const options = availableAddresses().filter(a => !draftRound.addressIds.includes(a.id));
    document.querySelector('#round-form [name="name"]').value = draftRound.name;
    document.querySelector('#round-stops').innerHTML = draftRound.addressIds.map((id, i) => {
      const a = address(id);
      return `<li class="card">
<strong>${escapeHtml(customer(a.customerId).name)}</strong>
<p>${escapeHtml(a.label)}${customer(a.customerId).archived ? ' · Arkivert kunde' : ''}</p>
<div class="actions">
<button type="button" data-action="move-up" data-index="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Flytt stopp ${i + 1} opp">Opp</button>
<button type="button" data-action="move-down" data-index="${i}" ${i === draftRound.addressIds.length - 1 ? 'disabled' : ''} aria-label="Flytt stopp ${i + 1} ned">Ned</button>${createButtonHtml('Fjern fra runden', 'remove-stop', id)}</div>
</li>`;
    }).join('');
    document.querySelector('#round-form [name="address"]').innerHTML =
      '<option value="">Velg adresse</option>' + options.map(a =>
        `<option value="${escapeHtml(a.id)}">${escapeHtml(customer(a.customerId).name)} · ${escapeHtml(a.label)}</option>`
        ).join('');
  }
  // En ny kjøring kopierer stoppene. Den endrer aldri tidligere kjøringer.
  function startRun(id) {
    const round = appData.rounds.find(r => r.id === id);
    const addresses = round.addressIds.map(address).filter(a => !customer(a.customerId).archived);
    if (!addresses.length) throw new Error(
      'Legg til minst én aktiv arbeidsadresse i runden først.');
    const runId = createId();
    saveChanges(next => next.runs.push({
      id: runId,
      name: round.name,
      startedAt: new Date().toISOString(),
      stops: addresses.map(a => ({
        id: createId(),
        addressId: a.id,
        customerId: a.customerId,
        customerName: customer(a.customerId).name,
        addressLabel: a.label,
        instructions: [customer(a.customerId).notes, a.instructions].filter(Boolean)
          .join('\n'),
        services: [...a.services],
        status: 'pending'
      }))
    }));
    selectedRun = runId;
    stopIndex = 0;
    location.href = getWorkPageUrl(runId, 0);
  }

  // ==========================================================
  // 5. ARBEIDSREGISTRERING - arbeid.html
  // ==========================================================
  // Les run og stop fra URL-en, og fyll feltene i arbeid.html.
  function renderWork() {
    const run = appData.runs.find(r => r.id === selectedRun);
    if (!run || !Number.isInteger(stopIndex) || !run.stops[stopIndex]) throw new Error(
      'Kjøringen eller stoppet finnes ikke.');
    const stop = run.stops[stopIndex];
    const completed = run.stops.filter(s => s.status === 'completed').length;
    const skipped = run.stops.filter(s => s.status === 'skipped').length;
    const text = (id, value) => document.getElementById(id).textContent = value;
    text('run-name', run.name);
    text('run-progress',
      `${completed} fullført · ${skipped} hoppet over · ${run.stops.length-completed-skipped} gjenstår`
      );
    document.querySelector('#progress').max = run.stops.length;
    document.querySelector('#progress').value = completed + skipped;
    text('stop-number', `Stopp ${stopIndex+1} av ${run.stops.length}`);
    text('stop-status', status[stop.status]);
    document.querySelector('#stop-status').className = 'status ' + stop.status;
    text('customer-name', stop.customerName);
    text('work-address', stop.addressLabel);
    text('instructions', stop.instructions);
    const record = appData.records.find(r => r.runId === run.id && r.stopId === stop.id);
    if (record) {
      document.querySelector('#work-form').remove();
      text('saved-work', `${record.service} · ${formatDate(record.workedAt)} · ${record.note}`);
    } else {
      document.querySelector('[name="service"]').innerHTML = stop.services.map(s =>
        `<option>${escapeHtml(s)}</option>`).join('');
      document.querySelector('[name="workedAt"]').value = toLocalDateTime();
    }
    for (const [id, index] of [
        ['previous-stop', stopIndex - 1],
        ['next-stop', stopIndex + 1]
      ]) {
      const link = document.getElementById(id);
      if (index >= 0 && index < run.stops.length) link.href = getWorkPageUrl(run.id, index);
      else {
        link.setAttribute('aria-disabled', 'true');
        link.removeAttribute('href');
      }
    }
    document.querySelector('#address-history').innerHTML = recordList(appData.records.filter(r =>
      r.addressId === stop.addressId));
  }

  function getWorkPageUrl(runId, index) {
    return 'arbeid.html?run=' + encodeURIComponent(runId) + '&stop=' + index;
  }

  function goToNextStop(kind = 'work') {
    const run = appData.runs.find(r => r.id === selectedRun);
    location.href = stopIndex < run.stops.length - 1 ? getWorkPageUrl(selectedRun, stopIndex +
      1) + '&saved=' + kind : 'index.html?saved=' + kind;
  }

  // ==========================================================
  // 6. KUNDER - kunder.html og kunde.html
  // ==========================================================
  function renderCustomers() {
    filterCustomers();
  }

  function filterCustomers() {
    const query = document.querySelector('#customer-search').value.trim().toLocaleLowerCase(
      'nb-NO');
    const archived = document.querySelector('#show-archived').checked;
    const matches = appData.customers.filter(c => (archived || !c.archived) && [c.name, ...appData
      .addresses.filter(a => a.customerId === c.id).map(a => a.label)
    ].some(v => v.toLocaleLowerCase('nb-NO').includes(query)));
    document.querySelector('#customer-results').innerHTML = matches.map(c =>
      `<article class="card"><div class="row"><h2>${escapeHtml(c.name)}</h2>${c.archived ? '<span class="status">Arkivert</span>' : ''}</div><p class="small muted">Kunde-ID: ${escapeHtml(c.id)}</p>${appData.addresses.filter(a => a.customerId === c.id).map(a => `<p>${escapeHtml(a.label)}</p>`).join('')}<div class="actions">${createButtonHtml('Rediger', 'edit-customer', c.id)}${createButtonHtml('Historikk', 'customer-history', c.id)}${createButtonHtml(c.archived ? 'Aktiver' : 'Arkiver', 'archive-customer', c.id)}</div></article>`
      ).join('') || emptyMessageHtml('Ingen kunder funnet.');
  }
  // Kopier adresse-malen fra kunde.html og fyll den med én adresse.
  function addAddressFields(a = {}) {
    const field = document.querySelector('#address-template').content.firstElementChild.cloneNode(
      true);
    field.dataset.id = a.id || '';
    field.querySelector('[name="addressLabel"]').value = a.label || '';
    field.querySelector('[name="instructions"]').value = a.instructions || '';
    field.querySelectorAll('[name="services"]').forEach(input => input.checked = (a.services || [
      'Brøyting'
    ]).includes(input.value));
    document.querySelector('#address-fields').append(field);
  }

  function renderCustomerEditor(id) {
    const c = id ? customer(id) : {
      name: '',
      phone: '',
      email: '',
      notes: ''
    };
    if (!c) throw new Error('Kunden finnes ikke.');
    const form = document.querySelector('#customer-form');
    form.dataset.id = id || '';
    for (const key of ['name', 'phone', 'email', 'notes']) form.elements[key].value = c[key];
    const addresses = appData.addresses.filter(a => a.customerId === id);
    (addresses.length ? addresses : [{}]).forEach(addAddressFields);
  }

  // ==========================================================
  // 7. HISTORIKK - historikk.html
  // ==========================================================
  // Lag ett historikkort per registrering. Nyeste arbeid vises først.
  function recordList(records) {
    return `<div class="stack">${[...records].sort((a, b) => Date.parse(b.workedAt) - Date.parse(a.workedAt)).map(r => `<article class="card"><div class="row"><h3>${escapeHtml(r.customerName)}</h3><span class="status completed">${escapeHtml(r.service)}</span></div><p>${escapeHtml(r.addressLabel)}</p><p><strong>${formatDate(r.workedAt)}</strong>${r.duration !== null ? ` · ${r.duration} min` : ''}</p>${r.note ? `<p class="instructions">${escapeHtml(r.note)}</p>` : ''}<p class="small muted">Registrert ${formatDate(r.createdAt)}</p></article>`).join('') || emptyMessageHtml('Ingen registrert arbeid i dette utvalget.')}</div>`;
  }

  function renderHistory() {
    document.querySelector('#history-customer').insertAdjacentHTML('beforeend', appData.customers
      .map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join(''));
    document.querySelector('#history-customer').value = params.get('customer') || '';
    filterHistory();
  }

  function filterHistory() {
    const c = document.querySelector('#history-customer').value;
    const day = document.querySelector('#history-date').value;
    const service = document.querySelector('#history-service').value;
    document.querySelector('#history-results').innerHTML = recordList(appData.records.filter(r =>
      (!c || r.customerId === c) && (!day || toLocalDateTime(r.workedAt).slice(0, 10) ===
      day) && (!service || r.service === service)));
  }

  // ==========================================================
  // 8. EKSPORT OG NEDLASTING - data.html
  // ==========================================================
  function renderData() {
    document.querySelector('#data-counts').textContent =
      `${appData.customers.length} kunder · ${appData.rounds.length} runder · ${appData.records.length} arbeidsregistreringer`;
  }
  // Lag en midlertidig fil i nettleseren og start en vanlig nedlasting.
  function download(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], {
      type
    }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ==========================================================
  // 9. SØKEFELT OG KNAPPER
  // ==========================================================
  root.addEventListener('input', event => {
    if (event.target.id === 'customer-search') filterCustomers();
    if (event.target.id.startsWith('history-')) filterHistory();
  });
  root.addEventListener('change', event => {
    if (event.target.id === 'show-archived') filterCustomers();
  });
  // HTML-knappens data-action forteller hvilken handling som skal kjøres.
  root.addEventListener('click', event => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const {
      action,
      id
    } = target.dataset;
    if (!savingBlocked) feedback.hidden = true;
    try {
      switch (action) {
        case 'new-customer':
          location.href = 'kunde.html';
          break;
        case 'edit-customer':
          location.href = 'kunde.html?id=' + encodeURIComponent(id);
          break;
        case 'add-address':
          addAddressFields();
          break;
        case 'archive-customer':
          saveChanges(next => {
            const c = next.customers.find(c => c.id === id);
            c.archived = !c.archived;
          });
          filterCustomers();
          showMessage('Kundestatus lagret. Historikken er beholdt.');
          break;
        case 'customer-history':
          location.href = 'historikk.html?customer=' + encodeURIComponent(id);
          break;
        case 'edit-round':
          location.href = 'runde.html?id=' + encodeURIComponent(id);
          break;
        case 'add-stop':
        case 'remove-stop':
        case 'move-up':
        case 'move-down': {
          draftRound.name = document.querySelector('#round-form [name="name"]').value;
          if (action === 'add-stop') {
            const id = document.querySelector('#round-form [name="address"]').value;
            if (id) draftRound.addressIds.push(id);
          }
          if (action === 'remove-stop') draftRound.addressIds = draftRound.addressIds.filter(
            v => v !== id);
          if (action.startsWith('move-')) {
            const i = Number(target.dataset.index);
            const j = i + (action === 'move-up' ? -1 : 1);
            [draftRound.addressIds[i], draftRound.addressIds[j]] = [draftRound.addressIds[j],
              draftRound.addressIds[i]
            ];
          }
          renderRoundEditor();
          break;
        }
        case 'start-run':
          startRun(id);
          break;
        case 'open-run':
          location.href = getWorkPageUrl(id, Math.max(0, appData.runs.find(r => r.id === id)
            .stops.findIndex(s => s.status === 'pending')));
          break;
        case 'skip-stop':
          saveChanges(next => {
            next.runs.find(r => r.id === selectedRun).stops[stopIndex].status = 'skipped';
          });
          goToNextStop('skip');
          showMessage('Stopp hoppet over. Ingen arbeidsregistrering opprettet.');
          break;
        case 'backup':
          download('alfred-demo-backup.json', JSON.stringify(appData, null, 2),
            'application/json');
          showMessage('Sikkerhetskopi sendt til nedlasting. Kontroller at filen er lagret.');
          break;
        case 'csv': {
          const cell = value => '"' + String(value ?? '').replace(/^[=+@\-\t\r]/, match =>
            "'" + match).replaceAll('"', '""') + '"';
          const rows = [
            ['Kunde', 'Adresse', 'Tjeneste', 'Utført (ISO)', 'Registrert (ISO)', 'Minutter',
              'Notat'
            ], ...appData.records.map(r => [r.customerName, r.addressLabel, r.service, r
              .workedAt, r.createdAt, r.duration, r.note
            ])
          ];
          download('alfred-demo-arbeidslogg.csv', '\uFEFF' + rows.map(row => row.map(cell)
            .join(';')).join('\r\n'), 'text/csv;charset=utf-8');
          break;
        }
      }
    } catch (error) {
      showMessage('Kunne ikke fullføre: ' + error.message, true);
    }
  });

  // ==========================================================
  // 10. LAGRE SKJEMAER
  // ==========================================================
  root.addEventListener('submit', async event => {
    // Stopp vanlig skjemainnsending. Vi lagrer lokalt i stedet for på en server.
    event.preventDefault();
    const form = event.target;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    try {
      // KUNDESKJEMA: lagre kundedetaljer og alle adressefeltene.
      if (form.id === 'customer-form') {
        const id = form.dataset.id || createId();
        const name = data.get('name').trim();
        if (!name) throw new Error('Skriv inn et navn.');
        const addresses = [...form.querySelectorAll('.address-fields')].map(field => ({
          id: field.dataset.id || createId(),
          customerId: id,
          label: field.querySelector('[name="addressLabel"]').value.trim(),
          instructions: field.querySelector('[name="instructions"]').value.trim(),
          services: [...field.querySelectorAll('[name="services"]:checked')].map(
            input => input.value)
        }));
        if (addresses.some(a => !a.label || !a.services.length)) throw new Error(
          'Hver adresse må ha tekst og minst én tjeneste.');
        saveChanges(next => {
          const existing = next.customers.find(c => c.id === id);
          const values = {
            id,
            name,
            phone: data.get('phone').trim(),
            email: data.get('email').trim(),
            notes: data.get('notes').trim(),
            archived: existing?.archived || false
          };
          if (existing) Object.assign(existing, values);
          else next.customers.push(values);
          for (const a of addresses) {
            const existingAddress = next.addresses.find(v => v.id === a.id);
            if (existingAddress) Object.assign(existingAddress, a);
            else next.addresses.push(a);
          }
        });
        goToPage('customers');
        showMessage('Kunde og adresser lagret.');
      }
      // RUNDESKJEMA: lagre navn og valgt rekkefølge.
      if (form.id === 'round-form') {
        const round = {
          id: draftRound.id || createId(),
          name: data.get('name').trim(),
          addressIds: [...draftRound.addressIds]
        };
        if (!round.name || !round.addressIds.length) throw new Error(
          'Runden trenger navn og minst én adresse.');
        saveChanges(next => {
          const existing = next.rounds.find(r => r.id === round.id);
          if (existing) Object.assign(existing, round);
          else next.rounds.push(round);
        });
        goToPage('rounds');
        showMessage('Runde lagret. Eksisterende kjøringer er uendret.');
      }
      // ARBEIDSSKJEMA: lagre registreringen og fullfør stoppet i samme operasjon.
      if (form.id === 'work-form') {
        const workedAt = new Date(data.get('workedAt'));
        if (!Number.isFinite(workedAt.getTime())) throw new Error('Velg en gyldig dato.');
        const duration = data.get('duration') === '' ? null : Number(data.get('duration'));
        saveChanges(next => {
          const stop = next.runs.find(r => r.id === selectedRun).stops[stopIndex];
          if (stop.status === 'completed') throw new Error(
            'Stoppet er allerede registrert.');
          next.records.push({
            id: createId(),
            runId: selectedRun,
            stopId: stop.id,
            customerId: stop.customerId,
            addressId: stop.addressId,
            customerName: stop.customerName,
            addressLabel: stop.addressLabel,
            service: data.get('service'),
            workedAt: workedAt.toISOString(),
            createdAt: new Date().toISOString(),
            duration,
            note: data.get('note').trim()
          });
          stop.status = 'completed';
        });
        goToNextStop();
        showMessage('Arbeid lagret.');
      }
      // GJENOPPRETTING: sjekk hele filen før eksisterende data erstattes.
      if (form.id === 'restore-form') {
        const file = data.get('backup');
        if (file.size > 10 * 1024 * 1024) throw new Error(
          'Filen er for stor for denne demoen (maks 10 MB).');
        // Valider og lagre først. Den eksisterende staten beholdes ved feil.
        const restored = Alfred.storage.validate(JSON.parse(await file.text()));
        if (savingBlocked) throw new Error(
          'Åpne siden igjen for å undersøke lagringsfeilen før gjenoppretting.');
        Alfred.storage.save(restored);
        appData = restored;
        selectedRun = null;
        goToPage('data');
        showMessage('Sikkerhetskopi gjenopprettet.');
      }
    } catch (error) {
      showMessage('Kunne ikke lagre: ' + error.message, true);
    }
  });

  // ==========================================================
  // 11. START SIDEN
  // ==========================================================
  initialiseCurrentPage();
  if (!savingBlocked && params.has('saved')) showMessage(params.get('saved') === 'skip' ?
    'Stopp hoppet over. Ingen arbeid registrert.' : 'Endringene er lagret.');
})();

// Read fresh data if the browser restores this page with the Back button.
window.addEventListener("pageshow", event => {
  if (event.persisted) location.reload();
});
