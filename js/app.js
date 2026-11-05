/* Shared screen helpers. Each feature owns its own forms and rendering. */
const byId = id => document.getElementById(id);
let appData;
let saving = false;

function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) {
        node.textContent = text;
    }
    if (className) {
        node.className = className;
    }
    return node;
}

function appLink(text, href, primary = false) {
    const link = element('a', text, primary ? 'button primary' : 'button');
    link.href = href;
    return link;
}

function appButton(text, action, className) {
    const button = element('button', text, className);
    button.type = 'button';
    button.addEventListener('click', action);
    return button;
}

function card(title, detail, actions = []) {
    const article = element('article', undefined, 'card');
    article.append(element('h2', title));
    if (detail) {
        article.append(element('p', detail));
    }
    if (actions.length) {
        const row = element('div', undefined, 'actions');
        row.append(...actions);
        article.append(row);
    }
    return article;
}

function showList(id, items, emptyMessage) {
    byId(id).replaceChildren(...(items.length ? items : [element('p', emptyMessage, 'empty')]));
}

function appMessage(message, error = false) {
    const status = byId('app-status');
    status.className = error ? 'feedback error' : 'feedback success';
    status.hidden = !message;
    status.textContent = message;
    if (message && error) {
        status.scrollIntoView({ block: 'nearest' });
    }
}

const osloClock = new Intl.DateTimeFormat('nb-NO', {
    timeZone: 'Europe/Oslo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
});

