/* SIDEVEKSLING
   Hver skjerm er en section med data-screen i index.html.
   En lenke som href="#runde" finner skjermen med id="runde". */
const appShell = document.querySelector(".app-shell");
const overviewScreen = document.querySelector("#oversikt");
const dataLink = document.querySelector("#data-link");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let currentScreen = overviewScreen;
let stopScreenAnimation = null;

// En lenke kan peke på hele skjermen eller en del av den, f.eks. #jobb-a.
function findDestination(hash) {
    const target = document.getElementById(hash.slice(1));
    const screen = target?.closest("[data-screen]");

    return {
        screen: screen ?? overviewScreen,
        anchor: screen && target !== screen ? target : null
    };
}

// hidden skjuler skjermen, men HTML-en og det du har skrevet blir i nettleseren.
function showScreen(destination, moveFocus) {
    const { screen, anchor } = destination;

    currentScreen.hidden = true;
    screen.hidden = false;
    currentScreen = screen;
    document.title = screen.dataset.title;
    dataLink.hidden = screen !== overviewScreen;

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

// Kopien er bare til pynt. ID-ene blir igjen på den ekte skjermen.
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

/* TILBAKESLIDE
   Skjermen du forlater glir til høyre. Skjermen bak starter litt til venstre.
   Begge kopiene følger samme kurve, mens den ekte skjermen allerede er klar. */
function slideBack(destination) {
    const outgoing = copyVisibleScreen();
    showScreen(destination, true);
    const incoming = copyVisibleScreen();

    incoming.classList.add("screen-slide");
    outgoing.classList.add("screen-slide", "screen-slide-out");
    document.body.append(incoming, outgoing);

    // Prosentene måles mot skjermbredden. Bare den fremste skjermen flyttes helt ut.
    const timing = {
        duration: 310,
        easing: "cubic-bezier(0.22, 0.72, 0.22, 1)",
        fill: "both"
    };
    const enter = incoming.animate({
        transform: ["translateX(-28%)", "translateX(0)"]
    }, timing);
    const exit = outgoing.animate({
        transform: ["translateX(0)", "translateX(100%)"]
    }, timing);

    // Fjern kopiene samtidig, også hvis du navigerer videre før sliden er ferdig.
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

/* BEHOLDER SOM VOKSER
   Behold et bilde av den gamle skjermen bak. Klipp den nye skjermen
   til formen på lenken, og åpne klippet slik at innholdet kommer fram inni. */
function openScreen(link, destination) {
    stopScreenAnimation?.();

    if (destination.screen === currentScreen
        || reducedMotion.matches || !Element.prototype.animate) {
        showScreen(destination, true);
        return;
    }

    if (link.matches(".back-link")) {
        slideBack(destination);
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

    // Den trykkede lenkens farge og innhold blir med i de første bildene.
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

    // Regn om skjermkantene til avstander fra appens kanter etter sideskiftet.
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

    // Bare flisfargen tones ut. Innholdet i den nye skjermen forblir synlig.
    const colorFade = tint.animate(
        { opacity: [1, 0] },
        { duration: 90, fill: "both" }
    );
    const opening = appShell.animate([
        { clipPath: startShape, easing: "cubic-bezier(0.22, 0.68, 0.25, 1)" },
        { clipPath: fullShape, offset: 0.86 },
        { clipPath: edgeShape }
    ], { duration: 320, fill: "both" });

    // Rydd opp ved slutten eller ved neste navigasjon.
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

/* LENKER OG NETTLESERHISTORIKK
   Vi lar vanlige nettleserhandlinger som Ctrl-klikk åpne lenken selv. */
document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');

    if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")
        || event.defaultPrevented || event.button !== 0
        || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
        return;
    }

    event.preventDefault();
    const destination = findDestination(link.hash);

    // pushState endrer adressen og legger til et steg for nettleserens Tilbake-knapp.
    if (location.hash !== link.hash) {
        history.pushState(null, "", link.hash);
    }

    openScreen(link, destination);
});

// Tilbake, Frem og en endring av #delen i adressen viser riktig skjerm.
window.addEventListener("hashchange", () => {
    stopScreenAnimation?.();
    showScreen(findDestination(location.hash), true);
});

// Avslutt bevegelsen hvis brukeren endrer bevegelsesvalget.
reducedMotion.addEventListener("change", () => stopScreenAnimation?.());

// Les adressen også ved oppstart, f.eks. hvis noen åpner index.html#logg direkte.
showScreen(findDestination(location.hash), false);
