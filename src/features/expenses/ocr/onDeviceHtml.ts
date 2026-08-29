/** OCR reçu dans une WebView cachée. Une passe texte, une passe chiffres. */
export const ON_DEVICE_RECEIPT_OCR_HTML = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js"></script>
  </head>
  <body>
    <script>
      let workerPromise = null;
      var LETTERS =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZàâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ0123456789$.,:/-# ";
      var DIGITS = "0123456789$.,:/-";

      function send(payload) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }

      async function getWorker() {
        if (!workerPromise) {
          workerPromise = Tesseract.createWorker('fra+eng', 1);
        }
        return workerPromise;
      }

      function toDataUrl(base64) {
        if (base64.indexOf('iVBOR') === 0) return 'data:image/png;base64,' + base64;
        return 'data:image/jpeg;base64,' + base64;
      }

      function preprocessForDigits(dataUrl) {
        return new Promise(function (resolve, reject) {
          var img = new Image();
          img.onload = function () {
            var maxPixels = 3500000;
            var scale = Math.min(2.2, Math.sqrt(maxPixels / Math.max(img.width * img.height, 1)));
            var canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            var ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            var image = ctx.getImageData(0, 0, canvas.width, canvas.height);
            var d = image.data;
            var w = canvas.width;
            var h = canvas.height;
            var bin = new Uint8Array(w * h);
            for (var i = 0, p = 0; i < d.length; i += 4, p++) {
              var v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
              v = (v - 128) * 2.8 + 128;
              // Le trait dans un 0 thermique part souvent avec ce seuil.
              bin[p] = v > 158 ? 1 : 0;
            }
            var cleaned = new Uint8Array(bin);
            for (var y = 1; y < h - 1; y++) {
              for (var x = 1; x < w - 1; x++) {
                var idx = y * w + x;
                if (bin[idx] === 1) continue;
                var n = 0;
                for (var dy = -1; dy <= 1; dy++) {
                  for (var dx = -1; dx <= 1; dx++) {
                    if (!dx && !dy) continue;
                    if (bin[(y + dy) * w + (x + dx)] === 0) n++;
                  }
                }
                if (n <= 1) cleaned[idx] = 1;
              }
            }
            for (var j = 0, q = 0; j < d.length; j += 4, q++) {
              var pix = cleaned[q] ? 255 : 0;
              d[j] = d[j + 1] = d[j + 2] = pix;
              d[j + 3] = 255;
            }
            ctx.putImageData(image, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          };
          img.onerror = function () {
            reject(new Error('preprocess_failed'));
          };
          img.src = dataUrl;
        });
      }

      async function recognizeOnce(worker, dataUrl, psm, whitelist, numeric) {
        await worker.setParameters({
          tessedit_char_whitelist: whitelist,
          tessedit_pageseg_mode: String(psm),
          classify_bln_numeric_mode: numeric ? '1' : '0',
        });
        const result = await worker.recognize(dataUrl);
        return {
          text: result.data && result.data.text ? String(result.data.text) : '',
          confidence: result.data && typeof result.data.confidence === 'number'
            ? result.data.confidence / 100
            : 0,
        };
      }

      window.__miletaxRecognize = async function (payload) {
        try {
          const imageBase64 = payload && payload.imageBase64;
          if (!imageBase64) {
            send({ ok: false, error: 'missing_image' });
            return;
          }
          const worker = await getWorker();
          const originalUrl = toDataUrl(imageBase64);
          let binaryUrl = originalUrl;
          try {
            binaryUrl = await preprocessForDigits(originalUrl);
          } catch (error) {
            binaryUrl = originalUrl;
          }
          const words = await recognizeOnce(worker, originalUrl, 4, LETTERS, false);
          const digits = await recognizeOnce(worker, binaryUrl, 6, DIGITS, true);
          const extraDigits = await recognizeOnce(worker, binaryUrl, 4, DIGITS, true);
          const text = [words.text, digits.text, extraDigits.text].filter(Boolean).join('\\n');
          const confidence = Math.max(words.confidence || 0, digits.confidence || 0, extraDigits.confidence || 0);
          send({ ok: true, text: text, confidence: confidence });
        } catch (error) {
          send({ ok: false, error: String(error) });
        }
      };

      getWorker()
        .then(function () {
          send({ ok: true, ready: true });
        })
        .catch(function (error) {
          send({ ok: false, error: String(error) });
        });
    </script>
  </body>
</html>`;
