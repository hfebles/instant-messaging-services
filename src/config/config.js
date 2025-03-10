require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3000,
    chatwoot: {
        baseUrl: process.env.CHATWOOT_BASE_URL,
        apiKey: process.env.CHATWOOT_API_KEY,
        accountId: process.env.CHATWOOT_ACCOUNT_ID,
        inboxId: process.env.CHATWOOT_INBOX_ID
    }
};