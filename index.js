const express = require('express');
const config = require('./src/config/config');
const whatsappService = require('./src/services/whatsappService');
const whatsappRoutes = require('./src/routes/whatsappRoutes');

const app = express();

app.use(express.json());

// Rutas
app.use('/api/whatsapp', whatsappRoutes);

// Iniciar WhatsApp
whatsappService
  .initialize()
  .catch((err) => console.log('Error al iniciar WhatsApp:', err));

// Iniciar servidor
app.listen(config.port, () => {
  console.log(`Servidor corriendo en puerto ${config.port}`);
});
