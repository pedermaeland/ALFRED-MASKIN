const roundForm = byId('round-form');
const stopList = byId('round-stops');
const roundAddress = byId('round-address');
const stopAnimations = new WeakMap();
let editingRoundId;

function renderRounds() {
    showList('round-list', appData.rounds.map(round => card(round.name, `${round.addressIds.length} stopp`, [
        appButton('Start ny kjøring', () => startRound(round.id), 'primary'),
        appLink('Rediger', `#runde?id=${round.id}`)
    ])), 'Ingen faste runder. Opprett en runde for å komme i gang.');

    showList('run-list', appData.runs.slice().reverse().map(run => {
        const next = run.stops.find(stop => stop.status === 'pending');
        const completed = run.stops.filter(stop => stop.status === 'completed').length;
        const skipped = run.stops.filter(stop => stop.status === 'skipped').length;
        return card(run.name, `${displayTime(run.started)} · ${completed}/${run.stops.length} utført · ${skipped} hoppet over`, [
            appLink(next ? 'Fortsett kjøring' : 'Se kjøring', workLink('run', run.id, (next ?? run.stops[0]).id))
        ]);
    }), 'Ingen kjøringer ennå.');
}

function startRound(id) {
    const runId = newId();
    let firstStop;
    saveChange(data => {
        const round = data.rounds.find(entry => entry.id === id);
        if (!round) {
            throw new Error('Fant ikke runden.');
        }

        const addresses = addressesFrom(data);
        const stops = round.addressIds.map(addressId => {
            const address = addresses.find(entry => entry.id === addressId);
            if (!address) {
                throw new Error('Runden inneholder en utilgjengelig adresse. Rediger runden før du starter.');
            }
            return { ...snapshotAddress(address), id: newId(), status: 'pending' };
        });
        firstStop = stops[0].id;
        data.runs.push({ id: runId, roundId: id, name: round.name, started: localDateTime(), stops });
    }, () => goTo(workLink('run', runId, firstStop)));
}

function openRoundEditor(id) {
    editingRoundId = id;
    const round = appData.rounds.find(entry => entry.id === id);
    roundForm.hidden = Boolean(id && !round);
    if (roundForm.hidden) {
        appMessage('Fant ikke runden.', true);
        return;
    }

    byId('runde').querySelector('h1').textContent = round ? 'Rediger runde' : 'Ny runde';
    roundForm.elements.namedItem('name').value = round?.name ?? '';
    stopList.replaceChildren();
    const addresses = addressesFrom(appData, true);
    for (const addressId of round?.addressIds ?? []) {
        appendRoundStop(addresses.find(address => address.id === addressId));
    }
    refreshRoundAddressOptions();
}

function appendRoundStop(address) {
    const row = element('li', undefined, 'card round-stop');
    row.dataset.addressId = address.id;
    const heading = element('div', undefined, 'heading');
    heading.append(element('strong', address.customer.name), element('p', address.label));
    const actions = element('div', undefined, 'actions');

    actions.append(byId('round-stop-controls').content.cloneNode(true));
    row.append(heading, actions);
    stopList.append(row);
}

function refreshRoundAddressOptions() {
    const included = Array.from(stopList.children, row => row.dataset.addressId);
    addressOptions(roundAddress, addressesFrom(appData).filter(address => !included.includes(address.id)));
    const addAddress = byId('add-round-address');
    addAddress.disabled = roundAddress.options.length < 2;
    addAddress.classList.toggle('has-addresses', included.length > 0);
}

byId('add-round-address').addEventListener('click', () => {
    const address = addressesFrom(appData).find(entry => entry.id === roundAddress.value);
    if (!address) {
        appMessage('Velg en arbeidsadresse først.', true);
        return;
    }
    appendRoundStop(address);
    refreshRoundAddressOptions();
    appMessage('');
});

// Measure current positions, move the DOM row, then animate the difference.
stopList.addEventListener('click', event => {
    const button = event.target.closest('button[data-stop-action]');
    if (!button) {
        return;
    }
    const row = button.closest('li');
    const action = button.dataset.stopAction;
    const neighbor = action === 'up' ? row.previousElementSibling : row.nextElementSibling;
    if (action !== 'remove' && !neighbor) {
        return;
    }

    const previous = new Map(Array.from(stopList.children, stop => [stop, stop.getBoundingClientRect()]));
    for (const stop of stopList.children) {
        stopAnimations.get(stop)?.cancel();
    }

    if (action === 'up') {
        neighbor.before(row);
    } else if (action === 'down') {
        neighbor.after(row);
    } else {
        row.remove();
        refreshRoundAddressOptions();
    }
    if (row.isConnected) {
        button.focus({ preventScroll: true });
    }

    if (reducedMotion.matches || !Element.prototype.animate) {
        return;
    }
    for (const stop of stopList.children) {
        const oldBox = previous.get(stop);
        const newBox = stop.getBoundingClientRect();
        const offset = oldBox.top + oldBox.height / 2 - newBox.top - newBox.height / 2;
        const scale = oldBox.width / newBox.width;
        if (offset === 0 && scale === 1) {
            continue;
        }
        const frames = [
            { transform: `translateY(${offset}px) scale(${scale})` },
            { transform: 'none' }
        ];
        if (stop === row) {
            frames[0].zIndex = 1;
            frames[1].zIndex = 1;
            frames.splice(1, 0, { transform: `translateY(${offset / 2}px) scale(1.035)`, zIndex: 1 });
        }
        stopAnimations.set(stop, stop.animate(frames, {
            duration: 300,
            easing: 'cubic-bezier(0.22, 0.75, 0.25, 1)'
        }));
    }
});

roundForm.addEventListener('submit', event => {
    event.preventDefault();
    const id = editingRoundId || newId();
    const name = roundForm.elements.namedItem('name').value.trim();
    const addressIds = Array.from(stopList.children, row => row.dataset.addressId);
    if (!name || !addressIds.length) {
        appMessage('Gi runden et navn og legg til minst én adresse.', true);
        return;
    }
    const editing = Boolean(editingRoundId);
    saveChange(data => {
        const index = data.rounds.findIndex(round => round.id === id);
        if (editing && index < 0) {
            throw new Error('Fant ikke runden. Åpne rundelisten på nytt.');
        }
        if (addressIds.some(addressId => !addressesFrom(data, true).some(address => address.id === addressId))) {
            throw new Error('En adresse er fjernet. Åpne runden på nytt.');
        }
        const round = { id, name, addressIds };
        if (editing) {
            data.rounds[index] = round;
        } else {
            data.rounds.push(round);
        }
    }, () => {
        goTo('#runder');
        appMessage('Runden er lagret.');
    });
});
