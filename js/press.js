/* Press feedback for touch, mouse and pen. The browser handles the click. */
// This list selects the elements that get CSS press feedback.
const pressable = [
    "button:enabled",
    "input:enabled",
    "select:enabled",
    "textarea:enabled",
    "a[href]:not([aria-disabled='true'])",
    ".optional-work > summary"
].join(", ");

// Remember the pressed element and the pointer that pressed it.
let pressedControl = null;
let pressedPointer = null;

document.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) {
        return;
    }

    clearPress();
    // closest finds the control even if you tap its icon or text.
    pressedControl = event.target.closest(pressable);

    if (pressedControl) {
        pressedPointer = event.pointerId;
        pressedControl.classList.add("is-pressed");
    }
});

// Remove the CSS class on release, cancellation or when leaving the page.
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
