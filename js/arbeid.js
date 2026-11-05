const workContent = byId('work-content');
const serviceSheet = byId('service-sheet');
const jobForm = byId('job-form');
let editingJobId;
let workTimerInterval;

function snapshotAddress(address) {
    return {
        customerId: address.customer.id,
        customerName: address.customer.name,
        addressId: address.id,
        address: address.label,
        instructions: address.instructions,
        services: [...address.services]
    };
}

function workLink(kind, id, stopId) {
    const params = new URLSearchParams({ [kind]: id });
    if (stopId) {
        params.set('stop', stopId);
    }
    return `#arbeid?${params}`;
}

function openJobEditor(id, requestedDate) {
    editingJobId = id;
    const job = appData.jobs.find(entry => entry.id === id && entry.status === 'pending');
    jobForm.hidden = Boolean(id && !job);
    if (jobForm.hidden) {
        appMessage('Fant ikke en planlagt jobb som kan redigeres.', true);
        return;
    }

    const addresses = addressesFrom(appData);
    const preferred = job?.scheduled.slice(0, 10) ?? requestedDate ?? byId('plan-date').value;
    const selected = calendarDate(preferred) ? preferred : localDateTime().slice(0, 10);
    byId('plan-date').value = selected;
    byId('jobb').querySelector('h1').textContent = job ? 'Rediger jobb' : 'Planlegg jobb';
    byId('jobb').querySelector('.back-link').href = `#plan?date=${selected}`;
    addressOptions(jobForm.elements.namedItem('address'), addresses, job?.location.addressId);
    jobForm.elements.namedItem('scheduled').value = job?.scheduled
        ?? `${selected}T${selected === localDateTime().slice(0, 10) ? localDateTime().slice(11, 16) : '08:00'}`;
    jobForm.elements.namedItem('note').value = job?.note ?? '';
    updateJobServices(job?.service);
    if (!addresses.length) {
        appMessage('Legg til en aktiv kunde med en arbeidsadresse først.');
    }
}

function updateJobServices(selected) {
    const address = addressesFrom(appData).find(entry => entry.id === jobForm.elements.namedItem('address').value);
    fillServices(jobForm.elements.namedItem('service'), address?.services ?? [], selected);
}

jobForm.elements.namedItem('address').addEventListener('change', () => updateJobServices());
jobForm.addEventListener('submit', event => {
    event.preventDefault();
    const fields = new FormData(jobForm);
    const id = editingJobId || newId();
    const editing = Boolean(editingJobId);
    saveChange(data => {
        const index = data.jobs.findIndex(job => job.id === id && job.status === 'pending');
        const address = addressesFrom(data).find(entry => entry.id === fields.get('address'));
        const service = fields.get('service');
        if ((editing && index < 0) || !address?.services.includes(service)) {
            throw new Error('Jobben eller tjenesten er endret. Åpne planen på nytt.');
        }

        if (data.activeWork?.target === workLink('job', id)) {
            throw new Error('Avslutt det pågående arbeidet før du redigerer jobben.');
        }

        const job = {
            id,
            location: snapshotAddress(address),
            service,
            scheduled: fields.get('scheduled').slice(0, 16),
            note: fields.get('note').trim(),
            status: 'pending'
        };
        if (editing) {
            data.jobs[index] = job;
        } else {
            data.jobs.push(job);
        }
    }, () => {
        byId('plan-date').value = fields.get('scheduled').slice(0, 10);
        goTo(`#plan?date=${byId('plan-date').value}`);
        appMessage('Jobben er lagret.');
    });
});

function workContext(data, params) {
    const run = data.runs.find(entry => entry.id === params.get('run'));
    if (run) {
        const index = run.stops.findIndex(stop => stop.id === params.get('stop'));
        if (index >= 0) {
            return { run, index, location: run.stops[index], record: run.stops[index] };
        }
    }
    const job = data.jobs.find(entry => entry.id === params.get('job'));
    if (job) {
        return { job, location: job.location, record: job };
    }
    return null;
}

