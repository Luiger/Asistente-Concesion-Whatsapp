require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SERVICE_ACCOUNT_JSON_FILE_PATH = process.env.SERVICE_ACCOUNT_JSON_FILE_PATH;
console.log('SERVICE_ACCOUNT_JSON_FILE_PATH:', SERVICE_ACCOUNT_JSON_FILE_PATH); // Log the path
const DIALOGFLOW_CX_AGENT_ID = process.env.DIALOGFLOW_CX_AGENT_ID;
const DIALOGFLOW_CX_AGENT_LOCATION = process.env.DIALOGFLOW_CX_AGENT_LOCATION;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const ERROR_MESSAGE = 'We are facing a technical issue at this time, please try after sometimes.';

module.exports = {
    GEMINI_API_KEY,
    SERVICE_ACCOUNT_JSON_FILE_PATH,
    DIALOGFLOW_CX_AGENT_ID,
    DIALOGFLOW_CX_AGENT_LOCATION,
    SPREADSHEET_ID,
    ERROR_MESSAGE
};
