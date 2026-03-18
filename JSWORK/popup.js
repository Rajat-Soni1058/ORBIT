const bottomBtn = document.getElementById("bottomBtn");
const timerUI = document.getElementById("timerUI");
const startBtn = document.getElementById("startBtn");
const countdown = document.getElementById("countdown");
const input = document.getElementById("time");

let interval = null;
let totalSeconds = 0;
let running = false;

// Show / Reset logic
bottomBtn.addEventListener("click", () => {

  if (!running) {
    timerUI.style.display = "block";
  } else {
    // 🔥 CANCEL BACKGROUND TIMER
    chrome.runtime.sendMessage({
      action: "cancelTimer"
    });

    // stop UI timer
    clearInterval(interval);
    running = false;

    // reset UI
    countdown.innerText = "";
    input.style.display = "block";
    startBtn.style.display = "inline-block";
    startBtn.innerText = "Start";
    startBtn.disabled = false;

    bottomBtn.innerText = "Set Timer";
  }
});


// Start Timer
startBtn.addEventListener("click", () => {

  let minutes = input.value;

  if (!minutes || minutes <= 0) {
    alert("Enter valid time");
    return;
  }

  // 🔥 FIRST cancel any existing timer
  chrome.runtime.sendMessage({
    action: "cancelTimer"
  });

  totalSeconds = Math.floor(minutes * 60);
  running = true;

  // 🔥 START NEW TIMER
  chrome.runtime.sendMessage({
    action: "startTimer",
    time: parseFloat(minutes)
  });

  // UI change
  input.style.display = "none";
  startBtn.style.display = "none";
  bottomBtn.innerText = "Reset Timer";

  updateDisplay();

  interval = setInterval(() => {

    totalSeconds--;
    updateDisplay();

    if (totalSeconds <= 0) {
  clearInterval(interval);

  countdown.innerText = "00:00";
  running = false;

  // 🔥 RESTORE UI
  input.style.display = "block";
  startBtn.style.display = "inline-block";
  startBtn.innerText = "Start";
  startBtn.disabled = false;

  bottomBtn.innerText = "Set Timer";
}

  }, 1000);
});


// Update countdown UI
function updateDisplay() {
  let min = Math.floor(totalSeconds / 60);
  let sec = totalSeconds % 60;

  countdown.innerText =
    `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}