function renderWorkScreen(params) {
    clearInterval(workTimerInterval);
    // Keep the scroll position when only the timer state changes.
    const target = workLinkFromParams(params);
    const sameStop = workContent.dataset.workTarget === target;
    const previousProgressScroll = workContent.querySelector('.work-progress')?.scrollTop ?? 0;
    const previousListScroll = workContent.querySelector('.work-stop-list')?.scrollTop ?? 0;
    const previousContextScroll = workContent.querySelector('.work-context')?.scrollTop ?? 0;
    workContent.dataset.workTarget = target;
    workContent.replaceChildren();
    const context = workContext(appData, params);
    const screen = byId('arbeid');
    screen.querySelector('h1').textContent = context?.run?.name ?? 'Registrer arbeid';
    screen.querySelector('.back-link').href = context?.job
        ? `#plan?date=${context.job.scheduled.slice(0, 10)}`
        : '#runder';
    screen.querySelector('.back-link').setAttribute('aria-label', context?.job ? 'Tilbake til kalenderen' : 'Tilbake til rundene');

    const runStarted = context?.run && (
        appData.activeWork?.target.startsWith(`#arbeid?run=${context.run.id}&`)
        || context.run.stops.some(stop => stop.status !== 'pending')
    );
    const workspace = Boolean(context && (runStarted
        || activeWorkMatches(appData.activeWork, params)
        || context.record.status === 'completed'));
    appShell.classList.toggle('work-layout', workspace);

    if (!context) {
        workContent.append(element('p', 'Fant ikke jobben eller stoppet.', 'empty'));
        return;
    }

    const { run, job, index, record, location } = context;
    const template = byId('work-dashboard-template');
    const layout = workspace
        ? template.content.firstElementChild.cloneNode(true)
        : element('div');
    if (workspace) {
        layout.classList.toggle('is-single-job', !run);
        layout.querySelector('.work-progress').hidden = !run;
        if (run) {
            layout.querySelector('.work-progress').append(createWorkProgress(context, params));
        }
    } else if (run) {
        workContent.append(element('p', `Stopp ${index + 1} av ${run.stops.length}`, 'round-position'));
    }

    const article = workspace ? layout.querySelector('.work-detail') : element('article', undefined, 'card work-card stack');
    const heading = workspace ? article.querySelector('.work-stop-heading') : element('div', undefined, 'work-stop-heading');
    const information = workspace ? article.querySelector('.work-information') : article;
    const controls = workspace ? article.querySelector('.work-controls') : article;
    if (workspace) {
        // Remove the template's placeholder comments and whitespace before filling slots.
        heading.replaceChildren();
        information.replaceChildren();
        controls.replaceChildren();
    }

    const stopLabel = job
        ? (workspace ? `Planlagt ${displayTime(job.scheduled)}` : 'Planlagt jobb')
        : `Stopp ${index + 1} av ${run.stops.length}`;
    heading.append(element('p', stopLabel, 'eyebrow'));
    heading.append(element('h2', location.customerName), element('p', location.address, 'address'));
    if (!workspace) {
        article.append(heading);
    }

    const currentAddress = addressesFrom(appData, true).find(address => address.id === location.addressId);
    const instructions = record.status === 'pending'
        ? currentAddress?.instructions ?? location.instructions
        : location.instructions;
    if (instructions) {
        information.append(element('p', instructions, 'instructions'));
    }
    if (job?.note) {
        information.append(element('p', job.note));
    }

    if (record.status === 'pending') {
        if (activeWorkMatches(appData.activeWork, params)) {
            const positionArea = layout.querySelector('.work-position');
            positionArea.hidden = false;
            positionArea.dataset.sessionId = appData.activeWork.id;
            positionArea.querySelector('button').addEventListener('click', () => retryStartPosition(positionArea.dataset.sessionId));
            controls.append(createActiveWorkPanel(params, appData.activeWork));
        } else if (appData.activeWork) {
            const message = element('div', undefined, 'stack');
            message.append(
                element('p', 'Arbeidet på det andre stoppet fortsetter.'),
                appLink('Til pågående arbeid', appData.activeWork.target, true)
            );
            controls.append(message);
        } else {
            controls.append(createWorkForm(params, location.services, job?.service));
        }
    } else {
        const visit = appData.visits.find(entry => entry.id === record.visitId);
        controls.append(visit ? workSummary(visit) : element('p', 'Hoppet over', 'status'));
    }

    const actions = workspace ? article.querySelector('.work-stop-navigation') : element('div', undefined, 'actions work-stop-navigation');
    actions.replaceChildren();
    if (!activeWorkMatches(appData.activeWork, params)) {
        if (run && index > 0) {
            actions.append(appLink('Forrige stopp', workLink('run', run.id, run.stops[index - 1].id)));
        }
        if (run && index + 1 < run.stops.length) {
            actions.append(appLink('Neste stopp', workLink('run', run.id, run.stops[index + 1].id), record.status === 'completed'));
        } else if (record.status === 'completed') {
            actions.append(appLink(job ? 'Til kalenderen' : 'Til rundene', job ? `#plan?date=${job.scheduled.slice(0, 10)}` : '#runder', true));
        }
        actions.append(appLink('Kundens historikk', `#logg?customer=${location.customerId}`));
    }
    if (!workspace) {
        article.append(actions);
        layout.append(article);
    }
    workContent.append(layout);
    updateStartPositionDisplay();
    updateWorkContextAccessibility();
    const workContextArea = layout.querySelector('.work-context');
    if (workContextArea && workContextArea.scrollHeight > workContextArea.clientHeight) {
        if (sameStop) {
            workContextArea.scrollTop = previousContextScroll;
        }
    }
    if (workspace && run) {
        // Reveal the selected stop inside its own scroller, keeping the timer in place.
        const navigation = layout.querySelector('.work-stop-list');
        const progress = layout.querySelector('.work-progress');
        if (sameStop) {
            progress.scrollTop = previousProgressScroll;
            navigation.scrollTop = previousListScroll;
        }
        const scroller = navigation.scrollHeight > navigation.clientHeight ? navigation : progress;
        const selected = navigation.querySelector('[aria-current="step"]').getBoundingClientRect();
        const bounds = scroller.getBoundingClientRect();
        if (selected.bottom > bounds.bottom) {
            scroller.scrollTop += selected.bottom - bounds.bottom;
        } else if (selected.top < bounds.top) {
            scroller.scrollTop -= bounds.top - selected.top;
        }
    }

    // Every timer display reads the same saved session, including while viewing another stop.
    if (appData.activeWork && workspace) {
        workTimerInterval = setInterval(() => {
            const active = appData.activeWork;
            if (!active) {
                return;
            }
            for (const timer of workContent.querySelectorAll('[data-work-clock]')) {
                if (timer.dataset.workClock === active.id) {
                    timer.textContent = timerText(workMilliseconds(active));
                }
            }
        }, 1000);
    }
}

