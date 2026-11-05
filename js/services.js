/* REUSABLE SERVICES
   Names are stored in data.services. Addresses choose from that list using checkboxes.
   Older work records keep their original service names. No names are renamed here. */
function serviceNames(data = appData) {
    const names = new Set(data.services ?? []);
    const add = values => {
        for (const name of values ?? []) {
            if (typeof name === 'string' && name.trim()) {
                names.add(name);
            }
        }
    };
    for (const customer of data.customers) {
        customer.addresses.forEach(address => add(address.services));
    }
    for (const run of data.runs) {
        run.stops.forEach(stop => add(stop.services));
    }
    for (const job of data.jobs) {
        add(job.location.services);
        add([job.service]);
    }
    data.visits.forEach(visit => add([visit.service]));
    add([data.activeWork?.service]);
    return [...names];
}

// Used when opening the app or restoring an older backup with no service catalogue.
function ensureServiceCatalog(data) {
    data.services = serviceNames(data);
}

function renderServiceCheckboxes(container, selected = []) {
    container.replaceChildren();
    for (const name of serviceNames()) {
        const label = element('label', undefined, 'checkbox');
        const checkbox = element('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'address-service';
        checkbox.value = name;
        checkbox.checked = selected.includes(name);
        label.append(checkbox, name);
        container.append(label);
    }
    if (!container.children.length) {
        container.append(element('p', 'Legg til en tjeneste ovenfor først.', 'muted'));
    }
}

/* Save a service separately from the customer form, so it can be reused later.
   Only the checkbox lists are refreshed. Unsaved customer/address text stays put. */
byId('add-service').addEventListener('click', async () => {
    if (saving) {
        return;
    }
    const input = byId('new-service-name');
    const feedback = byId('service-feedback');
    const name = input.value.trim().replace(/\s+/g, ' ');
    feedback.hidden = false;
    if (!name || name.length > 80) {
        feedback.textContent = 'Skriv et tjenestenavn på 1–80 tegn.';
        input.focus();
        return;
    }
    const button = byId('add-service');
    button.disabled = true;
    feedback.textContent = 'Lagrer tjenesten …';
    let alreadyExists = false;
    let stored = false;
    let savedName = name;
    await saveChange(data => {
        ensureServiceCatalog(data);
        const existing = data.services.find(saved => saved.toLocaleLowerCase('nb') === name.toLocaleLowerCase('nb'));
        alreadyExists = Boolean(existing);
        savedName = existing ?? name;
        if (!alreadyExists) {
            data.services.push(name);
        }
    }, () => {
        stored = true;
        for (const options of customerAddresses.querySelectorAll('.service-options')) {
            const selected = [...options.querySelectorAll('input:checked')].map(checkbox => checkbox.value);
            renderServiceCheckboxes(options, selected);
        }
        feedback.textContent = alreadyExists
            ? `«${savedName}» finnes allerede. Kryss av ved aktuelle adresser.`
            : `«${savedName}» er lagret. Kryss av ved aktuelle adresser.`;
        input.value = '';
        input.focus();
    });
    button.disabled = false;
    if (!stored) {
        feedback.textContent = 'Tjenesten ble ikke lagret. Prøv igjen.';
    }
});

byId('new-service-name').addEventListener('keydown', event => {
    // Enter creates a service without submitting the surrounding customer form.
    if (event.key === 'Enter') {
        event.preventDefault();
        byId('add-service').click();
    }
});
