(function() {
  var botId = document.currentScript.getAttribute('data-bot-id');
  if (!botId) {
    console.error('ChatWidget: Missing data-bot-id attribute on script tag.');
    return;
  }

  // Create iframe container
  var container = document.createElement('div');
  container.id = 'chatdesk-widget-container';
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.width = '380px';
  container.style.height = '600px';
  container.style.maxWidth = '90vw';
  container.style.maxHeight = '90vh';
  container.style.zIndex = '999999';
  container.style.pointerEvents = 'none'; // so it doesn't block clicks when closed
  container.style.border = 'none';
  container.style.overflow = 'hidden';
  container.style.transition = 'all 0.3s ease-in-out';

  // Create iframe
  var iframe = document.createElement('iframe');
  // Pass the current page URL to the iframe so the bot knows where the visitor is
  var currentUrl = encodeURIComponent(window.location.href);
  iframe.src = 'http://localhost:3000/widget/' + botId + '?url=' + currentUrl;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.pointerEvents = 'auto'; // allow clicks inside iframe
  iframe.style.backgroundColor = 'transparent';
  iframe.allow = 'camera; microphone; fullscreen; display-capture; picture-in-picture';

  container.appendChild(iframe);
  document.body.appendChild(container);

  // Listen for messages from iframe to resize container
  window.addEventListener('message', function(event) {
    if (event.origin !== 'http://localhost:3000') return;

    if (event.data === 'chatdesk-minimize') {
      container.style.width = '80px';
      container.style.height = '80px';
      container.style.bottom = '20px';
      container.style.right = '20px';
    } else if (event.data === 'chatdesk-expand') {
      container.style.width = '380px';
      container.style.height = '600px';
      container.style.bottom = '20px';
      container.style.right = '20px';
    } else if (event.data === 'chatdesk-maximize') {
      container.style.width = '95vw';
      container.style.height = '95vh';
      container.style.bottom = '2.5vh';
      container.style.right = '2.5vw';
    } else if (event.data === 'chatdesk-cancel') {
      container.style.display = 'none';
    }
  });

  // Start minimized
  container.style.width = '80px';
  container.style.height = '80px';
})();