// Keyboard users can scroll long instructions without moving the controls.
function updateWorkContextAccessibility() {
    const context = workContent.querySelector('.work-context');
    if (!context) {
        return;
    }
    if (context.scrollHeight > context.clientHeight) {
        context.tabIndex = 0;
        context.setAttribute('role', 'region');
        context.setAttribute('aria-label', 'Kunde og arbeidsinstruksjoner');
    } else {
        context.removeAttribute('tabindex');
        context.removeAttribute('role');
        context.removeAttribute('aria-label');
    }
}

function createWorkProgress(context, params) {
    const content = document.createDocumentFragment();
    content.append(element('h2', context.run ? 'Stopp' : 'Arbeidsoversikt'));

    if (context.run) {
        const stops = context.run.stops;
        const completed = stops.filter(stop => stop.status === 'completed').length;
        const skipped = stops.filter(stop => stop.status === 'skipped').length;
        const skippedText = skipped ? ` · ${skipped} hoppet over` : '';
        content.append(element('p', `${completed} av ${stops.length} utført${skippedText}`, 'work-round-progress'));

        const navigation = element('nav', undefined, 'work-stop-list');
        navigation.setAttribute('aria-label', 'Velg stopp');
        const list = element('ol');
        stops.forEach((stop, index) => {
            const item = element('li');
            item.dataset.status = stop.status;
            const link = element('a', undefined, 'work-stop-link');
            link.href = workLink('run', context.run.id, stop.id);
            let status = { pending: 'Gjenstår', completed: 'Utført', skipped: 'Hoppet over' }[stop.status];
            const isActive = appData.activeWork?.target === link.hash;
            link.dataset.workState = isActive ? 'active' : stop.status;
            if (isActive) {
                status = appData.activeWork.runningSince === null ? 'På pause' : 'Pågår';
            }
            if (stop.id === context.record.id) {
                link.setAttribute('aria-current', 'step');
            }
            const marker = stop.status === 'completed' ? '✓' : stop.status === 'skipped' ? '–' : String(index + 1);
            const number = element('span', marker, 'work-stop-number');
            number.setAttribute('aria-hidden', 'true');
            const description = element('span', undefined, 'work-stop-copy');
            description.append(element('strong', stop.customerName), element('span', stop.address));
            if (isActive || stop.status !== 'pending') {
                description.append(element('span', status, 'work-stop-status'));
            }
            link.setAttribute('aria-label', `Stopp ${index + 1}, ${stop.customerName}, ${stop.address}, ${status}`);
            link.append(number, description);
            item.append(link);
            list.append(item);
        });
        navigation.append(list);
        content.append(navigation);
    } else {
        content.append(element('p', context.location.customerName), element('p', context.location.address));
        content.append(element('p', `Planlagt ${displayTime(context.job.scheduled)}`, 'work-round-progress'));
    }

    const active = appData.activeWork;
    if (active && !activeWorkMatches(active, params)) {
        const resume = element('div', undefined, 'work-progress-resume stack');
        const timer = element('output', timerText(workMilliseconds(active)), 'work-mini-timer');
        timer.dataset.workClock = active.id;
        timer.setAttribute('aria-live', 'off');
        timer.setAttribute('aria-label', 'Arbeidstid på det pågående stoppet');
        resume.append(
            element('p', active.runningSince === null ? 'Arbeid på pause' : 'Arbeid pågår'),
            timer,
            appLink('Til pågående arbeid', active.target, true)
        );
        content.append(resume);
    }
    return content;
}

