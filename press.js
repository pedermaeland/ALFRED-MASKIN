/* Trykktilstand for berøring, mus og penn. Nettleseren håndterer selve klikket. */
const pressable = [
    "button:enabled",
    "a[href]:not([aria-disabled='true'])",
    ".optional-work > summary"
].join(", ");

let pressedControl = null;
let pressedPointer = null;

document.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) {
        return;
    }

    clearPress();
    pressedControl = event.target.closest(pressable);

    if (pressedControl) {
        pressedPointer = event.pointerId;
        pressedControl.classList.add("is-pressed");
    }
});

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
