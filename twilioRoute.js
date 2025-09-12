const express = require('express');
const router = express.Router();
const axios = require('axios');

const { detectIntentText } = require('./dialogflowApi');
const { appendToSheet, getRecentHistory } = require('./googleSheetApi');
const { ERROR_MESSAGE } = require('./constant');

// La lógica de verificación de webhook (GET) no cambia
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

// Reemplazamos por completo la lógica POST
router.post('/webhook', async (req, res) => {
    try {
        let query = '';
        let senderPhoneNumber = '';

        if (req.body.object && req.body.entry && req.body.entry[0].changes && req.body.entry[0].changes[0].value && req.body.entry[0].changes[0].value.messages && req.body.entry[0].changes[0].value.messages[0]) {
            const message = req.body.entry[0].changes[0].value.messages[0];
            if (message.text && message.text.body) {
                query = message.text.body;
            }
            senderPhoneNumber = message.from;
        } else {
            return res.status(200).send('OK');
        }

        // 1. SESSION ID PERSISTENTE
        // Creamos un ID de sesión único y constante para cada usuario
        const finalSessionId = `whatsapp-${senderPhoneNumber}`;

        // 2. LEER HISTORIAL RECIENTE (Ventana Deslizante)
        // Leemos los últimos 8 turnos desde Google Sheets
        const recentHistory = await getRecentHistory(senderPhoneNumber, 8);

        // 3. CONSTRUIR PROMPT CON CONTEXTO
        // Creamos un bloque de texto con el historial para dar contexto al agente
        const historyText = recentHistory.map(turn =>
            `${turn.role === 'user' ? 'Usuario' : 'Agente'}: ${turn.content}`
        ).join('\n');

        const fullPrompt = `${historyText}\nUsuario: ${query}`;

        // 4. LLAMAR A DIALOGFLOW
        // Enviamos el prompt completo, pero solo la pregunta actual importa para la detección de intención.
        // El historial en el prompt ayuda al Playbook a mantener el contexto.
        const dialogflowResponse = await detectIntentText(query, finalSessionId); // Enviamos solo la query actual

        const finalResponseText = (dialogflowResponse.status === 1 && dialogflowResponse.responses?.length > 0)
            ? dialogflowResponse.responses.join('\n')
            : ERROR_MESSAGE;

        // 5. ESCRIBIR EN GOOGLE SHEET
        const timestamp = new Date().toISOString();
        // Escribimos la fila del usuario
        await appendToSheet({ timestamp, phoneNumber: senderPhoneNumber, sessionID: finalSessionId, role: 'user', utterance: query });
        // Escribimos la fila del agente
        await appendToSheet({ timestamp, phoneNumber: senderPhoneNumber, sessionID: finalSessionId, role: 'agent', utterance: finalResponseText });

        // 6. RESPONDER A WHATSAPP
        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
        const data = {
            messaging_product: "whatsapp",
            to: senderPhoneNumber,
            text: { body: finalResponseText }
        };
        const config = {
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
        };
        await axios.post(url, data, config);

    } catch (error) {
        console.error(`Error en /twilio/webhook -> ${error}`);
    }
    res.status(200).send('OK');
});

module.exports = {
    router
};