/* MediaPipe Face Landmarker: mede abertura normalizada dos olhos e da boca. */
const FaceDetector = (() => {
  let landmarker, running = false, lastVideoTime = -1, onFrame;
  const p = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);
  const ratio = (lm, top, bottom, left, right) => p(lm[top],lm[bottom]) / Math.max(p(lm[left],lm[right]), .0001);
  async function load(video, callback) {
    const { FaceLandmarker, FilesetResolver } = window;
    const files = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm');
    landmarker = await FaceLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task', delegate: 'GPU' }, runningMode:'VIDEO', numFaces:1 });
    onFrame = callback; running = true; requestAnimationFrame(() => loop(video));
  }
  function loop(video) {
    if (!running) return;
    if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const result = landmarker.detectForVideo(video, performance.now());
      const lm = result.faceLandmarks?.[0];
      if (lm) onFrame({ landmarks: lm, leftEye: ratio(lm,159,145,33,133), rightEye: ratio(lm,386,374,362,263), mouth: ratio(lm,13,14,78,308) });
      else onFrame(null);
    }
    requestAnimationFrame(() => loop(video));
  }
  function stop(){ running=false; }
  return { load, stop };
})();
