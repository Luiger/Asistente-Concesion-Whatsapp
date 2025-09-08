const express = require('express');

const webApp = express();
const sessionTracker = {}; // Objeto para rastrear los turnos de cada sesión
module.exports.sessionTracker = sessionTracker; // Exportarlo para que otras rutas lo usen

webApp.use(express.urlencoded({ extended: true }));
webApp.use(express.json());
webApp.use((req, res, next) => {
    console.log(`Path ${req.path} with Method ${req.method}`);
    console.log('VERIFY_TOKEN in index.js:', process.env.VERIFY_TOKEN); // Log VERIFY_TOKEN from index.js
    console.log('req.body in index.js:', req.body); // Log req.body from index.js
    next();
});

const twilioRoute = require('./twilioRoute');

webApp.use('/twilio', twilioRoute.router);

const PORT = process.env.PORT || 3000;
webApp.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

exports.webhook = webApp;
