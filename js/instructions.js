/* ADRESSEINSTRUKSJONER
   Hver adresse har ett skrivefelt og ett sted der teksten vises. */
for (const addressId of ["a", "b"]) {
    const field = document.querySelector(`#edit-instructions-${addressId}`);
    const instructions = document.querySelector(`#instructions-${addressId}`);
    const save = document.querySelector(`#save-instructions-${addressId}`);
    const status = document.querySelector(`#instructions-status-${addressId}`);
    const storageKey = `alfred-maskin:demo-instructions:${addressId}`;

    // Start med eksempelteksten. En lagret tom tekst betyr at boksen skal skjules.
    field.value = instructions.textContent.trim();
    try {
        field.value = localStorage.getItem(storageKey) ?? field.value;
    } catch {
        // Eksempelteksten kan fortsatt vises hvis lokal lagring er utilgjengelig.
    }
    showInstructions(field.value);

    save.addEventListener("click", () => {
        const text = field.value.trim();

        try {
            localStorage.setItem(storageKey, text);
            showInstructions(text);
            status.textContent = "Instruksjonene er lagret på denne enheten.";
        } catch {
            status.textContent = "Kunne ikke lagre instruksjonene. Prøv igjen.";
        }

        status.hidden = false;
    });

    // textContent viser notatet som vanlig tekst. hidden fjerner en tom boks.
    function showInstructions(text) {
        instructions.textContent = text;
        instructions.hidden = text === "";
    }
}
