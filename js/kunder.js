const customerForm = byId('customer-form');
const customerAddresses = byId('customer-addresses');
let editingCustomerId;

function renderCustomers() {
    const search = byId('customer-search').value.trim().toLocaleLowerCase('nb');
    const includeArchived = byId('show-archived-customers').checked;
    const matches = appData.customers.filter(customer =>
        (includeArchived || !customer.archived)
        && [customer.name, ...customer.addresses.map(address => address.label)]
            .some(text => text.toLocaleLowerCase('nb').includes(search))
    );

    showList('customer-cards', matches.map(customer => {
        const archive = appButton(customer.archived ? 'Gjenopprett' : 'Arkiver', () => {
            saveChange(data => {
                const saved = data.customers.find(entry => entry.id === customer.id);
                if (!saved) {
                    throw new Error('Fant ikke kunden.');
                }
                saved.archived = !customer.archived;
            }, () => {
                renderCustomers();
                byId('show-archived-customers').focus({ preventScroll: true });
                appMessage(customer.archived ? 'Kunden er gjenopprettet.' : 'Kunden er arkivert.');
            });
        });

        const title = customer.archived ? `${customer.name} · Arkivert` : customer.name;
        return card(title, customer.addresses.map(address => address.label).join(' · '), [
            appLink('Åpne', `#kunde?id=${customer.id}`),
            appLink('Historikk', `#logg?customer=${customer.id}`),
            archive
        ]);
    }), 'Ingen kunder å vise.');
}

byId('customer-search').addEventListener('input', renderCustomers);
byId('show-archived-customers').addEventListener('change', renderCustomers);

function appendAddressEditor(address) {
    const group = element('fieldset', undefined, 'address-fields');
    group.dataset.addressId = address?.id ?? newId();
    group.append(element('legend', 'Arbeidsadresse'));

    const label = element('label', 'Adresse');
    const input = element('input');
    input.name = 'address-label';
    input.required = true;
    input.maxLength = 200;
    input.value = address?.label ?? '';
    label.append(input);

    const instructionsLabel = element('label', 'Instruksjoner');
    const instructions = element('textarea');
    instructions.name = 'address-instructions';
    instructions.rows = 2;
    instructions.maxLength = 2000;
    instructions.value = address?.instructions ?? '';
    instructionsLabel.append(instructions);

    const serviceOptions = element('div', undefined, 'service-options');
    for (const service of services) {
        const optionLabel = element('label', undefined, 'checkbox');
        const option = element('input');
        option.type = 'checkbox';
        option.name = 'address-service';
        option.value = service;
        option.checked = address ? address.services.includes(service) : service === services[0];
        optionLabel.append(option, service);
        serviceOptions.append(optionLabel);
    }

    group.append(label, instructionsLabel, serviceOptions, appButton('Fjern adresse', () => {
        if (customerAddresses.children.length === 1) {
            appMessage('Kunden må ha minst én arbeidsadresse.', true);
            return;
        }
        group.remove();
        byId('add-address').focus({ preventScroll: true });
    }));
    customerAddresses.append(group);
}

function openCustomerEditor(id) {
    editingCustomerId = id;
    const customer = appData.customers.find(entry => entry.id === id);
    customerForm.hidden = Boolean(id && !customer);
    if (customerForm.hidden) {
        appMessage('Fant ikke kunden.', true);
        return;
    }

    byId('kunde').querySelector('h1').textContent = customer ? 'Rediger kunde' : 'Ny kunde';
    for (const field of ['name', 'phone', 'email', 'notes']) {
        customerForm.elements.namedItem(field).value = customer?.[field] ?? '';
    }
    customerAddresses.replaceChildren();
    for (const address of customer?.addresses ?? [null]) {
        appendAddressEditor(address);
    }
}

byId('add-address').addEventListener('click', () => {
    appendAddressEditor();
    customerAddresses.lastElementChild.querySelector('input').focus();
});

customerForm.addEventListener('submit', event => {
    event.preventDefault();
    const id = editingCustomerId || newId();
    const fields = new FormData(customerForm);
    const customer = {
        id,
        name: fields.get('name').trim(),
        phone: fields.get('phone').trim(),
        email: fields.get('email').trim(),
        notes: fields.get('notes').trim(),
        addresses: Array.from(customerAddresses.children, group => ({
            id: group.dataset.addressId,
            label: group.querySelector('input').value.trim(),
            instructions: group.querySelector('textarea').value.trim(),
            services: Array.from(group.querySelectorAll('input[type="checkbox"]:checked'), option => option.value)
        }))
    };

    if (!customer.name || customer.addresses.some(address => !address.label || !address.services.length)) {
        appMessage('Fyll inn navn, adresse og minst én tjeneste per adresse.', true);
        return;
    }

    const editing = Boolean(editingCustomerId);
    saveChange(data => {
        const index = data.customers.findIndex(entry => entry.id === id);
        const previous = data.customers[index];
        if (editing && !previous) {
            throw new Error('Fant ikke kunden. Åpne kundelisten på nytt.');
        }
        const removed = previous?.addresses.filter(address =>
            !customer.addresses.some(entry => entry.id === address.id)
        ) ?? [];

        if (removed.some(address => data.rounds.some(round => round.addressIds.includes(address.id))
            || data.jobs.some(job => job.status === 'pending' && job.location.addressId === address.id))) {
            throw new Error('Fjern adressen fra runden eller den planlagte jobben før du sletter den her.');
        }

        if (previous) {
            data.customers[index] = { ...customer, archived: previous.archived };
        } else {
            data.customers.push({ ...customer, archived: false });
        }
    }, () => {
        goTo('#kunder');
        appMessage('Kunden er lagret.');
    });
});
