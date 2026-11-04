/* A single IndexedDB transaction reads and writes related records together. */
let workDatabase;

function newId() {
    return crypto.getRandomValues(new Uint32Array(4)).join('-');
}

function emptyWorkData() {
    return { version: 1, customers: [], rounds: [], runs: [], jobs: [], visits: [] };
}

function openWorkDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('alfred-maskin', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('app');
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('Lukk andre faner med appen og prøv igjen.'));
        request.onsuccess = () => {
            workDatabase = request.result;
            workDatabase.onversionchange = () => workDatabase.close();
            resolve();
        };
    });
}

function workTransaction(update) {
    return new Promise((resolve, reject) => {
        const transaction = workDatabase.transaction('app', update ? 'readwrite' : 'readonly');
        const store = transaction.objectStore('app');
        const request = store.get('records');
        let data;
        let failure;

        request.onsuccess = () => {
            try {
                data = request.result ?? emptyWorkData();
                if (update) {
                    data = update(data, !request.result) ?? data;
                    store.put(data, 'records');
                }
            } catch (error) {
                failure = error;
                transaction.abort();
            }
        };

        transaction.oncomplete = () => resolve(data);
        transaction.onabort = () => reject(failure ?? transaction.error);
    });
}

function importPreviousCustomers(data, firstOpen) {
    if (!firstOpen) {
        return;
    }

    // Keep customers entered in the previous prototype, but skip blank test rows.
    let previous;
    try {
        previous = JSON.parse(localStorage.getItem('alfred-maskin:test-customers') ?? '[]');
    } catch {
        // A damaged prototype value does not prevent a fresh database from opening.
        return;
    }
    if (!Array.isArray(previous)) {
        return;
    }

    for (const entry of previous) {
        if (typeof entry?.name !== 'string' || !entry.name.trim()
            || typeof entry.address !== 'string' || !entry.address.trim()) {
            continue;
        }

        data.customers.push({
            id: entry.id || newId(),
            name: entry.name,
            phone: entry.phone || '',
            email: entry.email || '',
            notes: entry.notes || '',
            archived: Boolean(entry.archived),
            addresses: [{
                id: newId(),
                label: entry.address,
                instructions: entry.instructions || '',
                services: ['Brøyting', 'Strøing', 'Annet arbeid']
            }]
        });
    }
}
