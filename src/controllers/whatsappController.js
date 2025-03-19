const whatsappService = require('../services/whatsappService');
const axios = require('axios');

exports.webhook = async (req, res) => {
  const body = req.body;
  let msg = {};
  if (body.message_type == 'outgoing') {
    const to = body.conversation.meta.sender.identifier;

    if (body.attachments) {
      const attach = body.attachments[0];
      const parsedUrl = attach.data_url;
      switch (attach.file_type) {
        case 'file':
          const doc = await axios
            .get(attach.data_url, { responseType: 'arraybuffer' })
            .then((response) => {
              const buffer = Buffer.from(response.data, 'binary');
              return buffer;
            })
            .catch((err) => {
              console.error(err);
            });
          msg.document = doc;
          msg.fileName = parsedUrl.split('/', -1)[8];
          msg.mimetype = 'application/pdf';
          break;

        default:
          if (body.content) {
            msg.image = {
              url: attach.data_url,
            };
            msg.caption = body.content;
          }
          msg.image = {
            url: attach.data_url,
          };
          break;
      }
    } else {
      msg = { text: body.content };
    }

    await whatsappService.sendMessage(to, msg);
    res.status(200).json({ status: 'success' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { to, message } = req.body;
    await whatsappService.sendMessage(to, message);
    res.status(200).json({ status: 'success' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
