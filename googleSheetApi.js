const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const { SPREADSHEET_ID } = require('./constant');
const creds = require('./service-account.json');

const serviceAccountAuth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);

async function appendToSheet(data) {
    try {
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['Chat']; // O el nombre correcto de tu hoja
        await sheet.addRow(data);
    } catch (error) {
        console.error('Error appending to Google Sheet:', error);
    }
}

async function getRecentHistory(phoneNumber, limit = 12) {
    try {
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['Chat']; // O el nombre correcto de tu hoja
        const rows = await sheet.getRows();

        const userHistory = rows
            .filter(row => row.get('phoneNumber') === phoneNumber) // Filtra por el número de teléfono
            .slice(-limit) // Toma solo los últimos 'limit' mensajes
            .map(row => ({
                role: row.get('role'),      // Lee la nueva columna 'role'
                content: row.get('utterance') // Lee la nueva columna unificada 'utterance'
            }));
            
        return userHistory;
    } catch (error) {
        console.error('Error al leer desde Google Sheet:', error);
        return [];
    }
}

module.exports = { appendToSheet, getRecentHistory };