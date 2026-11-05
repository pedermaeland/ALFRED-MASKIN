/* WORK CALENDAR
   Layout: #plan and #calendar-job-template in index.html.
   Appearance: calendar.css. Jobs keep using the existing local database. */
let calendarUpcomingLimit = 5;
let calendarLastToday = '';

/* DATE HELPERS
   A calendar date is a YYYY-MM-DD key, not a moment in the browser's timezone.
   UTC arithmetic avoids losing a day when crossing daylight-saving changes. */
function calendarDate(key) {
    if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) {
        return null;
    }
    const [year, month, day] = key.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return year >= 1000 && year <= 9999 && calendarKey(date) === key ? date : null;
}

function calendarKey(date) {
    const year = date.getUTCFullYear();
    if (!Number.isFinite(date.getTime()) || year < 1000 || year > 9999) {
        return null;
    }
    return [year, date.getUTCMonth() + 1, date.getUTCDate()]
        .map(value => String(value).padStart(2, '0')).join('-');
}

function calendarLabel(key, options) {
    return new Intl.DateTimeFormat('nb-NO', { ...options, timeZone: 'UTC' }).format(calendarDate(key));
}

function shiftCalendarMonth(key, amount) {
    const date = calendarDate(key);
    const first = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
    const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    first.setUTCDate(Math.min(date.getUTCDate(), lastDay));
    return calendarKey(first);
}

function upcomingJobs() {
    const today = localDateTime().slice(0, 10);
    return appData.jobs.filter(job => job.status === 'pending' && job.scheduled.slice(0, 10) >= today)
        .sort((left, right) => left.scheduled.localeCompare(right.scheduled)
            || left.location.customerName.localeCompare(right.location.customerName, 'nb'));
}

/* SELECTING A DAY
   Replacing the URL keeps selection when returning from a job, without adding
   one browser-history entry for every arrow-key press. No work is changed here. */
function openCalendar(requestedDate) {
    byId('plan-date').value = calendarDate(requestedDate) ? requestedDate : localDateTime().slice(0, 10);
    renderPlan();
}

function selectCalendarDate(key, focusDate = false) {
    if (!calendarDate(key)) {
        return;
    }
    byId('plan-date').value = key;
    history.replaceState(null, '', `#plan?date=${key}`);
    appMessage('');
    renderPlan();
    if (focusDate) {
        byId('calendar-days').querySelector(`[data-date="${key}"]`)?.focus({ preventScroll: true });
    }
}

function renderPlan() {
    const input = byId('plan-date');
    const selected = calendarDate(input.value) ? input.value : localDateTime().slice(0, 10);
    input.value = selected;
    updateDateReadout(input);
    calendarLastToday = localDateTime().slice(0, 10);
    const upcoming = upcomingJobs();
    byId('calendar-overview').textContent = upcoming.length
        ? `${upcoming.length} ${upcoming.length === 1 ? 'kommende jobb' : 'kommende jobber'}`
        : 'Planlegg arbeidet fremover';
    byId('calendar-add').href = `#jobb?date=${selected}`;
    renderCalendarMonth(selected);
    renderCalendarDay(selected);
    renderCalendarUpcoming(selected);
}

/* THE MONTH GRID
   Six stable rows keep the agenda from jumping when the month changes. */
