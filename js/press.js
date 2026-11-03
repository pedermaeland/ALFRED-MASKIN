/* Trykktilstand for berøring, mus og penn. Nettleseren håndterer selve klikket. */
// Listen sier hvilke elementer som skal få trykkfargen fra CSS.
const pressable = [
    "button:enabled",
    "input:enabled",
    "select:enabled",
    "textarea:enabled",
    "a[href]:not([aria-disabled='true'])",
    ".optional-work > summary"
].join(", ");

// Vi husker elementet og hvilken finger eller peker som trykket.
let pressedControl = null;
let pressedPointer = null;

document.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) {
        return;
    }

    clearPress();
    // closest finner også knappen når du treffer ikonet eller teksten inni.
    pressedControl = event.target.closest(pressable);

    if (pressedControl) {
        pressedPointer = event.pointerId;
        pressedControl.classList.add("is-pressed");
    }
});

// Ta bort CSS-klassen ved slipp, avbrutt trykk eller når siden lukkes.
function clearPress() {
    pressedControl?.classList.remove("is-pressed");
    pressedControl = null;
    pressedPointer = null;
}

function endPress(event) {
    if (event.pointerId === pressedPointer) {
        clearPress();
    }
}

document.addEventListener("pointerup", endPress);
document.addEventListener("pointercancel", endPress);
window.addEventListener("blur", clearPress);
window.addEventListener("pagehide", clearPress);
