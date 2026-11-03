// Hent knappen og feltene fra arbeidsskjermen i index.html.
const saveButton = document.querySelector("#save-work");
saveButton.addEventListener("click", handleSaveClick);
const serviceSelect = document.querySelector("#service");
const noteText = document.querySelector("#note-text");
const workPreview = document.querySelector("#work-preview");
const dateTime = document.querySelector("#date-time");
const sessionlength = document.querySelector("#session-length");

// Les verdiene på nytt for hvert trykk, slik at vi får det du nettopp skrev.
function handleSaveClick() {
    const notedText = noteText.value;
    const selectedService = serviceSelect.value;
    const selectedDateTime = dateTime.value;
    const selectedSessionLength = sessionlength.value;

    // Objektet samler tjenesten og notatet i én pakke.
    const visit = {
        service: selectedService,
        note: notedText,
        dateTime: selectedDateTime,
        sessionLength: selectedSessionLength
    };

    console.log(visit);

    // Vis resultatet ved knappen. Dette er en prøvevisning.
    workPreview.textContent = visit.note.trim()
        ? `${visit.service} · ${visit.note}. Prøvevisning uten lagring.`
        : `${visit.service}. Prøvevisning uten lagring.`;
}
// Listen i HTML er kilden til valgene. Prøvevisningen leser fortsatt samme verdi.
const serviceSheet = document.querySelector("#service-sheet");
const openService = document.querySelector("#open-service");
const serviceChoices = document.querySelector("#service-choices");
const serviceValue = document.querySelector("#service-value");

if (typeof serviceSheet.showModal === "function") {
    for (const option of serviceSelect.options) {
        const choice = document.createElement("button");
        choice.type = "button";
        choice.textContent = option.text;
        choice.value = option.value;
        choice.addEventListener("click", () => {
            serviceSelect.value = choice.value;
            serviceValue.textContent = choice.textContent;
            serviceSheet.close();
        });
        serviceChoices.append(choice);
    }

    openService.addEventListener("click", () => {
        // Marker det gjeldende valget og gi det tastaturfokus.
        for (const choice of serviceChoices.children) {
            choice.setAttribute("aria-pressed", String(choice.value === serviceSelect.value));
        }
        serviceSheet.showModal();
        serviceChoices.querySelector('[aria-pressed="true"]')?.focus();
    });

    serviceValue.textContent = serviceSelect.selectedOptions[0].text;
    document.querySelector("#native-service").hidden = true;
    document.querySelector("#service-field").hidden = false;
}

window.addEventListener("hashchange", () => {
    if (serviceSheet.open) {
        serviceSheet.close();
    }
});
