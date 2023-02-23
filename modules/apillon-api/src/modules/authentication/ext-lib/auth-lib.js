window.addEventListener('load', event => {
  let authPlaceholder = document.getElementById('apillon');

  var button = document.createElement('button');
  button.innerText = 'APILLON AUTH';
  button.addEventListener('click', function () {
    openPopup();
  });
  authPlaceholder.appendChild(button);

  function openPopup() {
    const newWindow = window.open(
      'http://localhost:5173/?embedded=1',
      'Auth Form',
      'height=600, width=480,resizable=no'
    );

    // VERIFICATION EVENT LISTENER
    window.addEventListener(
      'message',
      event => {
        console.log('Verification event ...');
        const ev = new CustomEvent('authentication', { detail: event.data });

        // Dispatch the event.
        window.dispatchEvent(ev);
        if (event.data.success) {
          newWindow.close();
        }
      },
      false
    );
  }
});