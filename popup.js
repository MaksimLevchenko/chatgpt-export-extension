'use strict';

document.addEventListener('click', (event) => {
  const button = event.target.closest('.link-button');
  if (!button) return;

  const url = button.dataset.url;
  if (!url) return;

  chrome.tabs.create({ url });
});
