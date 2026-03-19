console.log("✅ content.js loaded");

chrome.runtime.onMessage.addListener((msg) => {

  if (msg.action === "pauseVideo") {

    let video = document.querySelector("video");

    if (video) {
      video.pause();
      console.log("⏸ Video paused");
    }
  }

  // 🔔 UPDATED (USE MESSAGE FROM BACKGROUND)
  if (msg.action === "timeOverAlert") {
    if(msg.message){
    alert(  "📢))) "+msg.message);
    }
  else {
    alert( "🚨 STOP WATCHING, Your Set Time is over!");
    
  }
  }

});