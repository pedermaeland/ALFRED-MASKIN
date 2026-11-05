/* START POSITION
   One reading per work session, not route tracking.
   The timer and work records remain usable if location access fails. */
let startPositionRequest = null;
let startPositionProblem = null;
let retryingStartPosition = false;

function newStartPosition(requestedAt) {
    return {
        status: 'pending',
        requestId: newId(),
        requestedAt
    };
}

// getCurrentPosition cannot be cancelled. This token makes late callbacks harmless.
function cancelStartPositionRequest() {
    clearTimeout(startPositionRequest?.timeout);
    startPositionRequest = null;
    startPositionProblem = null;
}

function requestStartPosition(active) {
    cancelStartPositionRequest();
    const attempt = active.startPosition;
    const request = { sessionId: active.id, requestId: attempt.requestId };
    startPositionRequest = request;

    async function finish(result) {
        if (startPositionRequest !== request) {
            return;
        }
        clearTimeout(request.timeout);
        startPositionRequest = null;

        try {
            // Read fresh data. A pause, note edit or completed job must never be overwritten.
            const data = await workTransaction(data => {
                const current = data.activeWork;
                if (current?.id === request.sessionId
                    && current.startPosition?.requestId === request.requestId
                    && current.startPosition.status === 'pending') {
                    current.startPosition = { ...attempt, ...result };
                }
            });
            if (appData.activeWork?.id === request.sessionId
                && appData.activeWork.startPosition?.requestId === request.requestId
                && data.activeWork?.id === request.sessionId) {
                appData.activeWork.startPosition = data.activeWork.startPosition;
            }
        } catch {
            startPositionProblem = {
                sessionId: request.sessionId,
                requestId: request.requestId,
                message: 'Kunne ikke lagre posisjonen. Prøv igjen.'
            };
        }
        // Update only location text, keeping the note, focus and timer in place.
        updateStartPositionDisplay();
    }

    const fail = error => finish({ status: 'failed', error });
    if (!window.isSecureContext) {
        fail('insecure');
    } else if (!navigator.geolocation) {
        fail('unsupported');
    } else {
        // Also bound the wait if a permission prompt is left unanswered.
        request.timeout = setTimeout(() => fail('timeout'), 20000);
        try {
            navigator.geolocation.getCurrentPosition(position => {
                const { latitude, longitude, accuracy } = position.coords;
                if (!Number.isFinite(latitude) || Math.abs(latitude) > 90
                    || !Number.isFinite(longitude) || Math.abs(longitude) > 180
                    || !Number.isFinite(accuracy) || accuracy < 0
                    || !Number.isFinite(position.timestamp)
                    || !Number.isFinite(new Date(position.timestamp).getTime())) {
                    fail('unavailable');
                    return;
                }
                finish({
                    status: 'saved',
                    latitude,
                    longitude,
                    accuracy,
                    capturedAt: new Date(position.timestamp).toISOString()
                });
            }, error => {
                fail({ 1: 'denied', 2: 'unavailable', 3: 'timeout' }[error.code] ?? 'unavailable');
            }, {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 15000
            });
        } catch {
            fail('unavailable');
        }
    }
    updateStartPositionDisplay();
}

async function retryStartPosition(sessionId) {
    if (retryingStartPosition || startPositionRequest?.sessionId === sessionId) {
        return;
    }
    retryingStartPosition = true;
    updateStartPositionDisplay();
    try {
        const data = await workTransaction(data => {
            if (data.activeWork?.id !== sessionId || data.activeWork.startPosition?.status === 'saved') {
                throw new Error('Session changed');
            }
            data.activeWork.startPosition = newStartPosition(new Date().toISOString());
        });
        if (appData.activeWork?.id === sessionId) {
            appData.activeWork.startPosition = data.activeWork.startPosition;
            requestStartPosition(data.activeWork);
        }
    } catch {
        startPositionProblem = {
            sessionId,
            requestId: appData.activeWork?.startPosition?.requestId,
            message: 'Kunne ikke starte et nytt posisjonssøk. Åpne stoppet på nytt og prøv igjen.'
        };
    } finally {
        retryingStartPosition = false;
        updateStartPositionDisplay();
    }
}

/* LOCATION TEXT
   Coordinates stay local until the user chooses the Google Maps link. */
function startPositionMessage(position, startedAt) {
    if (position?.status === 'saved') {
        const label = position.requestedAt === startedAt
            ? 'Startposisjon lagret'
            : 'Posisjon lagret etter start';
        return `${label} · ca. ±${Math.ceil(position.accuracy)} m`;
    }
    if (position?.status === 'pending' && startPositionRequest?.requestId === position.requestId) {
        return 'Finner startposisjon …';
    }
    if (position?.status === 'pending') {
        return 'Posisjonssøket ble avbrutt.';
    }
    const messages = {
        denied: 'Posisjon er blokkert. Tillat posisjon i nettleseren for å prøve igjen.',
        unavailable: 'Enheten fant ingen posisjon.',
        timeout: 'Posisjonssøket tok for lang tid.',
        insecure: 'Posisjon krever HTTPS. Åpne appen via den sikre nettadressen.',
        unsupported: 'Nettleseren støtter ikke posisjon.',
        interrupted: 'Posisjonssøket ble avbrutt.'
    };
    return messages[position?.error] ?? 'Startposisjon er ikke lagret.';
}

function createPositionDetails(position, startedAt) {
    const details = element('div', undefined, 'position-details');
    if (position?.status !== 'saved') {
        return details;
    }
    const number = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 6 });
    const title = position.requestedAt === startedAt ? 'Startposisjon' : 'Posisjon hentet etter start';
    const coordinates = `Breddegrad: ${number.format(position.latitude)} · Lengdegrad: ${number.format(position.longitude)}`;
    const map = element('a', `${coordinates} ↗`, 'position-map-link');
    // URLs use the original decimal numbers, not Norwegian decimal commas.
    const query = new URLSearchParams({ api: '1', query: `${position.latitude},${position.longitude}` });
    map.href = `https://www.google.com/maps/search/?${query}`;
    map.target = '_blank';
    map.rel = 'noopener noreferrer';
    map.referrerPolicy = 'no-referrer';
    map.setAttribute('aria-label', `${coordinates}. Åpne i Google Maps i en ny fane.`);
    map.title = 'Åpne i Google Maps (ny fane)';
    details.append(
        element('h4', title),
        map,
        element('p', `Hentet ${displayTime(localDateTime(new Date(position.capturedAt)))} · Nøyaktighet ca. ${Math.ceil(position.accuracy)} m`)
    );
    return details;
}

function updateStartPositionDisplay() {
    const active = appData?.activeWork;
    const area = workContent.querySelector('.work-position');
    if (!active || area?.dataset.sessionId !== active.id) {
        return;
    }
    const position = active.startPosition;
    const busy = retryingStartPosition || startPositionRequest?.sessionId === active.id;
    const problem = startPositionProblem?.sessionId === active.id
        && startPositionProblem.requestId === position?.requestId ? startPositionProblem.message : null;
    area.querySelector('.work-position-status').textContent = problem ?? startPositionMessage(position, active.startedAt);
    const retry = area.querySelector('button');
    retry.hidden = position?.status === 'saved' || Boolean(busy);
    retry.disabled = Boolean(busy);
    area.dataset.state = position?.status === 'saved' ? 'saved' : busy ? 'pending' : 'failed';
    const details = workContent.querySelector('.work-position-details');
    if (details) {
        details.hidden = position?.status !== 'saved';
        details.replaceChildren(createPositionDetails(position, active.startedAt));
    }
    updateWorkContextAccessibility();
}