function activeWorkMatches(active, params) {
    return Boolean(active && active.target === workLinkFromParams(params));
}

function workLinkFromParams(params) {
    return params.has('run')
        ? workLink('run', params.get('run'), params.get('stop'))
        : workLink('job', params.get('job'));
}

function workMilliseconds(active, now = Date.now()) {
    return active.elapsedMs + (active.runningSince === null ? 0 : Math.max(0, now - active.runningSince));
}

function timerText(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds / 60) % 60;
    return [hours, minutes, seconds % 60].map(part => String(part).padStart(2, '0')).join(':');
}

function createWorkForm(params, choices, selected) {
    const form = element('form', undefined, 'stack');
    form.innerHTML = `
        <label>
            Tjeneste
            <select name="service" required></select>
        </label>
        <button type="submit" class="primary">Start arbeid</button>
    `;

    const select = form.elements.namedItem('service');
    fillServices(select, choices, selected);

    if (typeof serviceSheet.showModal === 'function') {
        const picker = appButton(select.value, () => {
            const options = choices.map(service => {
                const choice = appButton(service, () => {
                    select.value = service;
                    picker.textContent = service;
                    picker.setAttribute('aria-label', `Tjeneste, ${service}`);
                    serviceSheet.close();
                });
                choice.setAttribute('aria-pressed', String(select.value === service));
                return choice;
            });
            byId('service-choices').replaceChildren(...options);
            serviceSheet.showModal();
            options.find(option => option.getAttribute('aria-pressed') === 'true')?.focus();
        });
        picker.className = 'service-trigger';
        picker.setAttribute('aria-haspopup', 'dialog');
        picker.setAttribute('aria-label', `Tjeneste, ${select.value}`);
        select.hidden = true;
        select.parentElement.after(picker);
    }

    form.append(appButton('Hopp over', () => skipWork(params)));
    form.addEventListener('submit', event => {
        event.preventDefault();
        const service = select.value;
        saveChange(data => {
            const context = workContext(data, params);
            if (data.activeWork) {
                throw new Error('Et arbeid er allerede startet. Avslutt det før du starter et nytt.');
            }
            if (!context || context.record.status !== 'pending' || !context.location.services.includes(service)) {
                throw new Error('Stoppet er endret. Åpne det på nytt.');
            }
            const now = Date.now();
            data.activeWork = {
                id: newId(),
                target: workLinkFromParams(params),
                service,
                startedAt: new Date(now).toISOString(),
                workedAt: localDateTime(new Date(now)),
                elapsedMs: 0,
                runningSince: now,
                pauseCount: 0,
                revision: 0,
                note: '',
                startPosition: newStartPosition(new Date(now).toISOString())
            };
        }, () => {
            renderWorkScreen(params);
            window.scrollTo(0, 0);
            byId('work-pause').focus({ preventScroll: true });
            appMessage('');
            requestStartPosition(appData.activeWork);
        });
    });
    return form;
}

