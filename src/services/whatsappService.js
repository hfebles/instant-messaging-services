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
    // console.log(m);
    // return;

    if (m.key.fromMe || m.key.remoteJid.includes('status@broadcast')) {
      return;
    }

    const sender = m.key.remoteJid.replace('@s.whatsapp.net', '');

    if (m.message.conversation || m.message.extendedTextMessage?.text) {
      const messageText =
        m.message.conversation || m.message.extendedTextMessage?.text;
      await this.forwardMessageToChatwoot(sender, messageText);
    }

    if (m.message.audioMessage) {
      await this.handleMediaMessage(m, sender, 'audio');
    }

    if (m.message.imageMessage) {
      await this.handleMediaMessage(m, sender, 'image');
    }

    if (m.message.videoMessage) {
      await this.handleMediaMessage(m, sender, 'video');
    }
  }

  async handleMediaMessage(m, sender, type) {
    try {
      await this.forwardMessageMediaToChatwoot(sender, m, type);
    } catch (error) {
      console.error(`❌ Error al procesar ${type}:`, error);
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

      const idConv = conversations
        .filter((conv) => conv.meta?.sender?.phone_number === `+${phoneNumber}`)
        .map((conv) => conv.id)[0];
      if (idConv != undefined) {
        await chatwootService.sendMessage(idConv, message);
      } else {
        conversation = await chatwootService.createConversation(contact.id);
        await chatwootService.sendMessage(conversation.id, message);
        const agents = await chatwootService.asignAgentsToConversation(
          conversation.id
        );
      }
    } catch (error) {
      console.error('Error forwarding message to Chatwoot:', error);
    }
  }

  async forwardMessageMediaToChatwoot(phoneNumber, message, type) {
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

      const idConv = conversations
        .filter((conv) => conv.meta?.sender?.phone_number === `+${phoneNumber}`)
        .map((conv) => conv.id)[0];
      if (idConv != undefined) {
        await chatwootService.sendMediaMessage(idConv, message, type);
      } else {
        conversation = await chatwootService.createConversation(contact.id);
        await chatwootService.sendMediaMessage(conversation.id, message, type);
        const agents = await chatwootService.asignAgentsToConversation(
          conversation.id
        );
      }
    } catch (error) {
      console.error('Error forwarding message to Chatwoot:', error);
    }
  }

  async sendMessage(to, message) {
    if (this.sock) {
      await this.sock.sendMessage(to, message);
    }
  }
}

module.exports = new WhatsAppService();
