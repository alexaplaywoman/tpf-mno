const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

function enviarCorreoReserva(destinario, asunto, mensaje){
    transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: destinario,
        subject: asunto,
        text: mensaje
    }, (err) =>{
        if (err) console.error('Error al enviar correo:', err);
    });
}

module.exports = {enviarCorreoReserva};