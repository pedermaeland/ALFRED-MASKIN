const workContent = byId('work-content');
const serviceSheet = byId('service-sheet');
const jobForm = byId('job-form');
let editingJobId;

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

function renderPlan() {
    const date = byId('plan-date');
    date.value ||= localDateTime().slice(0, 10);
    const jobs = appData.jobs.filter(job => job.scheduled.startsWith(date.value))
        .sort((left, right) => left.scheduled.localeCompare(right.scheduled));

    showList('plan-list', jobs.map(job => {
        const status = { pending: 'Planlagt', completed: 'Utført', skipped: 'Hoppet over' }[job.status];
        const actions = [appLink(job.status === 'pending' ? 'Åpne jobb' : 'Se jobb', workLink('job', job.id))];
        if (job.status === 'pending') {
            actions.push(appLink('Rediger', `#jobb?id=${job.id}`), appButton('Fjern fra planen', () => {
                if (confirm('Vil du fjerne denne planlagte jobben?')) {
                    saveChange(data => {
                        const index = data.jobs.findIndex(entry => entry.id === job.id && entry.status === 'pending');
                        if (index < 0) {
                            throw new Error('Jobben er allerede endret.');
                        }
                        data.jobs.splice(index, 1);
                    }, renderPlan);
                }
            }));
        }
        return card(job.location.customerName,
            `${displayClock(job.scheduled)} · ${job.location.address} · ${job.service} · ${status}`, actions);
    }), 'Ingen jobber planlagt på denne datoen.');
}
byId('plan-date').addEventListener('change', renderPlan);

function openJobEditor(id) {
    editingJobId = id;
    const job = appData.jobs.find(entry => entry.id === id && entry.status === 'pending');
    jobForm.hidden = Boolean(id && !job);
    if (jobForm.hidden) {
        appMessage('Fant ikke en planlagt jobb som kan redigeres.', true);
        return;
    }

    const addresses = addressesFrom(appData);
    addressOptions(jobForm.elements.namedItem('address'), addresses, job?.location.addressId);
    jobForm.elements.namedItem('scheduled').value = job?.scheduled
        ?? `${byId('plan-date').value || localDateTime().slice(0, 10)}T${localDateTime().slice(11, 16)}`;
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
    workContent.replaceChildren();
    const context = workContext(appData, params);
    const screen = byId('arbeid');
    screen.querySelector('h1').textContent = context?.run?.name ?? 'Registrer arbeid';
    screen.querySelector('.back-link').href = context?.job ? `#plan?date=${context.job.scheduled.slice(0, 10)}` : '#runder';
    if (!context) {
        workContent.append(element('p', 'Fant ikke jobben eller stoppet.', 'empty'));
        return;
    }

    const { run, job, index, record, location } = context;
    if (run) {
        const done = run.stops.filter(stop => stop.status !== 'pending').length;
        workContent.append(element('p', `Stopp ${index + 1} av ${run.stops.length} · ${done} behandlet`, 'round-position'));
    }

    const article = element('article', undefined, 'card work-card stack');
    article.append(element('h2', location.customerName), element('p', location.address, 'address'));
    const currentAddress = addressesFrom(appData, true).find(address => address.id === location.addressId);
    const instructions = record.status === 'pending'
        ? currentAddress?.instructions ?? location.instructions
        : location.instructions;
    if (instructions) {
        article.append(element('p', instructions, 'instructions'));
    }
    if (job?.note) {
        article.append(element('p', job.note));
    }

    if (record.status === 'pending') {
        article.append(createWorkForm(params, location.services, job?.service));
    } else {
        const visit = appData.visits.find(entry => entry.id === record.visitId);
        article.append(element('p', visit
            ? `Utført · ${visit.service} · ${displayTime(visit.workedAt)}`
            : 'Hoppet over'));
    }

    const actions = element('div', undefined, 'actions');
    if (run && index > 0) {
        actions.append(appLink('Forrige', workLink('run', run.id, run.stops[index - 1].id)));
    }
    if (run && index + 1 < run.stops.length) {
        actions.append(appLink('Neste', workLink('run', run.id, run.stops[index + 1].id)));
    }
    actions.append(appLink('Kundens historikk', `#logg?customer=${location.customerId}`));
    article.append(actions);
    workContent.append(article);

    if (run) {
        const overview = element('details', undefined, 'card optional-work');
        overview.append(element('summary', 'Alle stopp'));
        const list = element('ol');
        for (const stop of run.stops) {
            const status = { pending: 'Gjenstår', completed: 'Utført', skipped: 'Hoppet over' }[stop.status];
            const item = element('li');
            const link = appLink(`${stop.address} · ${status}`, workLink('run', run.id, stop.id));
            if (stop.id === record.id) {
                link.setAttribute('aria-current', 'step');
            }
            item.append(link);
            list.append(item);
        }
        overview.append(list);
        workContent.append(overview);
    }
}

