document.addEventListener("DOMContentLoaded", function () {
  // Elemente für Countdown und Progressbar
  const countdownMinutes = document.getElementById("countdown-minutes");
  const countdownSeconds = document.getElementById("countdown-seconds");
  const progressContainer = document.getElementById("progress-container");
  const progressBar = document.getElementById("progress-bar");
  let lastElapsedDs = null;
  let countdownTimer = null;

  const ws = new WebSocket("ws://192.168.188.61:8765"); // Passe die URL ggf. an
  ws.onopen = function () {
    console.log("Websocket verbunden (Websocket-Modus)");
    // Sende heartbeat-Nachricht an den Server, damit die WebApp im Show Controller erscheint
    ws.send(
      JSON.stringify({
        type: "heartbeat",
        data: {
          device_id: "webapp-frontend",
          room_selected: null,
          wifi_strength: 100,
        },
      })
    );
  };
  ws.onmessage = function (event) {
    if (event.data === "state") {
      console.log("Empfangene Nachricht:", event.data);
    }
    // Zeige immer nur die neueste Nachricht in einem Kasten
    const content = document.getElementById("ws-content");
    content.innerHTML = `<p>Nachricht: ${event.data}</p>`;

    // Prüfe auf neue Show in State-Nachricht
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch (e) {
      return;
    }
    if (msg.type === "state" && msg.state) {
      // Prüfe, ob elapsedDs auf 0 zurückgesetzt wurde (Showstart)
      if (typeof msg.state.elapsedDs === "number") {
        if (
          lastElapsedDs !== null &&
          msg.state.elapsedDs < lastElapsedDs &&
          lastElapsedDs > 0
        ) {
          startCountdown();
        }
        lastElapsedDs = msg.state.elapsedDs;
      }
    }
  };

  ws.onclose = function () {
    console.log("Websocket getrennt");
  };

  function startCountdown() {
    // Countdown starten und Progressbar anzeigen
    const min = parseInt(countdownMinutes.value, 10) || 0;
    const sec = parseInt(countdownSeconds.value, 10) || 0;
    const totalSeconds = min * 60 + sec;
    let elapsed = 0;
    progressContainer.style.display = "block";
    progressBar.style.width = "0%";
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      elapsed += 0.1;
      const percent = Math.min(100, (elapsed / totalSeconds) * 100);
      progressBar.style.width = percent + "%";
      if (elapsed >= totalSeconds) {
        clearInterval(countdownTimer);
        progressBar.style.width = "100%";
        setTimeout(() => {
          progressContainer.style.display = "none";
        }, 500);
        takePhoto();
      }
    }, 100);
  }

  function takePhoto() {
    if (!video.srcObject) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 400;
    canvas.height = video.videoHeight || 300;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    photoResult.innerHTML = `<img src="${dataUrl}" style="max-width:100%;border-radius:8px;" />`;

    // Bild als JPEG-Blob per FormData an die API senden
    const now = new Date().toISOString().replace(/[-T:.Z]/g, "");
    const form = new FormData();
    form.append("action_submit", "Submit");
    canvas.toBlob((blob) => {
      if (blob) {
        form.append("Image", blob, `${now}.jpg`);
        fetch("https://halloweenhaus-schmalenbeck.de/api/BoothImageEntryForm", {
          method: "POST",
          body: form,
        })
          .then((response) => response.json())
          .then((data) => {
            console.log("Image saved:", data);
          })
          .catch((error) => console.error("Error saving image:", error));
      }
    }, "image/jpeg");
  }

  document.getElementById("back-btn").addEventListener("click", function () {
    ws.close();
    window.location.href = "index.html";
  });

  // Kamera-Vorschau und Auswahl
  let currentStream = null;
  let videoDevices = [];
  const video = document.getElementById("camera-preview");
  const select = document.getElementById("camera-select");
  const photoResult = document.getElementById("photo-result");

  // Geräte auflisten
  navigator.mediaDevices.enumerateDevices().then((devices) => {
    videoDevices = devices.filter((device) => device.kind === "videoinput");
    select.innerHTML = "";
    videoDevices.forEach((device, idx) => {
      const option = document.createElement("option");
      option.value = device.deviceId;
      option.text = device.label || `Kamera ${idx + 1}`;
      select.appendChild(option);
    });
    if (videoDevices.length > 0) {
      startCamera(videoDevices[0].deviceId);
    }
  });

  select.addEventListener("change", function () {
    startCamera(select.value);
  });

  function startCamera(deviceId) {
    if (currentStream) {
      currentStream.getTracks().forEach((track) => track.stop());
    }

    navigator.mediaDevices
      .getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1920 }, // Breite idealerweise auf 1920 setzen
          height: { ideal: 1080 }, // Höhe idealerweise auf 1080 setzen
        },
      })
      .then((stream) => {
        currentStream = stream;
        video.srcObject = stream;
      })
      .catch((err) => {
        if (err.name === "OverconstrainedError") {
          console.warn(
            "Spezifische Kamera konnte nicht geöffnet werden, versuche Standardkamera..."
          );
          navigator.mediaDevices
            .getUserMedia({ video: true })
            .then((stream) => {
              currentStream = stream;
              video.srcObject = stream;
            })
            .catch((e2) => {
              console.error("Kamera-Fehler (Fallback):", e2);
              alert("Keine Kamera verfügbar oder Berechtigung verweigert.");
            });
        } else {
          console.error("Kamera-Fehler:", err);
          alert("Kamera-Fehler: " + err.message);
        }
      });
  }

  // Foto aufnehmen
  document
    .getElementById("take-photo-btn")
    .addEventListener("click", function () {
      takePhoto();
    });
});
