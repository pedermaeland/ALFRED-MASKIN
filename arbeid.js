const saveButton = document.querySelector("#save-work");
saveButton.addEventListener("click", handleSaveClick);

const serviceSelect = document.querySelector("#service");
const noteText = document.querySelector("#note-text");

const notedText = noteText.value;
const selectedService = serviceSelect.value;

function handleSaveClick () {
    const notedText = noteText.value;
    const selectedService = serviceSelect.value;
    
    const visit = {
        service: selectedService,
        note: notedText
    }

    console.log(visit);
}