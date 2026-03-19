const bottomBtn = document.getElementById("bottomBtn");
const timerUI = document.getElementById("timerUI");
const startBtn = document.getElementById("startBtn");
const countdown = document.getElementById("countdown");
const input = document.getElementById("time");

// 🔥 NEW (message input)
const messageInput = document.getElementById("customMessage");

let interval = null;
let totalSeconds = 0;
let running = false;


// 🔥 LOAD STATE ON OPEN
window.onload = () => {

  chrome.storage.local.get(["endTime"], (data) => {

    if (data.endTime) {

      const remaining = Math.floor((data.endTime - Date.now()) / 1000);

      if (remaining > 0) {

        totalSeconds = remaining;
        running = true;

        timerUI.style.display = "block";
        input.style.display = "none";
        messageInput.style.display = "none"; // 🔥 added
        startBtn.style.display = "none";
        bottomBtn.innerText = "Reset Timer";

        startCountdown();
      }
    }
  });
};


// Show / Reset logic
bottomBtn.addEventListener("click", () => {

  if (!running) {
    timerUI.style.display = "block";
  } else {

    chrome.runtime.sendMessage({
      action: "cancelTimer"
    });

    chrome.storage.local.remove("endTime");

    clearInterval(interval);
    running = false;

    // reset UI
    countdown.innerText = "";
    input.style.display = "block";
    messageInput.style.display = "block"; // 🔥 added
    startBtn.style.display = "inline-block";
    startBtn.innerText = "Start";
    startBtn.disabled = false;

    bottomBtn.innerText = "Set Timer";
  }
});


// Start Timer
startBtn.addEventListener("click", () => {

  let minutes = input.value;

  // 🔥 GET MESSAGE
  let userMessage = messageInput.value.trim();

  if (!minutes || minutes <= 0) {
    alert("Enter valid time");
    return;
  }

  // 🔥 DEFAULT MESSAGE
  if (userMessage === "") {
    userMessage = "⏰ Time is over!";
  }

  chrome.runtime.sendMessage({ action: "cancelTimer" });

  totalSeconds = Math.floor(minutes * 60);
  running = true;

  // 🔥 SEND MESSAGE ALSO
  chrome.runtime.sendMessage({
    action: "startTimer",
    time: parseFloat(minutes),
    message: userMessage
  });

  // UI change
  input.style.display = "none";
  messageInput.style.display = "none"; // 🔥 added
  startBtn.style.display = "none";
  bottomBtn.innerText = "Reset Timer";

  startCountdown();
});


// 🔥 COUNTDOWN FUNCTION
function startCountdown() {

  clearInterval(interval);

  interval = setInterval(() => {

    totalSeconds--;

    if (totalSeconds <= 0) {
      clearInterval(interval);

      running = false;
      countdown.innerText = "";

      input.style.display = "block";
      messageInput.style.display = "block"; // 🔥 added
      startBtn.style.display = "inline-block";
      startBtn.innerText = "Start";
      startBtn.disabled = false;

      bottomBtn.innerText = "Set Timer";

      return;
    }

    updateDisplay();

  }, 1000);
}


// Update UI
function updateDisplay() {
  let min = Math.floor(totalSeconds / 60);
  let sec = totalSeconds % 60;

  countdown.innerText =
    `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}