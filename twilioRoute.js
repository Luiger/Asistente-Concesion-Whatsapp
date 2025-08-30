const express = require('express');
const axios = require('axios');
const router = express.Router();

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


const { detectIntentText } = require('./dialogflowApi');
const { appendToSheet } = require('./googleSheetApi');

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
            console.log('Received a webhook event that is not a message or is malformed.');
            // Handle other event types or malformed data if necessary
            return res.status(200).send('OK'); // Respond with OK even if it's not a message
        }

        console.log(query);
        console.log('Sender ID:', senderPhoneNumberId); // Log the sender ID directly

        console.log('Incoming request body:', req.body); // Log the entire request body

        const dialogflowResponse = await detectIntentText(query, `${senderPhoneNumberId}`); // Pass the sender ID to Dialogflow
        console.log(dialogflowResponse);
        const finalResponse = dialogflowResponse.response;

        // Save to Google Sheet
        const sheetData = {
            timestamp: new Date().toISOString(),
            sessionID: `${senderPhoneNumberId}`,
            userUtterance: query,
            agentUtterance: finalResponse
        };
        await appendToSheet(sheetData);

        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

        const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;

        const data = {
            messaging_product: "whatsapp",
            to: senderPhoneNumberId, // Use the full senderPhoneNumberId for the 'to' field
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
