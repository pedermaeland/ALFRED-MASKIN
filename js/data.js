/*
  DATA.JS - start her hvis du vil endre de fiktive testdataene

  services  = hvilke tjenester som kan velges.
  customers = kundedetaljer. id kobler kunden til adresser og historikk.
  addresses = arbeidsadresser. customerId viser hvilken kunde som eier adressen.
  rounds    = faste runder. addressIds bestemmer kjørerekkefølgen.
  runs      = gjennomføringer av rundene, tom ved første oppstart.
  records   = registrert arbeid, tom ved første oppstart.

  Alfred er et felles navn de tre JavaScript-filene deler.
  seed() lager et nytt sett testdata. Den overskriver ikke lagrede data.
*/
// Endre testkundene her. Nye nettlesere starter med disse dataene.
// Eksisterende lagrede data endres ikke når du redigerer denne filen.
window.Alfred = {};
Alfred.services = ['Brøyting', 'Strøing', 'Annet arbeid'];
Alfred.seed = () => ({
  version: 1,
  // KUNDER
  customers: [{
    id: 'demo-1',
    name: 'Eksempelkunde A',
    phone: '',
    email: '',
    notes: '',
    archived: false
  }, {
    id: 'demo-2',
    name: 'Eksempelkunde B',
    phone: '',
    email: '',
    notes: '',
    archived: false
  }, {
    id: 'demo-3',
    name: 'Eksempelkunde C',
    phone: '',
    email: '',
    notes: '',
    archived: false
  }, ],
  // ARBEIDSADRESSER
  addresses: [{
    id: 'address-1',
    customerId: 'demo-1',
    label: 'Eksempelvegen 10 (fiktiv)',
    instructions: 'Brøyt foran garasjen.',
    services: ['Brøyting', 'Strøing']
  }, {
    id: 'address-2',
    customerId: 'demo-2',
    label: 'Testbakken 22 (fiktiv)',
    instructions: 'Legg snøen på venstre side.',
    services: ['Brøyting']
  }, {
    id: 'address-3',
    customerId: 'demo-3',
    label: 'Demotunet 3 (fiktiv)',
    instructions: '',
    services: ['Brøyting', 'Annet arbeid']
  }, ],
  // GJENBRUKBARE RUNDER
  rounds: [{
    id: 'round-1',
    name: 'Brøyterunde',
    addressIds: ['address-1', 'address-2', 'address-3']
  }],
  // KJØRINGER
  runs: [],
  // ARBEIDSREGISTRERINGER
  records: [],
});
