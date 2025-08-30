const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const { SERVICE_ACCOUNT_JSON_FILE_PATH, SPREADSHEET_ID } = require('./constant');

const serviceAccountAuth = new JWT({
    email: SERVICE_ACCOUNT_JSON_FILE_PATH.client_email,
    key: SERVICE_ACCOUNT_JSON_FILE_PATH.private_key,
    scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
    ],
});

const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);

async function appendToSheet(data) {
    try {
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['Chat'];
        await sheet.addRow(data);
    } catch (error) {
        console.error('Error appending to Google Sheet:', error);
    }
}

module.exports = {
    appendToSheet
};