function renderCalendarMonth(selected) {
    const date = calendarDate(selected);
    const month = date.getUTCMonth();
    const first = new Date(Date.UTC(date.getUTCFullYear(), month, 1));
    const offset = (first.getUTCDay() + 6) % 7;
    const today = localDateTime().slice(0, 10);
    byId('calendar-month-title').textContent = calendarLabel(selected, { month: 'long', year: 'numeric' });
    byId('calendar-previous').disabled = !shiftCalendarMonth(selected, -1);
    byId('calendar-next').disabled = !shiftCalendarMonth(selected, 1);

    const jobsByDay = new Map();
    for (const job of appData.jobs) {
        const key = job.scheduled.slice(0, 10);
        const jobs = jobsByDay.get(key) ?? [];
        jobs.push(job);
        jobsByDay.set(key, jobs);
    }
    const rows = [];
    for (let week = 0; week < 6; week += 1) {
        const row = element('tr');
        for (let day = 0; day < 7; day += 1) {
            const current = new Date(first);
            current.setUTCDate(1 - offset + week * 7 + day);
            const key = calendarKey(current);
            const cell = element('td');
            cell.setAttribute('role', 'gridcell');
            cell.setAttribute('aria-selected', String(key === selected));
            if (key) {
                const jobs = jobsByDay.get(key) ?? [];
                const pending = jobs.filter(job => job.status === 'pending').length;
                const button = element('button', undefined, 'calendar-date');
                button.type = 'button';
                button.dataset.date = key;
                button.dataset.outside = String(current.getUTCMonth() !== month);
                button.dataset.selected = String(key === selected);
                button.tabIndex = key === selected ? 0 : -1;
                if (key === today) {
                    button.setAttribute('aria-current', 'date');
                }
                const label = calendarLabel(key, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                button.setAttribute('aria-label', `${label}${key === today ? ', i dag' : ''}, ${jobs.length} jobber, ${pending} planlagt`);
                const number = element('span', String(current.getUTCDate()), 'calendar-date-number');
                const marker = element('span', jobs.length ? String(jobs.length) : '', 'calendar-date-marker');
                marker.dataset.pending = String(pending > 0);
                number.setAttribute('aria-hidden', 'true');
                marker.setAttribute('aria-hidden', 'true');
                button.append(number, marker);
                cell.append(button);
            }
            row.append(cell);
        }
        rows.push(row);
    }
    byId('calendar-days').replaceChildren(...rows);
}

/* DAILY AGENDA
   Viewing, editing or removing a plan never marks work as completed. */
function renderCalendarDay(selected) {
    const jobs = appData.jobs.filter(job => job.scheduled.startsWith(selected))
        .sort((left, right) => left.scheduled.localeCompare(right.scheduled));
    byId('calendar-weekday').textContent = calendarLabel(selected, { weekday: 'long' })
        + (selected === localDateTime().slice(0, 10) ? ' · I dag' : '');
    byId('calendar-day-title').textContent = calendarLabel(selected, { day: 'numeric', month: 'long', year: 'numeric' });
    byId('calendar-day-count').textContent = `${jobs.length} ${jobs.length === 1 ? 'jobb' : 'jobber'}`;
    const list = byId('plan-list');
    list.replaceChildren(...jobs.map(createCalendarJob));
    if (!jobs.length) {
        const empty = element('div', undefined, 'calendar-empty');
        empty.append(element('h3', 'Dagen er ledig'), element('p', 'Ingen jobber planlagt denne dagen.'));
        list.append(empty);
    }
}

function createCalendarJob(job) {
    const row = byId('calendar-job-template').content.firstElementChild.cloneNode(true);
    const target = workLink('job', job.id);
    const active = appData.activeWork?.target === target;
    const status = active ? (appData.activeWork.runningSince === null ? 'paused' : 'active') : job.status;
    row.dataset.status = status;
    row.querySelector('time').dateTime = job.scheduled;
    row.querySelector('time').textContent = job.scheduled.slice(11, 16);
    row.querySelector('h3').textContent = job.location.customerName;
    row.querySelector('.calendar-job-status').textContent = {
        pending: 'Planlagt',
        completed: 'Utført',
        skipped: 'Hoppet over',
        active: 'Pågår',
        paused: 'På pause'
    }[status];
    row.querySelector('.calendar-job-address').textContent = job.location.address;
    row.querySelector('.calendar-job-service').textContent = job.service;
    const note = row.querySelector('.calendar-job-note');
    note.hidden = !job.note;
    note.textContent = job.note;
    const open = row.querySelector('.calendar-job-open');
    open.href = target;
    open.textContent = active ? 'Fortsett arbeid' : job.status === 'pending' ? 'Åpne jobb' : 'Se arbeid';
    const edit = row.querySelector('.calendar-job-edit');
    const remove = row.querySelector('.calendar-job-remove');
    edit.hidden = job.status !== 'pending' || active;
    remove.hidden = job.status !== 'pending' || active;
    edit.href = `#jobb?id=${job.id}`;
    remove.setAttribute('aria-label', `Fjern jobben hos ${job.location.customerName} kl. ${job.scheduled.slice(11, 16)}`);
    remove.addEventListener('click', () => removeCalendarJob(job.id));
    return row;
}

function removeCalendarJob(id) {
    if (!confirm('Vil du fjerne denne planlagte jobben fra kalenderen?')) {
        return;
    }
    saveChange(data => {
        const index = data.jobs.findIndex(job => job.id === id && job.status === 'pending');
        if (index < 0 || data.activeWork?.target === workLink('job', id)) {
            throw new Error('Jobben er startet eller endret. Åpne kalenderen på nytt.');
        }
        data.jobs.splice(index, 1);
    }, () => {
        renderPlan();
        byId('calendar-add').focus({ preventScroll: true });
        appMessage('Jobben er fjernet fra kalenderen.');
    });
}

/* UPCOMING WORK
   Show other dates, without repeating the selected day's jobs. */
function renderCalendarUpcoming(selected) {
    const jobs = upcomingJobs().filter(job => !job.scheduled.startsWith(selected));
    byId('calendar-upcoming-count').textContent = String(jobs.length);
    const links = jobs.slice(0, calendarUpcomingLimit).map(job => {
        const link = element('a', undefined, 'calendar-upcoming-link');
        link.href = `#plan?date=${job.scheduled.slice(0, 10)}`;
        const date = element('span', undefined, 'calendar-upcoming-date');
        const year = job.scheduled.slice(0, 4) === localDateTime().slice(0, 4) ? undefined : 'numeric';
        date.append(
            element('strong', calendarLabel(job.scheduled.slice(0, 10), { day: 'numeric', month: 'short', year })),
            element('span', displayClock(job.scheduled))
        );
        const copy = element('span', undefined, 'calendar-upcoming-copy');
        copy.append(element('strong', job.location.customerName), element('span', `${job.service} · ${job.location.address}`));
        const arrow = element('span', '›', 'calendar-upcoming-arrow');
        arrow.setAttribute('aria-hidden', 'true');
        link.append(date, copy, arrow);
        return link;
    });
    byId('calendar-upcoming-list').replaceChildren(...links);
    if (!jobs.length) {
        byId('calendar-upcoming-list').append(element('p', 'Ingen flere kommende jobber.', 'calendar-no-upcoming'));
    }
    byId('calendar-more').hidden = jobs.length <= calendarUpcomingLimit;
}

/* TOUCH AND KEYBOARD CONTROLS
   Only one date is in the Tab order. Arrows move by day/week; Page Up/Down
   changes month, Shift + Page Up/Down changes year, Home/End selects Mon/Sun. */
byId('plan-date').addEventListener('change', event => selectCalendarDate(event.target.value));
byId('calendar-today').addEventListener('click', () => selectCalendarDate(localDateTime().slice(0, 10)));
byId('calendar-previous').addEventListener('click', () => selectCalendarDate(shiftCalendarMonth(byId('plan-date').value, -1)));
byId('calendar-next').addEventListener('click', () => selectCalendarDate(shiftCalendarMonth(byId('plan-date').value, 1)));
byId('calendar-more').addEventListener('click', () => {
    const firstNew = calendarUpcomingLimit;
    calendarUpcomingLimit += 5;
    renderCalendarUpcoming(byId('plan-date').value);
    byId('calendar-upcoming-list').children[firstNew]?.focus({ preventScroll: true });
});
byId('calendar-days').addEventListener('click', event => {
    const date = event.target.closest('[data-date]');
    if (date) {
        selectCalendarDate(date.dataset.date, true);
    }
});
byId('calendar-days').addEventListener('keydown', event => {
    const button = event.target.closest('[data-date]');
    if (!button || event.altKey || event.ctrlKey || event.metaKey) {
        return;
    }
    const key = button.dataset.date;
    const date = calendarDate(key);
    const weekday = (date.getUTCDay() + 6) % 7;
    const offsets = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -7,
        ArrowDown: 7,
        Home: -weekday,
        End: 6 - weekday
    };
    let next;
    if (event.key in offsets) {
        date.setUTCDate(date.getUTCDate() + offsets[event.key]);
        next = calendarKey(date);
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
        next = shiftCalendarMonth(key, (event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1));
    } else {
        return;
    }
    event.preventDefault();
    selectCalendarDate(next, true);
});

// Refresh Oslo's "today" after midnight or after returning to the app.
function refreshCalendarToday() {
    if (!appData || calendarLastToday === localDateTime().slice(0, 10)) {
        return;
    }
    renderOverview();
    if (selectedRoute().screen === 'plan') {
        renderPlan();
    }
    calendarLastToday = localDateTime().slice(0, 10);
}
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        refreshCalendarToday();
    }
});
setInterval(refreshCalendarToday, 60000);
