/* Backups are checked before they can replace anything in the database. */
function validateBackup(data) {
    const text = value => typeof value === 'string';
    const validId = value => text(value) && /^[a-z0-9-]+$/i.test(value);
    const validService = value => text(value) && value.length > 0 && value.length <= 80 && value.trim() === value;
    const validServices = value => Array.isArray(value) && value.length > 0 && value.every(validService);
    const validInstant = value => {
        if (!text(value)) {
            return false;
        }
        const date = new Date(value);
        return Number.isFinite(date.getTime()) && date.toISOString() === value;
    };
    const validStartPosition = (position, allowPending) => {
        // Older records have no position. They remain valid when restoring a backup.
        if (position === undefined) {
            return true;
        }
        if (!position || typeof position !== 'object' || Array.isArray(position)
            || !validId(position.requestId) || !validInstant(position.requestedAt)) {
            return false;
        }

        if (position.status === 'saved') {
            return Number.isFinite(position.latitude) && position.latitude >= -90 && position.latitude <= 90
                && Number.isFinite(position.longitude) && position.longitude >= -180 && position.longitude <= 180
                && Number.isFinite(position.accuracy) && position.accuracy >= 0
                && validInstant(position.capturedAt);
        }
        if (position.status === 'failed') {
            return ['denied', 'unavailable', 'timeout', 'insecure', 'unsupported', 'interrupted'].includes(position.error);
        }
        // Completed visits cannot contain an unfinished browser request.
        return allowPending && position.status === 'pending';
    };
    const validDate = value => {
        if (!text(value) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
            return false;
        }
        const date = new Date(value + 'Z');
        return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 16) === value;
    };
    const records = (value, check) => Array.isArray(value)
        && value.every(record => record && validId(record.id) && check(record))
        && new Set(value.map(record => record.id)).size === value.length;

    if (data?.version !== 1
        || (data.services !== undefined && (!Array.isArray(data.services)
            || !data.services.every(validService) || new Set(data.services).size !== data.services.length))
        || !records(data.customers, customer =>
        [customer.name, customer.phone, customer.email, customer.notes].every(text)
        && Boolean(customer.name.trim()) && typeof customer.archived === 'boolean'
        && records(customer.addresses, address => text(address.label) && Boolean(address.label.trim())
            && text(address.instructions) && validServices(address.services))
        && customer.addresses.length > 0)) {
        return false;
    }

    const customers = new Set(data.customers.map(customer => customer.id));
    const addresses = new Set(data.customers.flatMap(customer => customer.addresses.map(address => address.id)));
    if (addresses.size !== data.customers.reduce((count, customer) => count + customer.addresses.length, 0)) {
        return false;
    }

    const validLocation = location => location && customers.has(location.customerId)
        && validId(location.addressId) && text(location.customerName)
        && text(location.address) && text(location.instructions) && validServices(location.services);

    if (!records(data.visits, visit => customers.has(visit.customerId)
        && validId(visit.addressId) && text(visit.customerName) && text(visit.address)
        && (visit.activeMs === undefined || (Number.isSafeInteger(visit.activeMs) && visit.activeMs >= 0
            && Number.isSafeInteger(visit.pauseCount) && visit.pauseCount >= 0
            && text(visit.startedAt) && text(visit.finishedAt)
            && Number.isFinite(Date.parse(visit.startedAt)) && Number.isFinite(Date.parse(visit.finishedAt))))
        && validStartPosition(visit.startPosition, false)
        && validService(visit.service) && validDate(visit.workedAt) && text(visit.createdAt)
        && Number.isFinite(Date.parse(visit.createdAt)) && text(visit.note)
        && (visit.duration === null || (Number.isSafeInteger(visit.duration) && visit.duration >= 0)))) {
        return false;
    }

    const visits = new Map(data.visits.map(visit => [visit.id, visit]));
    const linked = new Set();
    function validStatus(record, location) {
        if (record.status === 'completed') {
            const visit = visits.get(record.visitId);
            if (!visit || linked.has(visit.id) || visit.customerId !== location.customerId
                || visit.addressId !== location.addressId) {
                return false;
            }
            linked.add(visit.id);
            return true;
        }
        return ['pending', 'skipped'].includes(record.status) && record.visitId === undefined;
    }

    const validRecords = records(data.rounds, round => text(round.name) && Boolean(round.name.trim())
        && Array.isArray(round.addressIds) && round.addressIds.length > 0
        && new Set(round.addressIds).size === round.addressIds.length
        && round.addressIds.every(id => addresses.has(id)))
        && records(data.runs, run => validId(run.roundId) && text(run.name) && validDate(run.started)
            && records(run.stops, stop => validLocation(stop) && validStatus(stop, stop)) && run.stops.length > 0)
        && records(data.jobs, job => validLocation(job.location) && validDate(job.scheduled)
            && text(job.note) && job.location.services.includes(job.service) && validStatus(job, job.location))
        && linked.size === visits.size;

    if (!validRecords) {
        return false;
    }

    // Earlier backups have no active timer. Keep those backups compatible.
    const active = data.activeWork;
    if (active === undefined) {
        return true;
    }
    if (!active || !text(active.target) || !active.target.startsWith('#arbeid?')) {
        return false;
    }
    const context = workContext(data, new URLSearchParams(active.target.split('?')[1]));
    return context?.record.status === 'pending' && validId(active.id)
        && context.location.services.includes(active.service)
        && text(active.startedAt) && Number.isFinite(Date.parse(active.startedAt))
        && validStartPosition(active.startPosition, true)
        && validDate(active.workedAt) && Number.isSafeInteger(active.elapsedMs) && active.elapsedMs >= 0
        && (active.runningSince === null || (Number.isSafeInteger(active.runningSince)
            && active.runningSince >= Date.parse(active.startedAt)))
        && Number.isSafeInteger(active.pauseCount) && active.pauseCount >= 0
        && Number.isSafeInteger(active.revision) && active.revision >= 0
        && text(active.note);
}

