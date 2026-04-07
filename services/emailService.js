const sendLeadEmail = async (leadData) => {
  try {
    const url = 'https://www.rsiconcepts.com/emailsend.php';
    const emailStr = process.env.LEAD_NOTIFICATION_EMAIL || 'rashidansari.gbs11@gmail.com';
    const recipients = emailStr.split(',').map(e => e.trim()).filter(e => e);

    // Construct common message body
    const message = `
<h3>New Lead Captured from Chatbot</h3>
<p>Name: ${leadData.name || 'Not provided'}</p>

<p>Email: ${leadData.email || 'Not provided'}</p>

<p>Mobile: ${leadData.mobile || 'Not provided'}</p>

<p>Enquiry/Requirement: ${leadData.enquiry || 'Not provided'}</p>
    `.trim();


    // Send individual requests for each recipient to ensure delivery
    const sendRequests = recipients.map(async (email) => {
      try {
        const formData = new FormData();
        formData.append('Email', email);
        formData.append('Subject', `New Lead Captured: ${leadData.name || 'Anonymous'}`);
        formData.append('Message', message);

        console.log('Sending email to:', email);
        // Note: fetch will automatically set the correct Content-Type with boundary for FormData
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'User-Agent': 'PostmanRuntime/7.36.1',
            'Accept': '*/*',
            'Cache-Control': 'no-cache',
            'Origin': 'https://www.rsiconcepts.com',
            'Referer': 'https://www.rsiconcepts.com/emailsend.php',
            'Connection': 'keep-alive',
          },
          body: formData,
        });


        const result = await response.text();
        console.log(`Email sent to ${email}:`, result || 'Success (No response body)');
        return { email, success: response.ok, result };
      } catch (err) {
        console.error(`Failed to send email to ${email}:`, err.message);
        return { email, success: false, error: err.message };
      }
    });

    const results = await Promise.all(sendRequests);
    return results;

  } catch (error) {
    console.error('Error in sendLeadEmail service:', error);
    return null;
  }
};

module.exports = {
  sendLeadEmail,
};


