const nodemailer = require('nodemailer');
const config = require('./config');

const transporter = nodemailer.createTransport({
    service: config.mail.service,
    auth: {
        user: config.mail.your_email,
        pass: config.mail.your_password
    }
});

function SendMail(email, subject, body) {
    const mailOptions = {
        from: config.mail.your_email,
        to: email,
        subject: subject,
        text: body
    };

    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

module.exports = {
    SendMail: SendMail
}