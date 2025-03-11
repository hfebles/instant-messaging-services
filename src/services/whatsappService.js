const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
} = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const chatwootService = require('./chatwootService');

class WhatsAppService {
  constructor() {
    this.sock = null;
    this.contactsCache = new Map();
    this.conversationsCache = new Map();
  }

  async initialize() {
    const { state, saveCreds } = await useMultiFileAuthState('sessions');

    this.sock = makeWASocket({
      printQRInTerminal: true,
      auth: state,
      defaultQueryTimeoutMs: undefined,
    });

    this.sock.ev.on(
      'connection.update',
      this.handleConnectionUpdate.bind(this)
    );
    this.sock.ev.on('creds.update', saveCreds);
    this.sock.ev.on('messages.upsert', this.handleMessage.bind(this));
  }

  async handleConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      await QRCode.toFile('./qr.png', qr);
      console.log('⚡ QR Code generado en qr.png');
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;
      console.log(
        '⚡ Conexión cerrada debido a ',
        lastDisconnect.error,
        ', Reconectando:',
        shouldReconnect
      );

      if (shouldReconnect) {
        this.initialize();
      }
    } else if (connection === 'open') {
      console.log('⚡ Conexión establecida!');
    }
  }

  async handleMessage({ messages }) {
    const m = messages[0];

    if (m.key.fromMe || m.key.remoteJid.includes('status@broadcast')) {
      return;
    }

    if (m.message && m.key.remoteJid.includes('@s.whatsapp.net')) {
      const sender = m.key.remoteJid.replace('@s.whatsapp.net', '');
      const messageText =
        m.message.conversation || m.message.extendedTextMessage?.text;

      if (messageText) {
        await this.forwardMessageToChatwoot(sender, messageText);
      }
    }
  }

  async forwardMessageToChatwoot(phoneNumber, message) {
    try {
      let conversation;
      let contact = await chatwootService.searchContact(phoneNumber);
      if (!contact) {
        contact = await chatwootService.createContact(phoneNumber);
        if (!contact || !contact.id) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          contact = await chatwootService.searchContact(phoneNumber);
        }
      }

      const conversations = await chatwootService.searchConversations(
        contact.id
      );

      /**
       * Puedo sacar de `conversations` el imbox_id y asignarlo en los agentes de ese imbox.
       */

      // console.log(JSON.stringify(conversations, null, 2));

      const idConv = conversations
        .filter((conv) => conv.meta?.sender?.phone_number === `+${phoneNumber}`)
        .map((conv) => conv.id)[0];
      if (idConv != undefined) {
        await chatwootService.sendMessage(idConv, message);
      } else {
        conversation = await chatwootService.createConversation(contact.id);
        await chatwootService.sendMessage(conversation.id, message);
        let msgCliente = `Hola, Somos X, tu mensaje fue recibido, pero primero necesitamos los siguientes datos: \n\nNombre y Apellido: \nDNI: \nMotivo de la consulta:`;

        let msgAuto = `Respuesta Automatica:
          Hola, Somos X, tu mensaje fue recibido, pero primero necesitamos los siguientes datos: 
          Nombre y Apellido
          DNI
          Motivo de la consulta`;
        await this.sendMessage(contact.identifier, msgCliente);
        const agents = await chatwootService.asignAgentsToConversation(
          conversation.id
        );
        await chatwootService.sendMessage(conversation.id, msgAuto);
      }
    } catch (error) {
      console.error('Error forwarding message to Chatwoot:', error);
    }
  }

  async sendMessage(to, message) {
    if (this.sock) {
      await this.sock.sendMessage(to, { text: message });
    }
  }
}

module.exports = new WhatsAppService();
