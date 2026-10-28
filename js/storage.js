/*
  STORAGE.JS - leser og lagrer data i nettleseren.

  1. Enkle kontroller: er dette tekst eller en dato?
  2. validate: sjekk at hele datasettet henger sammen.
  3. load / save: les eller skriv data.

  validate brukes også ved import av sikkerhetskopier.
  Du trenger vanligvis ikke endre denne filen for å endre utseendet.
*/
Alfred.storage = (() => {
  // Dette er navnet dataene lagres under i nettleseren. Ikke endre det uten grunn.
  const storageKey = 'alfred-maskin-demo-v1';

  // 1. SMÅ KONTROLLER
  function isText(value) {
    return typeof value === 'string';
  }

  function isDate(value) {
    return isText(value) && Number.isFinite(Date.parse(value));
  }

  function check(condition, errorMessage) {
    if (!condition) {
      throw new Error(errorMessage);
    }
  }

  // 2. KONTROLLER HELE DATASETTET
  // Hvis én kontroll feiler, stoppes lagringen med en feilmelding.
  function validate(data) {
    check(data && data.version === 1, 'Ukjent sikkerhetskopi-versjon.');

    // Hver liste må finnes. ID-ene i hver liste skal være unike.
    const listNames = ['customers', 'addresses', 'rounds', 'runs', 'records'];

    for (const listName of listNames) {
      check(Array.isArray(data[listName]), `Mangler ${listName}.`);

      const ids = data[listName].map(item => item && item.id);
      const allIdsAreText = ids.every(id => isText(id) && id.length > 0);
      const allIdsAreUnique = new Set(ids).size === ids.length;

      check(allIdsAreText && allIdsAreUnique, 'Ugyldige eller dupliserte ID-er.');
    }

    // ID-listene lar oss sjekke at adresser og historikk peker på ekte oppføringer.
    const customerIds = new Set(data.customers.map(customer => customer.id));
    const addressIds = new Set(data.addresses.map(address => address.id));

    // Kunder
    for (const customer of data.customers) {
      check(
        isText(customer.name) && customer.name.trim() &&
        ['phone', 'email', 'notes'].every(field => isText(customer[field])) &&
        typeof customer.archived === 'boolean',
        'Ugyldig kunde.'
      );
    }

    // Arbeidsadresser
    for (const address of data.addresses) {
      check(
        customerIds.has(address.customerId) &&
        isText(address.label) && address.label.trim() &&
        isText(address.instructions) &&
        Array.isArray(address.services) && address.services.length &&
        address.services.every(service => Alfred.services.includes(service)),
        'Ugyldig arbeidsadresse.'
      );
    }

    // Gjenbrukbare runder
    for (const round of data.rounds) {
      check(
        isText(round.name) && round.name.trim() &&
        Array.isArray(round.addressIds) &&
        round.addressIds.every(id => addressIds.has(id)) &&
        new Set(round.addressIds).size === round.addressIds.length,
        'Ugyldig runde.'
      );
    }

    // Kjøringer og stopp
    for (const run of data.runs) {
      check(
        isText(run.name) && isDate(run.startedAt) &&
        Array.isArray(run.stops) && run.stops.length > 0,
        'Ugyldig kjøring.'
      );
      check(new Set(run.stops.map(stop => stop.id)).size === run.stops.length, 'Dupliserte stopp.');

      for (const stop of run.stops) {
        check(
          isText(stop.id) &&
          customerIds.has(stop.customerId) && addressIds.has(stop.addressId) &&
          isText(stop.customerName) && isText(stop.addressLabel) && isText(stop.instructions) &&
          Array.isArray(stop.services) && stop.services.length &&
          stop.services.every(service => Alfred.services.includes(service)) &&
          ['pending', 'completed', 'skipped'].includes(stop.status),
          'Ugyldig stopp.'
        );
      }
    }

    // Arbeidsregistreringer
    for (const record of data.records) {
      check(
        customerIds.has(record.customerId) && addressIds.has(record.addressId) &&
        isText(record.customerName) && isText(record.addressLabel) &&
        Alfred.services.includes(record.service) &&
        isDate(record.workedAt) && isDate(record.createdAt) && isText(record.note) &&
        (record.duration === null || (Number.isFinite(record.duration) && record.duration >= 0)),
        'Ugyldig arbeidslogg.'
      );

      const matchingRun = data.runs.find(run => run.id === record.runId);
      check(
        matchingRun && matchingRun.stops.some(stop =>
          stop.id === record.stopId && stop.status === 'completed' &&
          stop.customerId === record.customerId && stop.addressId === record.addressId
        ),
        'Arbeidslogg mangler et fullført stopp.'
      );
    }

    // Et fullført stopp skal ha én registrering. Andre stopp skal ha null.
    for (const run of data.runs) {
      for (const stop of run.stops) {
        const matchingRecords = data.records.filter(record =>
          record.runId === run.id && record.stopId === stop.id
        );
        const expectedCount = stop.status === 'completed' ? 1 : 0;
        check(matchingRecords.length === expectedCount, 'Stopp og arbeidslogg stemmer ikke overens.');
      }
    }

    return data;
  }

  // 3. FUNKSJONENE APPEN BRUKER
  return {
    validate,

    load() {
      const savedText = localStorage.getItem(storageKey);

      if (!savedText) {
        return Alfred.seed(); // Første besøk: start med fiktive testdata.
      }

      return validate(JSON.parse(savedText));
    },

    save(data) {
      validate(data);
      // Kan feile hvis nettleseren sperrer lagring eller plassen er full.
      localStorage.setItem(storageKey, JSON.stringify(data));
    },
  };
})();
