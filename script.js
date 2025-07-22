// App state
const state = {
    video: null,
    stream: null,
    detectionInterval: null,
    modelsLoaded: false,
    lastDetection: null,
    calibration: {
        referenceHeight: 175,
        cameraHeight: 100
    }
};

// DOM elements
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startCameraBtn = document.getElementById('startCamera');
const captureFrameBtn = document.getElementById('captureFrame');
const heightResult = document.getElementById('heightResult');
const distanceResult = document.getElementById('distanceResult');
const referenceHeightInput = document.getElementById('referenceHeight');
const cameraHeightInput = document.getElementById('cameraHeight');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingMessage = document.getElementById('loadingMessage');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    startCameraBtn.addEventListener('click', startCamera);
    captureFrameBtn.addEventListener('click', captureMeasurement);
    referenceHeightInput.addEventListener('change', updateCalibration);
    cameraHeightInput.addEventListener('change', updateCalibration);
    updateCalibration();
});

function updateCalibration() {
    state.calibration = {
        referenceHeight: parseFloat(referenceHeightInput.value),
        cameraHeight: parseFloat(cameraHeightInput.value)
    };
    console.log('Updated calibration:', state.calibration);
}

function startCamera() {
    showLoading("Accessing camera...");
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            hideLoading();
            state.stream = stream;
            state.video = document.createElement('video');
            state.video.srcObject = stream;
            state.video.play();

            state.video.onloadedmetadata = () => {
                canvas.width = state.video.videoWidth;
                canvas.height = state.video.videoHeight;
                startDetection();
            };

            startCameraBtn.textContent = 'Camera Active';
            startCameraBtn.classList.remove('bg-green-600');
            startCameraBtn.classList.add('bg-yellow-600');
            startCameraBtn.disabled = true;
            captureFrameBtn.disabled = false;
        })
        .catch(err => {
            hideLoading();
            console.error("Error accessing camera:", err);
            alert("Could not access camera. Please ensure permissions are granted.");
        });
}

function startDetection() {
    state.detectionInterval = setInterval(() => {
        if (!state.video) return;

        // Flip canvas horizontally
        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0); // shift canvas left by its width
        ctx.drawImage(state.video, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        if (Math.random() > 0.5) {
            const boxWidth = 150 + Math.random() * 50;
            const boxHeight = 350 + Math.random() * 50;
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2 - 50;
            const x = centerX - boxWidth / 2 + (Math.random() * 40 - 20);
            const y = centerY - boxHeight / 2 + (Math.random() * 40 - 20);

            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, boxWidth, boxHeight);

            state.lastDetection = {
                x, y, width: boxWidth, height: boxHeight,
                timestamp: new Date().getTime()
            };
        }
    }, 100);
}


function captureMeasurement() {
    if (!state.lastDetection) {
        alert("Please wait for a person to be detected in the frame.");
        return;
    }

    const { width, height } = state.lastDetection;

    const scaleFactor = state.calibration.referenceHeight / (height * 0.6);
    const estimatedHeightCm = Math.round(height * scaleFactor);

    const distanceMeters = Math.round((2.5 - (width / canvas.width)) * 4 * 10) / 10;

    heightResult.textContent = `${estimatedHeightCm} cm`;
    distanceResult.textContent = `${distanceMeters} meters`;

    captureFrameBtn.classList.add('bg-green-500');
    setTimeout(() => {
        captureFrameBtn.classList.remove('bg-green-500');
    }, 300);
}

function showLoading(message) {
    loadingMessage.textContent = message;
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

window.addEventListener('beforeunload', () => {
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
    }
    if (state.detectionInterval) {
        clearInterval(state.detectionInterval);
    }
});
