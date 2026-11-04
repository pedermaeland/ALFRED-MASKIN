/* SCREEN NAVIGATION
   Each screen is a section with data-screen in index.html.
   A link with href="#runde" opens the screen with id="runde". */
const appShell = document.querySelector(".app-shell");
const overviewScreen = document.querySelector("#oversikt");
const dataLink = document.querySelector("#data-link");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let currentScreen = overviewScreen;
let stopScreenAnimation = null;

// A link can point to a screen or an element inside it, such as #jobb-a.
function findDestination(hash) {
    const target = document.getElementById(hash.slice(1).split("?")[0]);
    const screen = target?.closest("[data-screen]");

    return {
        screen: screen ?? overviewScreen,
        anchor: screen && target !== screen ? target : null
    };
}

// hidden hides the screen while keeping its HTML and field values in the page.
function showScreen(destination, moveFocus) {
    const { screen, anchor } = destination;

    currentScreen.hidden = true;
    screen.hidden = false;
    currentScreen = screen;
    document.title = screen.dataset.title;
    dataLink.hidden = screen !== overviewScreen;
    document.dispatchEvent(new Event("app:navigate"));

    if (moveFocus) {
        const focusTarget = anchor ?? screen.querySelector("h1");
        focusTarget.focus({ preventScroll: true });
    }

    if (anchor) {
        anchor.scrollIntoView();
    } else {
        window.scrollTo(0, 0);
    }
}

// The copy is decorative. IDs stay on the live screen.
function copyVisibleScreen() {
    const copy = document.createElement("div");
    copy.className = "screen-transition-previous";
    copy.setAttribute("aria-hidden", "true");
    copy.inert = true;

    const page = appShell.cloneNode(false);
    const main = appShell.querySelector("main").cloneNode(false);
    const screenCopy = currentScreen.cloneNode(true);
    const selects = currentScreen.querySelectorAll("select");
    screenCopy.querySelectorAll("select").forEach((select, index) => {
        select.selectedIndex = selects[index].selectedIndex;
    });
    main.append(screenCopy);
    page.append(appShell.querySelector(".app-header").cloneNode(true), main);
    page.querySelectorAll("[id]").forEach(element => element.removeAttribute("id"));
    page.style.width = `${appShell.offsetWidth}px`;
    page.style.top = `${-window.scrollY}px`;
    copy.append(page);

    return copy;
}

/* SCREEN SLIDE
   Going forward brings the new screen in from the right. Going back reverses the layers.
   Both copies use the same easing curve while the live screen is ready underneath. */
function slideScreen(destination, goingBack) {
    const outgoing = copyVisibleScreen();
    showScreen(destination, true);
    const incoming = copyVisibleScreen();

    incoming.classList.add("screen-slide");
    outgoing.classList.add("screen-slide");
    const front = goingBack ? outgoing : incoming;
    front.classList.add("screen-slide-front");
    document.body.append(incoming, outgoing);

    // The front screen travels a full width. The screen behind it moves just 28%.
    const timing = {
        duration: 310,
        easing: "cubic-bezier(0.22, 0.72, 0.22, 1)",
        fill: "both"
    };
    const enter = incoming.animate({
        transform: [goingBack ? "translateX(-28%)" : "translateX(100%)", "translateX(0)"]
    }, timing);
    const exit = outgoing.animate({
        transform: ["translateX(0)", goingBack ? "translateX(100%)" : "translateX(-28%)"]
    }, timing);

    // Remove both copies together, including when another navigation interrupts the slide.
    function finishSlide() {
        if (stopScreenAnimation !== finishSlide) {
            return;
        }

        stopScreenAnimation = null;
        outgoing.remove();
        incoming.remove();
        exit.cancel();
        enter.cancel();
    }

    stopScreenAnimation = finishSlide;
    exit.finished.then(finishSlide, finishSlide);
}

/* EXPANDING CARD
   Keep a copy of the previous screen behind the new one. Start by clipping the new screen
   to the tapped link's shape, then expand it to reveal the content. */
