console.log("backgroundが起動した");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "fetchPage") return;

  fetch(message.url, { credentials: "omit" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.text();
    })
    .then((html) => {
      sendResponse({ html });
    })
    .catch((error) => {
      sendResponse({ error: error.message });
    });

  return true;
});