// Keep ISO values for storage and filtering. Format them for people at display time.
function localDateTime(date = new Date()) {
    const parts = Object.fromEntries(osloClock.formatToParts(date).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function displayDate(value) {
    return value.slice(0, 10).split('-').reverse().join('.');
}

function displayClock(value) {
    return `kl. ${value.slice(11, 16)}`;
}

function displayTime(value) {
    return `${displayDate(value)} ${displayClock(value)}`;
}

// The field keeps its native picker. Show Norwegian text when it is at rest.
function updateDateReadout(input) {
    let field = input.parentElement;
    if (!field.classList.contains('date-control')) {
        field = element('span', undefined, 'date-control');
        const readout = element('span', undefined, 'date-readout');
        readout.setAttribute('aria-hidden', 'true');
        input.before(field);
        field.append(input, readout);
    }

    const dateOnly = input.type === 'date';
    const placeholder = dateOnly ? 'dd.mm.åååå' : 'dd.mm.åååå kl. tt:mm';
    field.lastElementChild.textContent = input.value
        ? (dateOnly ? displayDate(input.value) : displayTime(input.value))
        : placeholder;
}

document.addEventListener('input', event => {
    if (event.target.matches('input[type="date"], input[type="datetime-local"]')) {
        updateDateReadout(event.target);
    }
});

function selectedRoute() {
    const [screen, query] = location.hash.slice(1).split('?');
    return { screen: screen || 'oversikt', params: new URLSearchParams(query) };
}

function goTo(hash) {
    stopScreenAnimation?.();
    if (location.hash !== hash) {
        history.pushState(null, '', hash);
    }
    const destination = findDestination(hash);
    if (destination.screen !== currentScreen && !reducedMotion.matches && Element.prototype.animate) {
        slideScreen(destination, false);
    } else {
        showScreen(destination, true);
    }
}

function addressesFrom(data, includeArchived = false) {
    return data.customers
        .filter(customer => includeArchived || !customer.archived)
        .flatMap(customer => customer.addresses.map(address => ({ ...address, customer })));
}

function addressOptions(select, addresses, selected = '') {
    select.replaceChildren(new Option('Velg adresse', ''));
    for (const address of addresses) {
        select.add(new Option(`${address.customer.name} · ${address.label}`, address.id));
    }
    select.value = selected;
}

function fillServices(select, choices = serviceNames(), selected = '', placeholder) {
    select.replaceChildren();
    if (placeholder) {
        select.add(new Option(placeholder, ''));
    }
    for (const service of choices) {
        select.add(new Option(service, service));
    }
    if (selected && choices.includes(selected)) {
        select.value = selected;
    }
}

function renderOverview() {
    const jobs = upcomingJobs();
    const runs = appData.runs.filter(run => run.stops.some(stop => stop.status === 'pending'));
    byId('count-plan').textContent = jobs.length;
    byId('count-plan').closest('a').setAttribute('aria-label', `Kalender, ${jobs.length} kommende jobber`);
    byId('count-runder').textContent = appData.rounds.length;
    byId('count-kunder').textContent = appData.customers.filter(customer => !customer.archived).length;
    byId('count-logg').textContent = appData.visits.length;

    const active = byId('home-active');
    active.replaceChildren();
    if (appData.activeWork) {
        const activeWork = appData.activeWork;
        const context = workContext(appData, new URLSearchParams(activeWork.target.split('?')[1]));
        const link = element('a', undefined, 'card continue-round');
        link.href = activeWork.target;
        const description = element('span', undefined, 'list-text');
        description.append(
            element('strong', activeWork.runningSince === null ? 'Arbeid på pause' : 'Arbeid pågår'),
            element('span', context?.location.address ?? 'Fortsett arbeid', 'row-detail')
        );
        link.append(description, element('span', undefined, 'chevron'));
        active.append(link);
    } else if (runs.length) {
        const run = runs.at(-1);
        const next = run.stops.find(stop => stop.status === 'pending');
        const link = element('a', undefined, 'card continue-round');
        link.href = workLink('run', run.id, next.id);
        const description = element('span', undefined, 'list-text');
        description.append(element('strong', `Fortsett ${run.name}`), element('span', next.address, 'row-detail'));
        link.append(description, element('span', undefined, 'chevron'));
        active.append(link);
    }

    showList('home-today', jobs.slice(0, 3).map(job => {
        const location = job.location;
        return card(location.customerName, `${displayTime(job.scheduled)} · ${location.address}`, [
            appLink('Åpne jobb', workLink('job', job.id))
        ]);
    }), 'Ingen kommende jobber. Planlegg arbeid i kalenderen.');
    byId('home-calendar-all').hidden = jobs.length <= 3;
}

function renderCurrentScreen() {
    if (!appData) {
        return;
    }

    const { screen, params } = selectedRoute();
    appShell.classList.toggle('calendar-layout', screen === 'plan');
    if (screen === 'oversikt') {
        renderOverview();
    } else if (screen === 'kunder') {
        renderCustomers();
    } else if (screen === 'kunde') {
        openCustomerEditor(params.get('id'));
    } else if (screen === 'runder') {
        renderRounds();
    } else if (screen === 'runde') {
        openRoundEditor(params.get('id'));
    } else if (screen === 'plan') {
        openCalendar(params.get('date'));
    } else if (screen === 'jobb') {
        openJobEditor(params.get('id'), params.get('date'));
    } else if (screen === 'arbeid') {
        renderWorkScreen(params);
    } else if (screen === 'logg') {
        openLog(params.get('customer'));
    }
    for (const input of currentScreen.querySelectorAll('input[type="date"], input[type="datetime-local"]')) {
        updateDateReadout(input);
    }
}

async function saveChange(update, onSuccess) {
    if (!appData || saving) {
        return;
    }

    saving = true;
    try {
        appData = await workTransaction(update);
    } catch (error) {
        appMessage(error?.name === 'Error' ? error.message : 'Kunne ikke lagre. Prøv igjen.', true);
        return;
    } finally {
        saving = false;
    }

    renderOverview();
    onSuccess();
}

document.addEventListener('app:navigate', () => {
    appMessage('');
    renderCurrentScreen();
});

const appScreens = document.querySelectorAll('[data-screen]');
for (const screen of appScreens) {
    screen.inert = true;
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await openWorkDatabase();
        appData = await workTransaction((data, firstOpen) => {
            importPreviousCustomers(data, firstOpen);
            ensureServiceCatalog(data);
        });
        for (const screen of appScreens) {
            screen.inert = false;
        }
        renderOverview();
        renderCurrentScreen();
    } catch {
        appMessage('Kunne ikke åpne lokal lagring. Åpne appen i en nettleser med lokal lagring tilgjengelig.', true);
    }
});
