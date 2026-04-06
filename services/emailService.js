const nodemailer = require('nodemailer');

const sendLeadEmail = async (leadData) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"Chatbot Agent" <${process.env.SMTP_USER}>`,
      to: process.env.LEAD_NOTIFICATION_EMAIL || 'rashidansari.gbs11@gmail.com',
      subject: `New Lead Captured: ${leadData.name}`,
      html: `
        <h3>New Lead Captured from Chatbot</h3>
        <p><strong>Name:</strong> ${leadData.name}</p>
        <p><strong>Email:</strong> ${leadData.email}</p>
        <p><strong>Mobile:</strong> ${leadData.mobile || 'Not provided'}</p>
        <p><strong>Enquiry/Requirement:</strong> ${leadData.enquiry || 'Not provided'}</p>
        <hr>
        <p><em>Sent from your Chatbot Agent System</em></p>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    // Even if email fails, we should Log it but not necessarily break the chat flow
    return null;
  }
};

module.exports = {
  sendLeadEmail,
};
