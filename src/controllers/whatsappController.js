const whatsappService = require('../services/whatsappService');

exports.webhook = async (req, res) => {
  // const { imbox, acc } = req.query;

  try {
    if (req.body.message_type == 'outgoing') {
      const body = req.body;
      console.log(req.query);

      const to = body.conversation.meta.sender.identifier;
      const message = body.content;

      await whatsappService.sendMessage(to, message);

      res.status(200).json({ status: 'success' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
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
