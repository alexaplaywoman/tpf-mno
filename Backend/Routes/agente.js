require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
    console.error('Faltan TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN en .env');
    process.exit(1);
}

const client = require('twilio')(accountSid, authToken);

client.messages
    .create({
        from: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',
        contentSid: 'HXb5b62575e6e4ff6129ad7c8efe1f983e',
        contentVariables: '{"1":"12/1","2":"3pm"}',
        to: 'whatsapp:+595981253110'
    })
    .then(message => console.log('Mensaje enviado, sid:', message.sid))
    .catch(error => console.error('Error al enviar:', error.message));
