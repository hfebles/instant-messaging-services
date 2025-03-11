require('dotenv').config();
const args = require('minimist')(process.argv.slice(2));
module.exports = {
  port: args.port,
  chatwoot: {
    baseUrl: process.env.CHATWOOT_BASE_URL,
    apiKey: process.env.CHATWOOT_API_KEY,
    accountId: process.env.CHATWOOT_ACCOUNT_ID,
    inboxId: process.env.CHATWOOT_INBOX_ID,
  },
};
