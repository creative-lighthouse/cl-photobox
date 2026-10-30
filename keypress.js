document.addEventListener('DOMContentLoaded', function() {
    // Elemente für Countdown und Progressbar
    const countdownMinutes = document.getElementById('countdown-minutes');
    const countdownSeconds = document.getElementById('countdown-seconds');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    let countdownTimer = null;

    // Auslöse-Taste (wird im Browser gespeichert)
    const KEY_STORAGE = 'photobox-trigger-key';
    const triggerKeyLabel = document.getElementById('trigger-key');
    const learnKeyBtn = document.getElementById('learn-key-btn');
    let triggerKey = { code: 'Space', label: 'Leertaste' };
    let learning = false;

    try {
        const saved = JSON.parse(localStorage.getItem(KEY_STORAGE));
        if (saved && saved.code) triggerKey = saved;
    } catch (e) {
        // Kein gespeicherter Wert – Standard behalten
    }
    triggerKeyLabel.textContent = triggerKey.label;

    learnKeyBtn.addEventListener('click', function() {
        learning = true;
        learnKeyBtn.textContent = 'Taste drücken…';
        learnKeyBtn.blur();
    });

    document.addEventListener('keydown', function(event) {
        if (learning) {
            event.preventDefault();
            learning = false;
            triggerKey = {
                code: event.code,
                label: event.key === ' ' ? 'Leertaste' : event.key
            };
            triggerKeyLabel.textContent = triggerKey.label;
            learnKeyBtn.textContent = 'Taste festlegen';
            try {
                localStorage.setItem(KEY_STORAGE, JSON.stringify(triggerKey));
            } catch (e) {
                console.warn('Taste konnte nicht gespeichert werden:', e);
            }
            return;
        }

        // Eingaben in Formularfeldern (z.B. Countdown) nicht als Auslöser werten
        if (event.target.matches('input, select')) return;
        if (event.repeat || event.code !== triggerKey.code) return;

        // Verhindert z.B., dass die Leertaste einen fokussierten Button klickt
        event.preventDefault();
        startCountdown();
    });

    function startCountdown() {
        // Während ein Countdown läuft, weitere Tastendrücke ignorieren
        if (countdownTimer) return;
        const min = parseInt(countdownMinutes.value, 10) || 0;
        const sec = parseInt(countdownSeconds.value, 10) || 0;
        const totalSeconds = min * 60 + sec;
        let elapsed = 0;
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        countdownTimer = setInterval(() => {
            elapsed += 0.1;
            const percent = totalSeconds > 0 ? Math.min(100, (elapsed / totalSeconds) * 100) : 100;
            progressBar.style.width = percent + '%';
            if (elapsed >= totalSeconds) {
                clearInterval(countdownTimer);
                countdownTimer = null;
                progressBar.style.width = '100%';
                setTimeout(() => {
                    progressContainer.style.display = 'none';
                }, 500);
                takePhoto();
            }
        }, 100);
    }

    function takePhoto() {
        if (!video.srcObject) return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 400;
        canvas.height = video.videoHeight || 300;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        photoResult.innerHTML = `<img src="${dataUrl}" style="max-width:100%;border-radius:8px;" />`;
        // Eigener Container je Foto, damit eine späte Antwort nicht beim nächsten Foto landet
        const resultContainer = document.createElement('div');
        photoResult.appendChild(resultContainer);

        // Bild als JPEG per FormData an das gewählte Upload-Ziel senden
        uploadPhoto(canvas)
            .then(data => showUploadResult(resultContainer, data))
            .catch(() => {
                // Bereits in uploadPhoto geloggt
            });
    }

    initUploadTargetSelect(document.getElementById('upload-target'), 'onride');
    initUploadBaseUrlInput(document.getElementById('upload-base-url'));

    document.getElementById('back-btn').addEventListener('click', function() {
        window.location.href = 'index.html';
    });

    // Kamera-Vorschau und Auswahl
    let currentStream = null;
    let videoDevices = [];
    const video = document.getElementById('camera-preview');
    const select = document.getElementById('camera-select');
    const photoResult = document.getElementById('photo-result');

    // Geräte auflisten
    navigator.mediaDevices.enumerateDevices().then(devices => {
        videoDevices = devices.filter(device => device.kind === 'videoinput');
        select.innerHTML = '';
        videoDevices.forEach((device, idx) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Kamera ${idx+1}`;
            select.appendChild(option);
        });
        if (videoDevices.length > 0) {
            startCamera(videoDevices[0].deviceId);
        }
    });

    select.addEventListener('change', function() {
        startCamera(select.value);
        // Fokus lösen, damit die Auslöse-Taste wieder greift
        select.blur();
    });

    function startCamera(deviceId) {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
        navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } })
            .then(stream => {
                currentStream = stream;
                video.srcObject = stream;
            })
            .catch(err => {
                if (err.name === 'OverconstrainedError') {
                    console.warn('Spezifische Kamera konnte nicht geöffnet werden, versuche Standardkamera...');
                    navigator.mediaDevices.getUserMedia({ video: true })
                        .then(stream => {
                            currentStream = stream;
                            video.srcObject = stream;
                        })
                        .catch(e2 => {
                            console.error('Kamera-Fehler (Fallback):', e2);
                            alert('Keine Kamera verfügbar oder Berechtigung verweigert.');
                        });
                } else {
                    console.error('Kamera-Fehler:', err);
                    alert('Kamera-Fehler: ' + err.message);
                }
            });
    }

    // Foto aufnehmen
    document.getElementById('take-photo-btn').addEventListener('click', function() {
        takePhoto();
    });
});
