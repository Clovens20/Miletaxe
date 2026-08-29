/** WebView + Tesseract, chiffres seulement. */
export const ON_DEVICE_ODOMETER_OCR_HTML = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js"></script>
  </head>
  <body>
    <script>
      let workerPromise = null;

      function send(payload) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }

      async function getWorker() {
        if (!workerPromise) {
          workerPromise = Tesseract.createWorker('eng', 1);
        }
        return workerPromise;
      }

      async function recognizeOnce(worker, dataUrl, psm) {
        await worker.setParameters({
          tessedit_char_whitelist: '0123456789',
          tessedit_pageseg_mode: String(psm),
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
          const dataUrl = 'data:image/jpeg;base64,' + imageBase64;
          // Deux modes : épars et bloc. Une seule ligne colle souvent plage + total.
          const sparse = await recognizeOnce(worker, dataUrl, 11);
          const block = await recognizeOnce(worker, dataUrl, 6);
          const text = [sparse.text, block.text].filter(Boolean).join('\\n');
          const confidence = Math.max(sparse.confidence || 0, block.confidence || 0);
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
