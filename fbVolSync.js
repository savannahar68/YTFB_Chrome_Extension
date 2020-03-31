const get = key => new Promise(resolve => {
    chrome.storage.sync.get(key, items => {
    resolve(items[key]);
});
});

const set = items => new Promise(resolve => {
    chrome.storage.sync.set(items, resolve);
});



let desiredVolume = 0.5;
let allVideos = [...document.getElementsByTagName('video')];

const updateVideos = () => {
  allVideos.forEach(video => {
    video.volume = desiredVolume;
  });
};

const persistVolume = () => {
  set({ desiredVolume });};

const handleVolumeChange = event => {
  desiredVolume = event.target.volume;
  updateVideos();

  persistVolume();
};

const observer = new MutationObserver(mutations => {
  const addedVideos = mutations.reduce((accumulator, mutation) => {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      const videos = [...mutation.addedNodes]
        .filter(({ tagName }) => tagName && tagName.toLowerCase() === 'div')
        .map(node => node.getElementsByTagName('video'))
        .filter(collection => collection.length)
        .flatMap(video => [...video]);

      if (videos.length > 0) {
        accumulator.push(...videos);
      }
    }
    return accumulator;
  }, []);

  if (addedVideos.length) {
    allVideos = [...new Set([...allVideos, ...addedVideos])];

    allVideos.forEach(video => {
      video.volume = desiredVolume;
      video.removeEventListener('volumechange', handleVolumeChange);
      video.addEventListener('volumechange', handleVolumeChange);
    });
  }
});

(async function main() {
    desiredVolume = await get('desiredVolume') || 0.5;
  
    updateVideos();
    observer.observe(document, { childList: true, subtree: true });
  }());