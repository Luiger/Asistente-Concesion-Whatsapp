const express = require('express');
const axios = require('axios');
const router = express.Router();

const { detectIntentText } = require('./dialogflowApi');
const { appendToSheet } = require('./googleSheetApi');
const { ERROR_MESSAGE } = require('./constant');
const { sessionTracker } = require('./index'); // Importamos nuestro rastreador

router.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'TOKENSECRETO9537'; // Fallback token if not in .env
    console.log('VERIFY_TOKEN:', VERIFY_TOKEN); // Log the token being used

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(403);
    }
});

router.post('/webhook', async (req, res) => {
    try {
        let query = '';
        let senderPhoneNumberId = '';

        if (req.body.object && req.body.entry && req.body.entry[0].changes && req.body.entry[0].changes[0].value && req.body.entry[0].changes[0].value.messages && req.body.entry[0].changes[0].value.messages[0]) {
            const message = req.body.entry[0].changes[0].value.messages[0];
            if (message.text && message.text.body) {
                query = message.text.body;
            }
            senderPhoneNumberId = message.from;
        } else {
            return res.status(200).send('OK'); // Respond with OK even if it's not a message
        }

        // --- LÓGICA DE LA VENTANA DE SESIÓN ---
        const userIdentifier = `${senderPhoneNumberId}`;

        // 1. Obtener el estado actual del usuario o inicializarlo
        if (!sessionTracker[userIdentifier]) {
            sessionTracker[userIdentifier] = { turn: 1, sessionSuffix: 1 };
        } else {
            sessionTracker[userIdentifier].turn++;
        }

        // 2. Definir el tamaño máximo de la ventana de sesión (ej. 20 turnos)
        const SESSION_WINDOW_SIZE = 10;
        
        // 3. Si se excede el límite, iniciar una nueva sesión reiniciando el contador de turnos y cambiando el sufijo
        if (sessionTracker[userIdentifier].turn > SESSION_WINDOW_SIZE) {
            sessionTracker[userIdentifier].turn = 1;
            sessionTracker[userIdentifier].sessionSuffix++;
        }
        
        // 4. Construir el ID de sesión final que se enviará a Dialogflow
        const currentSuffix = sessionTracker[userIdentifier].sessionSuffix;
        const finalSessionId = `${userIdentifier}-${currentSuffix}`;
        
        console.log(`User: ${userIdentifier}, Turn: ${sessionTracker[userIdentifier].turn}, SessionID: ${finalSessionId}`);

        console.log(query);
        console.log('Sender ID:', senderPhoneNumberId); // Log the sender ID directly

        console.log('Incoming request body:', req.body); // Log the entire request body

        const dialogflowResponse = await detectIntentText(query, finalSessionId);
        console.log(dialogflowResponse);

        let finalResponse = '';
        if (dialogflowResponse.status === 1 && dialogflowResponse.responses && dialogflowResponse.responses.length > 0) {
            finalResponse = dialogflowResponse.responses.join('\n'); // Join multiple responses if any
        } else {
            finalResponse = ERROR_MESSAGE; // Use the default error message
        }

        // Save to Google Sheet
        await appendToSheet({
            timestamp: new Date().toISOString(),
            phoneNumber: userIdentifier,
            sessionID: finalSessionId,
            userUtterance: query,
            agentUtterance: finalResponse
        });

        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

        const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;

        const data = {
            messaging_product: "whatsapp",
            to: senderPhoneNumberId,
            text: {
                body: finalResponse
            }
        };

        const config = {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        await axios.post(url, data, config);

        console.log('Request success.');
    } catch (error) {
        console.log(`Error at /twilio/webhook -> ${error}`);
    }
    res.send('OK');
});

module.exports = {
    router
};