function createActiveWorkPanel(params, active) {
    const panel = byId('work-session-template').content.firstElementChild.cloneNode(true);
    const paused = active.runningSince === null;
    panel.classList.toggle('is-paused', paused);
    panel.querySelector('.work-session-state').textContent = paused ? 'På pause' : 'Arbeid pågår';
    panel.querySelector('.work-service-label').textContent = active.service;

    const timer = panel.querySelector('.work-timer');
    timer.dataset.workClock = active.id;
    timer.textContent = timerText(workMilliseconds(active));

    // The button's accessible name changes with the action it will perform.
    const pause = panel.querySelector('.work-toggle');
    pause.setAttribute('aria-label', paused ? 'Fortsett arbeid' : 'Sett arbeidet på pause');
    panel.querySelector('.work-toggle-caption').textContent = paused ? 'Fortsett' : 'Pause';
    pause.addEventListener('click', () => changeWorkState(params, active, false));
    panel.querySelector('.work-finish').addEventListener('click', () => changeWorkState(params, active, true));

    const detailContent = panel.querySelector('.optional-fields');
    detailContent.append(
        element('p', `Startet ${displayTime(active.workedAt)}`),
        element('p', `Antall pauser: ${active.pauseCount}`)
    );

    const label = element('label', 'Notat');
    const note = element('textarea');
    note.id = 'active-work-note';
    note.rows = 3;
    note.maxLength = 2000;
    note.value = active.note;
    label.append(note);
    note.addEventListener('input', async () => {
        const text = note.value;
        try {
            const data = await workTransaction(data => {
                if (data.activeWork?.id === active.id) {
                    data.activeWork.note = text;
                }
            });
            if (appData.activeWork && appData.activeWork.id === data.activeWork?.id) {
                appData.activeWork.note = data.activeWork.note;
            }
        } catch {
            appMessage('Kunne ikke lagre notatet. Prøv igjen.', true);
        }
    });
    const context = workContext(appData, params);
    detailContent.append(label, appLink('Kundens historikk', `#logg?customer=${context.location.customerId}`));
    return panel;
}

function changeWorkState(params, expected, finish) {
    if (saving || (finish && !confirm('Vil du avslutte og lagre arbeidet på dette stoppet?'))) {
        return;
    }
    const note = byId('active-work-note')?.value ?? expected.note;
    const detailsOpen = workContent.querySelector('.optional-work')?.open ?? false;
    saveChange(data => {
        const active = data.activeWork;
        const context = workContext(data, params);
        if (!activeWorkMatches(active, params) || active.id !== expected.id
            || active.revision !== expected.revision || context?.record.status !== 'pending') {
            throw new Error('Arbeidet er endret. Åpne stoppet på nytt før du fortsetter.');
        }

        const now = Date.now();
        active.note = note;
        active.elapsedMs = workMilliseconds(active, now);

        if (finish) {
            const visit = {
                id: newId(),
                customerId: context.location.customerId,
                customerName: context.location.customerName,
                addressId: context.location.addressId,
                address: context.location.address,
                service: active.service,
                workedAt: active.workedAt,
                createdAt: new Date(now).toISOString(),
                startedAt: active.startedAt,
                finishedAt: new Date(now).toISOString(),
                activeMs: active.elapsedMs,
                pauseCount: active.pauseCount,
                duration: Math.round(active.elapsedMs / 60000),
                note: active.note.trim()
            };
            if (active.startPosition) {
                // A reading that arrives after finishing is not a start position for the next job.
                visit.startPosition = active.startPosition.status === 'pending'
                    ? { ...active.startPosition, status: 'failed', error: 'interrupted' }
                    : active.startPosition;
            }
            data.visits.push(visit);
            context.record.visitId = visit.id;
            context.record.status = 'completed';
            delete data.activeWork;
        } else {
            const wasRunning = active.runningSince !== null;
            active.runningSince = wasRunning ? null : now;
            if (wasRunning) {
                active.pauseCount += 1;
            }
            active.revision += 1;
        }
    }, () => {
        appMessage('');
        renderWorkScreen(params);
        if (finish) {
            cancelStartPositionRequest();
            workContent.querySelector('h3')?.focus({ preventScroll: true });
        } else {
            workContent.querySelector('.optional-work').open = detailsOpen;
            byId('work-pause').focus({ preventScroll: true });
        }
    });
}

