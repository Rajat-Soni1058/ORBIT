//---------GLOBAL STATE (YOUTUBE TAB TRACKING)------------>
let youtubeTabId = null;



//---------MESSAGE LISTENER FEATURE (START + CANCEL TIMER)------------>
chrome.runtime.onMessage.addListener((msg) => {

  //---------START TIMER------------>
  if (msg.action === "startTimer") {

    chrome.alarms.clear("timerAlarm");

    // store end time
    const endTime = Date.now() + msg.time * 60 * 1000;

    // store timer data at chrome local 
    chrome.storage.local.set({
      endTime: endTime,
      userMessage: msg.message
    });

    chrome.alarms.create("timerAlarm", {
      delayInMinutes: msg.time
    });

    console.log("⏱ Timer started");
  }


  //---------CANCEL TIMER------------>
  if (msg.action === "cancelTimer") {

    chrome.alarms.clear("timerAlarm");

    // remove stored data
    chrome.storage.local.remove(["endTime", "userMessage"]);

    youtubeTabId = null;

    console.log("❌ Timer cancelled");
  }

});



//---------ALARM FEATURE (WHEN TIMER FINISHES)------------>
chrome.alarms.onAlarm.addListener((alarm) => {

  if (alarm.name === "timerAlarm") {

    //---------GET STORED MESSAGE------------>
    chrome.storage.local.get("userMessage", (data) => {

      const finalMessage = data.userMessage || "⏰ Time is over!";


      //---------SHOW NOTIFICATION------------>
      chrome.notifications.create({
        type: "basic",
        iconUrl: "ClockImage.png",
        title: "⏰ Time Over",
        message: finalMessage
      }, (id) => {

        if (chrome.runtime.lastError) {
          console.log("❌ Notification Error:", chrome.runtime.lastError.message);
        } else {
          console.log("✅ Notification shown:", id);
        }

      });


      //---------YOUTUBE CONTROL (PAUSE + ALERT)------------>
      chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {

        if (tabs.length === 0) {
          console.log("❌ No YouTube tab found");
          return;
        }

        tabs.forEach(tab => {

          // pause video
          chrome.tabs.sendMessage(tab.id, {
            action: "pauseVideo"
          });

          // show alert on page
          chrome.tabs.sendMessage(tab.id, {
            action: "timeOverAlert",
            message: finalMessage
          });

        });

      });


      //---------CLEANUP STORAGE------------>
      chrome.storage.local.remove(["endTime", "userMessage"]);

    });

  }
});

// ---------- FORWARD MODEL REQUESTS FROM POPUP (AVOIDS POPUP CORS ISSUES) ----------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === 'analyzeBatch' && Array.isArray(msg.batch) && msg.apiUrl) {
    (async () => {
      try {
        const res = await fetch(msg.apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comments: msg.batch })
        });

        const text = await res.text();
        let json = null;
        try { json = text ? JSON.parse(text) : null; } catch (e) { json = text; }

        if (!res.ok) {
          sendResponse({ ok: false, status: res.status, statusText: res.statusText, body: json });
          return;
        }

        sendResponse({ ok: true, body: json });
      } catch (err) {
        sendResponse({ ok: false, error: String(err) });
      }
    })();

    return true; // will respond asynchronously
  }

  // other messages
});