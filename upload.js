// Gemeinsamer Upload zur Halloweenhaus-Website (Fotobox- und Onride-Fotos)
const UPLOAD_BASE_URLS = {
    live: 'https://halloweenhaus-schmalenbeck.de',
    ddev: 'https://halloweenhaus-website.ddev.site',
};
// Zum Testen per URL-Parameter umschalten, z.B. keypress.html?api=ddev
const UPLOAD_ENV = (() => {
    const env = new URLSearchParams(location.search).get('api');
    return UPLOAD_BASE_URLS[env] ? env : 'live';
})();
const UPLOAD_BASE_URL = UPLOAD_BASE_URLS[UPLOAD_ENV];

const UPLOAD_TARGETS = {
    booth: {
        label: 'Fotobox (öffentliche Galerie)',
        endpoint: '/api/BoothImageEntryForm',
        submitField: 'action_submit',
    },
    onride: {
        label: 'Onride (Anzeige am Ride-Ausgang)',
        endpoint: '/api/OnrideImageEntryForm',
        submitField: 'action_submitOnride',
    },
};

const UPLOAD_TARGET_STORAGE = 'photobox-upload-target';
const UPLOAD_MAX_ATTEMPTS = 3;
const UPLOAD_RETRY_DELAY_MS = 2000;

function getUploadTarget() {
    try {
        const saved = localStorage.getItem(UPLOAD_TARGET_STORAGE);
        if (saved && UPLOAD_TARGETS[saved]) return saved;
    } catch (e) {
        // Kein gespeicherter Wert – Standard behalten
    }
    return 'booth';
}

function setUploadTarget(target) {
    if (!UPLOAD_TARGETS[target]) return;
    try {
        localStorage.setItem(UPLOAD_TARGET_STORAGE, target);
    } catch (e) {
        console.warn('Upload-Ziel konnte nicht gespeichert werden:', e);
    }
}

// Füllt ein <select> mit den Upload-Zielen und merkt sich die Auswahl
function initUploadTargetSelect(select) {
    Object.entries(UPLOAD_TARGETS).forEach(([key, target]) => {
        const option = document.createElement('option');
        option.value = key;
        option.text = target.label;
        select.appendChild(option);
    });
    select.value = getUploadTarget();
    if (UPLOAD_ENV !== 'live') {
        // Deutlicher Hinweis, damit der Testmodus nicht versehentlich im Betrieb läuft
        const hint = document.createElement('span');
        hint.textContent = ` TEST: Upload an ${UPLOAD_BASE_URL}`;
        hint.style.cssText = 'color:#ff9800;font-weight:bold;';
        select.insertAdjacentElement('afterend', hint);
    }
    select.addEventListener('change', function() {
        setUploadTarget(select.value);
        // Fokus lösen, damit z.B. die Auslöse-Taste wieder greift
        select.blur();
    });
}

function canvasToJpegBlob(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Bild konnte nicht erzeugt werden'));
        }, 'image/jpeg');
    });
}

async function postImage(target, blob, filename) {
    const form = new FormData();
    form.append(target.submitField, 'Submit');
    form.append('Image', blob, filename);

    const response = await fetch(UPLOAD_BASE_URL + target.endpoint, {
        method: 'POST',
        body: form,
    });
    // Bei Serverfehlern kommt eine HTML-Seite statt JSON zurück
    const text = await response.text();
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    try {
        return JSON.parse(text);
    } catch (e) {
        throw new Error('Antwort ist kein JSON');
    }
}

// Lädt das Canvas-Bild hoch; liefert { detaillink, qrlink } (sofern vom Server geliefert)
async function uploadPhoto(canvas, targetKey = getUploadTarget()) {
    const target = UPLOAD_TARGETS[targetKey];
    if (!target) throw new Error(`Unbekanntes Upload-Ziel: ${targetKey}`);

    const blob = await canvasToJpegBlob(canvas);
    const now = new Date().toISOString().replace(/[-T:.Z]/g, '');

    for (let attempt = 1; ; attempt++) {
        try {
            const data = await postImage(target, blob, `${now}.jpg`);
            console.log(`Image saved (${targetKey}):`, data);
            return data;
        } catch (error) {
            console.error(`Error saving image (${targetKey}, Versuch ${attempt}/${UPLOAD_MAX_ATTEMPTS}):`, error);
            if (attempt >= UPLOAD_MAX_ATTEMPTS) throw error;
            await new Promise(resolve => setTimeout(resolve, UPLOAD_RETRY_DELAY_MS));
        }
    }
}

// Zeigt QR-Code und Link aus der Upload-Antwort im Container an
function showUploadResult(container, data) {
    if (!data || !data.qrlink || !data.detaillink) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'upload-result';

    const qr = document.createElement('img');
    qr.src = data.qrlink;
    qr.alt = 'QR-Code zum Foto';
    qr.style.cssText = 'width:200px;height:200px;background:#fff;margin-top:16px;';

    const link = document.createElement('a');
    link.href = data.detaillink;
    link.target = '_blank';
    link.textContent = data.detaillink;
    link.style.display = 'block';

    wrapper.appendChild(qr);
    wrapper.appendChild(link);
    container.appendChild(wrapper);
}