function workSummary(visit) {
    const panel = element('section', undefined, 'work-summary stack');
    const heading = element('h3', 'Arbeidet er lagret');
    heading.tabIndex = -1;
    panel.append(heading, element('p', `${visit.service} · ${displayTime(visit.workedAt)}`));
    if (visit.finishedAt) {
        panel.append(element('p', `Avsluttet ${displayTime(localDateTime(new Date(visit.finishedAt)))}`));
    }
    if (visit.activeMs !== undefined) {
        panel.append(element('p', `Arbeidstid uten pauser: ${timerText(visit.activeMs)}`));
        panel.append(element('p', `Antall pauser: ${visit.pauseCount}`));
    } else if (visit.duration !== null) {
        panel.append(element('p', `${visit.duration} min`));
    }
    if (visit.note) {
        panel.append(element('p', visit.note, 'instructions'));
    }
    if (visit.startPosition) {
        panel.append(visit.startPosition.status === 'saved'
            ? createPositionDetails(visit.startPosition, visit.startedAt)
            : element('p', 'Startposisjon ble ikke lagret.', 'work-position-missing'));
    }
    return panel;
}

function skipWork(params) {
    let destination;
    saveChange(data => {
        const context = workContext(data, params);
        if (!context || context.record.status !== 'pending' || activeWorkMatches(data.activeWork, params)) {
            throw new Error('Dette stoppet er allerede startet eller behandlet.');
        }
        context.record.status = 'skipped';
        if (context.run) {
            const { run, index } = context;
            const next = [...run.stops.slice(index + 1), ...run.stops.slice(0, index)]
                .find(stop => stop.status === 'pending');
            destination = next ? workLink('run', run.id, next.id) : '#runder';
        } else {
            destination = `#plan?date=${context.job.scheduled.slice(0, 10)}`;
        }
    }, () => {
        goTo(destination);
        appMessage('Stoppet er hoppet over.');
    });
}

function openLog(customerId) {
    const filter = byId('log-customer');
    filter.replaceChildren(new Option('Alle kunder', ''));
    for (const customer of appData.customers) {
        filter.add(new Option(customer.name, customer.id));
    }
    filter.value = customerId || '';
    if (filter.selectedIndex < 0) {
        filter.value = '';
    }
    byId('log-date').value = '';
    fillServices(byId('log-service'), serviceNames(), '', 'Alle tjenester');
    renderLog();
}

function renderLog() {
    const customer = byId('log-customer').value;
    const date = byId('log-date').value;
    const service = byId('log-service').value;
    const visits = appData.visits.filter(visit =>
        (!customer || visit.customerId === customer)
        && (!date || visit.workedAt.startsWith(date))
        && (!service || visit.service === service)
    ).sort((left, right) => right.workedAt.localeCompare(left.workedAt));
    showList('log-list', visits.map(visit => {
        const entry = card(visit.customerName, `${visit.address} · ${visit.service} · ${displayTime(visit.workedAt)}`);
        if (visit.duration !== null) {
            entry.append(element('p', `${visit.duration} min`));
        }
        if (visit.note) {
            entry.append(element('p', visit.note, 'instructions'));
        }
        if (visit.startPosition?.status === 'saved') {
            const details = element('details', undefined, 'optional-work');
            details.append(element('summary', 'Posisjon'), createPositionDetails(visit.startPosition, visit.startedAt));
            entry.append(details);
        }
        return entry;
    }), 'Ingen arbeidsregistreringer å vise.');
}

// Run before the navigation handler, so cancelling keeps the current screen open.
document.addEventListener('click', event => {
    const back = event.target.closest('#arbeid > .back-link');
    if (!back || event.defaultPrevented || event.button !== 0
        || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
        return;
    }
    const active = appData?.activeWork;
    let message = 'Vil du forlate arbeidsvisningen? Fremdriften er lagret.';
    if (active) {
        message = active.runningSince === null
            ? 'Vil du forlate arbeidsvisningen? Arbeidet beholdes på pause.'
            : 'Vil du forlate arbeidsvisningen? Arbeidet er lagret underveis, men tidtakeren fortsetter å gå.';
    }
    if (saving || !confirm(message)) {
        event.preventDefault();
    }
}, true);

for (const id of ['log-customer', 'log-date', 'log-service']) {
    byId(id).addEventListener('change', renderLog);
}
document.addEventListener('app:navigate', () => {
    if (selectedRoute().screen !== 'arbeid') {
        appShell.classList.remove('work-layout');
        clearInterval(workTimerInterval);
    }
    if (serviceSheet.open) {
        serviceSheet.close();
    }
});
