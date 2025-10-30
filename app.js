const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('captureBtn');
const saveBtn = document.getElementById('saveBtn');
const dismissBtn = document.getElementById('dismissBtn');
const toggleCameraBtn = document.getElementById('toggleCameraBtn');
const overlayPreview = document.getElementById('overlayPreview');
const overlayButtons = document.getElementById('overlayButtons');
const countdownEl = document.getElementById('countdown');
const context = canvas.getContext('2d');

const controls = document.getElementById('controls');
const videoContainer = document.getElementById('videoContainer');
const afterCaptureControls = document.getElementById('afterCaptureControls');

let currentOverlay = null;
let currentStream = null;
let currentDeviceId = null;
let videoDevices = [];

const overlays = [
    "overlay1.png",
    "overlay2.png",
];

countdownEl.style.opacity = 0;
afterCaptureControls.style.display = 'none';
canvas.style.display = 'none';

// Access the available devices
navigator.mediaDevices.enumerateDevices().then(devices => {
  videoDevices = devices.filter(device => device.kind === 'videoinput');
  if (videoDevices.length > 0) {
    currentDeviceId = videoDevices[0].deviceId;
    startCamera(currentDeviceId);
  }
}).catch(err => {
  console.error("Error accessing devices: ", err);
});
    
  // UI-Button zum Wechseln des Modus hinzufügen
  document.addEventListener('DOMContentLoaded', function() {
    const switchBtn = document.createElement('button');
    switchBtn.id = 'switch-mode-btn';
    switchBtn.textContent = 'Websocket-Modus aktivieren';
    document.body.appendChild(switchBtn);
        
    let websocketMode = false;
    let ws;
        
    switchBtn.addEventListener('click', function() {
      if (!websocketMode) {
        activateWebsocketMode();
      } else {
        deactivateWebsocketMode();
      }
    });
        
    function activateWebsocketMode() {
    // Leite auf die alternative HTML-Seite um
    window.location.href = 'websocket.html';
    }
        
    function deactivateWebsocketMode() {
      websocketMode = false;
      switchBtn.textContent = 'Websocket-Modus aktivieren';
      if (ws) {
        ws.close();
        ws = null;
      }
      // Ansicht zurücksetzen
      document.body.style.background = '';
    }
  });

// Function to start the camera stream
function startCamera(deviceId) {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
  }
  
  navigator.mediaDevices.getUserMedia({
    video: {
      deviceId: { exact: deviceId },
      width: 1000,
      height: 1000
    }
  }).then(stream => {
    currentStream = stream;
    video.srcObject = stream;
  }).catch(err => {
    console.error("Error starting camera: ", err);
  });
}

// Capture the image from the video stream after a countdown
captureBtn.addEventListener('click', () => {
    let countdown = 5;
    countdownEl.textContent = countdown;
    countdownEl.style.opacity = 1;

    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            countdownEl.textContent = countdown;
            countdownEl.style.opacity = 1;
        } else {
            clearInterval(countdownInterval);
            countdownEl.textContent = '';
            countdownEl.style.opacity = 0;
            controls.style.display = 'none';
            afterCaptureControls.style.display = 'flex';
            videoContainer.style.display = 'none';
            canvas.style.display = 'block';
            captureImage();
        }
    }, 1000);
});

function captureImage()
{
    // Ensure the canvas is square
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const squareSize = Math.min(videoWidth, videoHeight);

    // Calculate the top-left corner of the square region
    const cropX = (videoWidth - squareSize) / 2;
    const cropY = (videoHeight - squareSize) / 2;

    // Clear the canvas and set it to square size
    canvas.width = squareSize;
    canvas.height = squareSize;

    // Draw the square region from the video onto the canvas
    context.drawImage(video, cropX, cropY, squareSize, squareSize, 0, 0, canvas.width, canvas.height);

    // Apply the overlay if available
    if (currentOverlay) {
        applyOverlay(currentOverlay);
    }
}

// Function to load overlays dynamically
function loadOverlays() {
    const overlayFolder = 'filters'; // Folder where overlays are stored

    overlays.forEach((overlay, index) => {
        const btn = document.createElement('button');
        btn.classList.add('overlay-btn');
        btn.classList.add('notused');
        btn.setAttribute('data-overlay', `${overlayFolder}/${overlay}`);
        btn.addEventListener('click', () => {
            currentOverlay = btn.getAttribute('data-overlay');
            btn.classList.remove('notused');
            
            // Show the overlay on the video feed
            overlayPreview.src = currentOverlay;
            overlayPreview.style.display = 'block';
        });
        
        //Set the overlay as an image on the button
        const img = document.createElement('img');
        img.src = `${overlayFolder}/${overlay}`;
        btn.appendChild(img);
        
        overlayButtons.appendChild(btn);
    });
}

// Call the loadOverlays function to create overlay buttons
loadOverlays();

// Apply the overlay to the final captured image
function applyOverlay(overlaySrc) {
  const overlayImage = new Image();
  overlayImage.src = overlaySrc;
  overlayImage.onload = () => {
    context.drawImage(overlayImage, 0, 0, canvas.width, canvas.height);
  };
}

// Toggle between cameras
/*toggleCameraBtn.addEventListener('click', () => {
  const currentIndex = videoDevices.findIndex(device => device.deviceId === currentDeviceId);
  const nextIndex = (currentIndex + 1) % videoDevices.length;
  currentDeviceId = videoDevices[nextIndex].deviceId;
  startCamera(currentDeviceId);
});*/

// Save the image
saveBtn.addEventListener('click', () => {
    const imageDataURL = canvas.toDataURL('image/png');
    // Send this data URL to the server to save in the database
    console.log(imageDataURL); // For testing
    
    resetCamera();

    // Example: Sending the image to a server
    // fetch('/save-image', {
    //   method: 'POST',
    //   body: JSON.stringify({ image: imageDataURL }),
    //   headers: { 'Content-Type': 'application/json' }
    // }).then(response => response.json())
    // .then(data => console.log('Image saved:', data))
    // .catch(error => console.error('Error saving image:', error));
});

dismissBtn.addEventListener('click', () => {
    resetCamera();
});

function resetCamera() {
    canvas.style.display = 'none';
    afterCaptureControls.style.display = 'none';
    controls.style.display = 'flex';
    videoContainer.style.display = 'block';
    const allOverlayButtons = document.querySelectorAll('.overlay-btn');
    allOverlayButtons.forEach(button => button.classList.add('notused'));
}
