(function () {
  function toBase64(u8) {
    return btoa(u8.reduce(
      function (data, byte) {
          return data + String.fromCharCode(byte);
      },
      ''
    ));
  }

  async function checkSha1(source, expectedSha1) {
    var actualSha1 = new Uint8Array(await crypto.subtle.digest('SHA-1', source));
    if (actualSha1.length != expectedSha1.length) {
      return false;
    }
    for (var i = 0; i < actualSha1.length; ++i) {
      if (actualSha1[i] != expectedSha1[i]) {
        return false;
      }
    }
    return true;
  }

  function rc4Plus(key, data) {
    var s = [], j = 0, x, res = '';
    for (var i = 0; i < 256; i++) {
      s[i] = i;
    }
    for (i = 0; i < 256; i++) {
      j = (j + s[i] + key.charCodeAt(i % key.length)) & 255;
      x = s[i];
      s[i] = s[j];
      s[j] = x;
    }
    i = 0;
    j = 0;
    for (var y = 0; y < data.length; y++) {
      i = (i + 1) & 255;
      var a = s[i];
      j = (j + a) & 255;
      var b = s[j];
      s[i] = b;
      s[j] = a;
      var c = (s[((i<<5)^(j>>3)) & 255] + s[((j<<5)^(i>>3)) & 255]) & 255;
      data[y] = data[y] ^ (((s[(a+b) & 255] + s[c^0xAA]) ^ s[(j+b) & 255]) & 255);
    }
  }

  var invalidKeyAlertSent = false;
  function sendInvalidKeyAlert() {
    if (!invalidKeyAlertSent) {
      invalidKeyAlertSent = true;
      alert("Invalid key!");
    }
  }

  function reloadImage(event) {
    var container = event.currentTarget;
    container.removeEventListener("click", reloadImage);
    loadImage(container);
  }

  function navigate(event) {
    var container = event.currentTarget;
    window.location.href = container.dataset.innerImgLink;
  }

  function loadImage(container) {
    var key = window.location.hash;
    if (key == "") {
      sendInvalidKeyAlert();
      return;
    }
    key = key.substring(1);
    var req = new XMLHttpRequest();
    req.open("GET", container.dataset.innerImgPath, true);
    req.responseType = "arraybuffer";
    req.onloadend = async function (event) {
      if (req.status != 200) {
        container.innerHTML = "Failed to load. Click to retry.";
        container.addEventListener("click", reloadImage);
        return;
      }
      var arrayBuffer = req.response;
      if (arrayBuffer) {
        var byteArray = new Uint8Array(arrayBuffer, 20);
        rc4Plus(key, byteArray);
        var valid = await checkSha1(byteArray, new Uint8Array(arrayBuffer, 0, 20));
        if (!valid) {
          sendInvalidKeyAlert();
          return;
        }
        var img = document.createElement('img');
        img.src = 'data:image/jpeg;base64, ' + toBase64(byteArray);
        container.innerHTML = "";
        container.appendChild(img);
      }
      if (container.dataset.innerImgLink != null) {
        container.addEventListener("click", navigate);
      }
    };
    container.innerHTML = "Loading ...";
    req.send(null);
  }

  function preserveScrollOffset() {
    window.addEventListener('unload', function(event) {
      var scrollOffset = {'x': window.scrollX, 'y': window.scrollY};
      window.sessionStorage.setItem('scrollOffset:' + window.location.href, JSON.stringify(scrollOffset));
    });
    var scrollOffsetString = window.sessionStorage.getItem('scrollOffset:' + window.location.href);
    if (scrollOffsetString != null) {
      var scrollOffset = JSON.parse(scrollOffsetString);
      window.scrollTo(scrollOffset.x, scrollOffset.y);
    }
  }

  window.loadImage = loadImage;
  window.preserveScrollOffset = preserveScrollOffset;
})();