function createWorkForm(params, choices, selected) {
    const form = element('form', undefined, 'stack');
    // Static markup. Customer data is added with textContent or field values.
    form.innerHTML = `
        <label>
            Tjeneste
            <select name="service" required></select>
        </label>
        <label>
            Utført dato og klokkeslett
            <input name="workedAt" type="datetime-local" required>
        </label>
        <details class="optional-work">
            <summary>Notat og varighet</summary>
            <div class="stack optional-fields">
                <label>
                    Minutter
                    <input name="duration" type="number" min="0" max="999999" step="1">
                </label>
                <label>
                    Notat
                    <textarea name="note" rows="3" maxlength="2000"></textarea>
                </label>
            </div>
        </details>
        <button type="submit" class="primary">Lagre og neste</button>
    `;

    const select = form.elements.namedItem('service');
    fillServices(select, choices, selected);
    form.elements.namedItem('workedAt').value = localDateTime();
    if (!params.has('run')) {
        form.querySelector('[type="submit"]').textContent = 'Lagre jobb';
    }

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
        const field = select.parentElement;
        field.className = 'service-field';
        field.after(picker);
    }

    form.append(appButton('Hopp over', () => finishWork(params)));
    form.addEventListener('submit', event => {
        event.preventDefault();
        finishWork(params, new FormData(form));
    });
    return form;
}

function finishWork(params, fields) {
    let destination;
    saveChange(data => {
        const context = workContext(data, params);
        if (!context || context.record.status !== 'pending') {
            throw new Error('Dette stoppet er allerede behandlet eller fjernet.');
        }

        const { record, location, run, index, job } = context;
        if (fields) {
            const service = fields.get('service');
            if (!location.services.includes(service)) {
                throw new Error('Velg en gyldig tjeneste.');
            }
            const visit = {
                id: newId(),
                customerId: location.customerId,
                customerName: location.customerName,
                addressId: location.addressId,
                address: location.address,
                service,
                workedAt: fields.get('workedAt').slice(0, 16),
                createdAt: new Date().toISOString(),
                duration: fields.get('duration') === '' ? null : Number(fields.get('duration')),
                note: fields.get('note').trim()
            };
            data.visits.push(visit);
            record.visitId = visit.id;
        }

        // Saving the visit and changing stop status happen in one transaction.
        record.status = fields ? 'completed' : 'skipped';
        if (run) {
            const next = [...run.stops.slice(index + 1), ...run.stops.slice(0, index)]
                .find(stop => stop.status === 'pending');
            destination = next ? workLink('run', run.id, next.id) : '#runder';
        } else {
            byId('plan-date').value = job.scheduled.slice(0, 10);
            destination = `#plan?date=${job.scheduled.slice(0, 10)}`;
        }
    }, () => {
        goTo(destination);
        appMessage(fields ? 'Arbeidet er lagret.' : 'Stoppet er hoppet over.');
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
    fillServices(byId('log-service'), services, '', 'Alle tjenester');
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
        return entry;
    }), 'Ingen arbeidsregistreringer å vise.');
}

for (const id of ['log-customer', 'log-date', 'log-service']) {
    byId(id).addEventListener('change', renderLog);
}
document.addEventListener('app:navigate', () => {
    if (serviceSheet.open) {
        serviceSheet.close();
    }
});
