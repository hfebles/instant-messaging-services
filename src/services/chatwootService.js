const axios = require('axios');
const config = require('../config/config');
const FormData = require('form-data');
const fs = require('fs');

const { downloadMediaMessage } = require('@whiskeysockets/baileys');

class ChatwootService {
  constructor() {
    this.baseUrl = `${process.env.CHATWOOT_BASE_URL}:${process.env.CHATWOOT_BASE_PORT}`;
    this.headers = {
      api_access_token: config.chatwoot.apiKey,
      'Content-Type': 'application/json',
    };
  }

  async createContact(phoneNumber, name = '') {
    const telefono = `${phoneNumber}@c.us`;
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v1/accounts/${config.chatwoot.accountId}/contacts`,
        {
          inbox_id: config.chatwoot.inboxId,
          name: name || phoneNumber,
          phone_number: `+${phoneNumber}`,
          identifier: telefono,
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating contact:', error.message);
      throw error;
    }
  }

  async searchContact(phoneNumber) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/accounts/${config.chatwoot.accountId}/contacts/search`,

        {
          params: {
            q: phoneNumber,
          },
          headers: this.headers,
        }
      );

      return response.data.payload[0];
    } catch (error) {
      console.error('Error creating conversation:', error.message);
      throw error;
    }
  }

  async searchConversations(contactId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/accounts/${config.chatwoot.accountId}/conversations`,
        {
          params: {
            contact_id: contactId,
          },
          headers: this.headers,
        }
      );
      return response.data.data.payload;
    } catch (error) {
      console.error('Error searching conversations:', error.message);
      throw error;
    }
  }

  async createConversation(contactId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v1/accounts/${config.chatwoot.accountId}/conversations`,
        {
          source_id: contactId,
          inbox_id: config.chatwoot.inboxId,
          contact_id: contactId,
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating conversation:', error.message);
      throw error;
    }
  }

  async asignAgentsToConversation(conversationId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/accounts/${config.chatwoot.accountId}/agents`,
        { headers: this.headers }
      );
      const agents = response.data
        .filter((agent) => agent.availability_status === 'online')
        .map((agent) => agent);
      let rdm = Math.floor(Math.random() * (agents.length - 0) + 0);
      const rsp = await axios.post(
        `${this.baseUrl}/api/v1/accounts/${config.chatwoot.accountId}/conversations/${conversationId}/assignments`,
        { assignee_id: agents[rdm].id },
        { headers: this.headers }
      );
      return true;
    } catch (error) {
      console.error('Error creating conversation:', error.message);
      throw error;
    }
  }

  async sendMessage(conversationId, message, messageType = 'incoming') {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v1/accounts/${config.chatwoot.accountId}/conversations/${conversationId}/messages`,
        {
          content: message,
          message_type: messageType,
          content_type: 'input_email',
          private: true,
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error.message);
      throw error;
    }
  }
  async sendMediaMessage(conversationId, message, type) {
    const buffer = await downloadMediaMessage(message, 'buffer');
    // const extension = type === 'audio' ? 'mp3' : 'jpg';
    let extension = null;

    switch (type) {
      case 'audio':
        extension = 'mp3';
        break;
      case 'video':
        extension = 'mp4';
        break;
      default:
        extension = 'jpg';

        break;
    }

    const fileName = `${type}-${message.key.id}.${extension}`;
    const filePath = `./media/${type}/${fileName}`;
    fs.writeFileSync(filePath, buffer);

    var form = new FormData();
    form.append('message_type', 'incoming');
    form.append('attachments[]', fs.createReadStream(filePath));
    const formHeaders = form.getHeaders();

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v1/accounts/${config.chatwoot.accountId}/conversations/${conversationId}/messages`,
        form,
        {
          headers: { ...formHeaders, api_access_token: config.chatwoot.apiKey },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error sending message:', error.message);
      throw error;
    }
  }
}

module.exports = new ChatwootService();
