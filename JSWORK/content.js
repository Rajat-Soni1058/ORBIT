console.log("✅ content.js loaded");

chrome.runtime.onMessage.addListener((msg) => {

  if (msg.action === "pauseVideo") {

    let video = document.querySelector("video");

    if (video) {
      video.pause();
      console.log("⏸ Video paused");
    }
  }

  // 🔔 ADD THIS BLOCK (DO NOT REMOVE ANYTHING ABOVE)
  if (msg.action === "timeOverAlert") {
    alert("⏰ Set Time Has Over");
  }

});