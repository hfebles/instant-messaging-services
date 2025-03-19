const express = require('express');
const router = express.Router();
const { createReadStream } = require('fs');
const { join } = require('path');
const whatsappController = require('../controllers/whatsappController');

router.post('/webhook', whatsappController.webhook);
router.post('/send', whatsappController.sendMessage);
router.get('/', (req, res) => {
  return res.send({ message: 'hola' });
});

router.get('/get-qr', async (_, res) => {
  const YOUR_PATH_QR = join(process.cwd(), `./qr.png`);
  const fileStream = createReadStream(YOUR_PATH_QR);
  res.writeHead(200, { 'Content-Type': 'image/png' });
  fileStream.pipe(res);
});

module.exports = router;
