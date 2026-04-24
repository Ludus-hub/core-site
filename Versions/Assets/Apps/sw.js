importScripts("/scramjet/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

async function handleRequest(event) {
  await scramjet.loadConfig();
  
  // If the request is meant for the proxy, let Scramjet handle it
  if (scramjet.route(event)) {
    return scramjet.fetch(event);
  }
  
  // Otherwise, load it normally
  return fetch(event.request);
}

self.addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event));
});