function downloadFile(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = element('a');
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

byId('export-backup').addEventListener('click', async () => {
    try {
        const data = await workTransaction();
        downloadFile(`alfred-maskin-${localDateTime().slice(0, 10)}.json`,
            JSON.stringify(data, null, 2), 'application/json');
        appMessage('Sikkerhetskopien er klar til nedlasting.');
    } catch {
        appMessage('Kunne ikke eksportere sikkerhetskopien.', true);
    }
});

byId('restore-backup').addEventListener('click', async () => {
    const fileInput = byId('backup-file');
    const file = fileInput.files[0];
    if (!file) {
        appMessage('Velg en sikkerhetskopi først.', true);
        return;
    }

    let data;
    try {
        data = JSON.parse(await file.text());
        if (!validateBackup(data)) {
            throw new Error('Invalid backup');
        }
    } catch {
        appMessage('Filen er ikke en gyldig sikkerhetskopi for ALFRED MASKIN.', true);
        return;
    }

    if (confirm('Dette erstatter alle data i denne nettleseren. Vil du gjenopprette sikkerhetskopien?')) {
        saveChange(() => {
            ensureServiceCatalog(data);
            return data;
        }, () => {
            // A request from before the restore must not modify the restored records.
            cancelStartPositionRequest();
            fileInput.value = '';
            appMessage('Sikkerhetskopien er gjenopprettet.');
        });
    }
});

function csvCell(value) {
    let text = String(value ?? '');
    // Spreadsheet programs may interpret leading formula characters as commands.
    if (/^[\s\uFEFF]*[=+@-]/.test(text)) {
        text = "'" + text;
    }
    return '"' + text.replaceAll('"', '""') + '"';
}

byId('export-csv').addEventListener('click', async () => {
    try {
        const data = await workTransaction();
        const rows = [[
            'Kunde',
            'Adresse',
            'Tjeneste',
            'Utført',
            'Registrert',
            'Minutter',
            'Notat',
            'Breddegrad',
            'Lengdegrad',
            'Posisjon hentet',
            'Nøyaktighet (m)'
        ]];
        for (const visit of data.visits) {
            const position = visit.startPosition?.status === 'saved' ? visit.startPosition : null;
            rows.push([
                visit.customerName,
                visit.address,
                visit.service,
                visit.workedAt,
                visit.createdAt,
                visit.duration,
                visit.note,
                position?.latitude ?? '',
                position?.longitude ?? '',
                position?.capturedAt ?? '',
                position?.accuracy ?? ''
            ]);
        }
        const csv = '\uFEFF' + rows.map(row => row.map(csvCell).join(';')).join('\r\n');
        downloadFile('alfred-maskin-logg.csv', csv, 'text/csv;charset=utf-8');
        appMessage('Arbeidsloggen er klar til nedlasting.');
    } catch {
        appMessage('Kunne ikke eksportere arbeidsloggen.', true);
    }
});

async function prepareOffline() {
    const status = byId('offline-status');
    if (!('serviceWorker' in navigator) || !window.isSecureContext || location.protocol === 'file:') {
        status.textContent = 'Åpne appen via HTTPS eller localhost for å klargjøre frakoblet bruk.';
        return;
    }
    try {
        const registration = await navigator.serviceWorker.register('./sw.js');
        const worker = registration.installing ?? registration.waiting ?? registration.active;
        if (worker && worker.state !== 'activated') {
            await new Promise((resolve, reject) => {
                function checkState() {
                    if (worker.state === 'activated' || worker.state === 'redundant') {
                        worker.removeEventListener('statechange', checkState);
                        worker.state === 'activated' ? resolve() : reject(new Error('Offline setup failed'));
                    }
                }
                worker.addEventListener('statechange', checkState);
                checkState();
            });
        }
        status.textContent = 'Appen er klargjort for frakoblet bruk på denne enheten.';
    } catch {
        status.textContent = 'Kunne ikke klargjøre frakoblet bruk. Åpne appen på nytt med nett.';
    }
}

prepareOffline();