function openScreen(link, destination) {
    stopScreenAnimation?.();

    if (destination.screen === currentScreen
        || reducedMotion.matches || !Element.prototype.animate) {
        showScreen(destination, true);
        return;
    }

    if (!link.matches(".overview-tile, .floating-add")) {
        slideScreen(destination, link.matches(".back-link"));
        return;
    }

    if (!CSS.supports("clip-path", "inset(0px round 0px)")) {
        showScreen(destination, true);
        return;
    }

    const box = link.getBoundingClientRect();
    if (!box.width || !box.height) {
        showScreen(destination, true);
        return;
    }

    const style = getComputedStyle(link);
    const radius = link.matches(".overview-tile, .card")
        ? style.getPropertyValue("--radius-medium").trim()
        : style.borderTopLeftRadius;

    const previous = copyVisibleScreen();

    // Show the tapped link's color and content in the first few frames.
    const tint = document.createElement("div");
    tint.className = "screen-transition-tint";
    tint.setAttribute("aria-hidden", "true");
    tint.inert = true;
    tint.style.backgroundImage = style.backgroundImage;
    if (style.backgroundColor !== "rgba(0, 0, 0, 0)") {
        tint.style.backgroundColor = style.backgroundColor;
    }

    const cardCopy = link.cloneNode(true);
    cardCopy.removeAttribute("id");
    cardCopy.classList.remove("is-pressed");
    cardCopy.classList.add("screen-transition-source");
    cardCopy.style.left = `${box.left}px`;
    cardCopy.style.top = `${box.top}px`;
    cardCopy.style.width = `${box.width}px`;
    cardCopy.style.height = `${box.height}px`;
    tint.append(cardCopy);

    document.body.append(previous);
    appShell.classList.add("is-opening");
    showScreen(destination, true);
    appShell.append(tint);

    // After navigation, measure the viewport edges relative to the app.
    const app = appShell.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight;
    function shape(top, right, bottom, left, corners) {
        return `inset(${top - app.top}px ${app.right - right}px ${app.bottom - bottom}px ${left - app.left}px round ${corners})`;
    }

    const startShape = shape(
        Math.max(0, box.top),
        Math.min(viewportWidth, box.right),
        Math.min(viewportHeight, box.bottom),
        Math.max(0, box.left),
        radius
    );
    const fullShape = shape(0, viewportWidth, viewportHeight, 0, "48px");
    const edgeShape = shape(0, viewportWidth, viewportHeight, 0, "0px");

    // Fade the tile overlay to reveal the new screen underneath.
    const colorFade = tint.animate(
        { opacity: [1, 0] },
        { duration: 90, fill: "both" }
    );
    const opening = appShell.animate([
        { clipPath: startShape, easing: "cubic-bezier(0.22, 0.68, 0.25, 1)" },
        { clipPath: fullShape, offset: 0.86 },
        { clipPath: edgeShape }
    ], { duration: 320, fill: "both" });

    // Clean up when the animation finishes or another navigation starts.
    function finishOpening() {
        if (stopScreenAnimation !== finishOpening) {
            return;
        }

        stopScreenAnimation = null;
        opening.cancel();
        colorFade.cancel();
        tint.remove();
        previous.remove();
        appShell.classList.remove("is-opening");
    }

    stopScreenAnimation = finishOpening;
    opening.finished.then(finishOpening, finishOpening);
}

/* LINKS AND BROWSER HISTORY
   Let the browser handle shortcuts such as Ctrl-click. */
document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');

    if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")
        || event.defaultPrevented || event.button !== 0
        || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
        return;
    }

    event.preventDefault();
    const destination = findDestination(link.hash);

    // pushState updates the address and adds an entry to browser history.
    if (location.hash !== link.hash) {
        history.pushState(null, "", link.hash);
    }

    openScreen(link, destination);
});

// Back, Forward and manual changes to the URL hash show the matching screen.
window.addEventListener("hashchange", () => {
    stopScreenAnimation?.();
    showScreen(findDestination(location.hash), true);
});

// Stop the animation if the motion preference changes.
reducedMotion.addEventListener("change", () => stopScreenAnimation?.());

// Read the address at startup to support direct links such as index.html#logg.
showScreen(findDestination(location.hash), false);
