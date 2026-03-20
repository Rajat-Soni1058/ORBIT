const bottomBtn = document.getElementById("bottomBtn");
const timerUI = document.getElementById("timerUI");
const startBtn = document.getElementById("startBtn");
const countdown = document.getElementById("countdown");
const input = document.getElementById("time");
const messageInput = document.getElementById("customMessage");

const toggleBtn = document.getElementById("toggleRecommend");

let interval = null;
let totalSeconds = 0;
let running = false;


// LOAD STATE ON OPEN
window.onload = () => {

  chrome.storage.local.get(["endTime"], (data) => {

    if (data.endTime) {

      const remaining = Math.floor((data.endTime - Date.now()) / 1000);

      if (remaining > 0) {

        totalSeconds = remaining;
        running = true;

        timerUI.style.display = "block";
        input.style.display = "none";
        messageInput.style.display = "none";
        startBtn.style.display = "none";
        bottomBtn.innerText = "Reset Timer";

        startCountdown();
      }
    }
  });

  // Load toggle state safely
  if (toggleBtn) {
    chrome.storage.local.get("hideRecommended", (data) => {
      toggleBtn.innerText = data.hideRecommended
        ? "Show Recommendations"
        : "Hide Recommendations";
    });
  }
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

    countdown.innerText = "";
    input.style.display = "block";
    messageInput.style.display = "block";
    startBtn.style.display = "inline-block";
    startBtn.innerText = "Start";
    startBtn.disabled = false;

    bottomBtn.innerText = "Set Timer";
  }
});


// Start Timer
startBtn.addEventListener("click", () => {

  let minutes = input.value;
  let userMessage = messageInput.value.trim();

  if (!minutes || minutes <= 0) {
    alert("Enter valid time");
    return;
  }

  if (userMessage === "") {
    userMessage = "⏰ Time is over!";
  }

  chrome.runtime.sendMessage({ action: "cancelTimer" });

  totalSeconds = Math.floor(minutes * 60);
  running = true;

  chrome.runtime.sendMessage({
    action: "startTimer",
    time: parseFloat(minutes),
    message: userMessage
  });

  input.style.display = "none";
  messageInput.style.display = "none";
  startBtn.style.display = "none";
  bottomBtn.innerText = "Reset Timer";

  startCountdown();
});


// Countdown
function startCountdown() {

  clearInterval(interval);

  interval = setInterval(() => {

    totalSeconds--;

    if (totalSeconds <= 0) {
      clearInterval(interval);

      running = false;
      countdown.innerText = "";

      input.style.display = "block";
      messageInput.style.display = "block";
      startBtn.style.display = "inline-block";
      startBtn.innerText = "Start";

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



// TOGGLE RECOMMENDATIONS


if (toggleBtn) {

  toggleBtn.addEventListener("click", () => {

    chrome.storage.local.get("hideRecommended", (data) => {

      const newState = !data.hideRecommended;

      chrome.storage.local.set({
        hideRecommended: newState
      });

      toggleBtn.innerText = newState
        ? "Show Recommendations"
        : "Hide Recommendations";

      chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {

        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: "toggleRecommendations",
            hide: newState
          });
        });

      });

    });

  });

}
///////////// comment off------------>
const commentBtn = document.getElementById("toggleComments");

if (commentBtn) {

  // Load state
  chrome.storage.local.get("hideComments", (data) => {
    commentBtn.innerText = data.hideComments
      ? "Show Comments"
      : "Hide Comments";
  });

  // Click
  commentBtn.addEventListener("click", () => {

    chrome.storage.local.get("hideComments", (data) => {

      const newState = !data.hideComments;

      chrome.storage.local.set({
        hideComments: newState
      });

      commentBtn.innerText = newState
        ? "Show Comments"
        : "Hide Comments";

      chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {

        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: "toggleComments",
            hide: newState
          });
        });

      });

    });

  });

}