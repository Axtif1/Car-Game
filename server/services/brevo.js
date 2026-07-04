/**
 * Brevo (formerly Sendinblue) Transactional Email Service
 * Sends transactional welcome and notification emails via Brevo v3 API.
 */
export async function sendBrevoWelcomeEmail(email, name) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@citydomination3d.com';
  const senderName = 'Apex Velocity 3D Racing';

  if (!apiKey || apiKey === 'your_brevo_api_key_here') {
    console.log(`📧 [Brevo Email Service] Simulated Welcome Email to ${email} (${name}). Configure BREVO_API_KEY in .env to send real transactional emails.`);
    return { simulated: true };
  }

  const htmlContent = `
    <div style="font-family: 'Outfit', Arial, sans-serif; background-color: #050812; color: #ffffff; padding: 30px; border-radius: 12px; border: 2px solid #00ffff; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #00ffff; font-size: 28px; margin: 0;">CITY <span style="color: #ff2a2a;">DOMINATION</span></h1>
        <p style="color: #a0a6be; font-size: 14px;">APEX VELOCITY 3D // MULTIPLAYER RACING</p>
      </div>
      <div style="background-color: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #ffbd00; margin-top: 0;">Welcome to the Starting Grid, ${name}! 🏁</h2>
        <p style="line-height: 1.6; color: #e0e0e0;">
          Your racer profile has been successfully created and authenticated. You have been awarded an initial balance of <strong>💰 5,000 Coins</strong> to customize your sports, super, and muscle GT vehicles in the Garage!
        </p>
        <p style="line-height: 1.6; color: #e0e0e0;">
          Get ready to drift through Cyber City, conquer Neon Canyon, and dominate multiplayer circuits worldwide.
        </p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="http://localhost:5173" style="background: linear-gradient(135deg, #00ffff, #0088ff); color: #050812; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px; display: inline-block;">ENTER THE LOBBY NOW</a>
      </div>
      <div style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 15px; font-size: 12px; color: #70758a; text-align: center;">
        Apex Velocity 3D Authoritative Server // Sent via Brevo Email Pipeline
      </div>
    </div>
  `;

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email, name }],
        subject: `🏁 Welcome to City Domination 3D Racing, ${name}!`,
        htmlContent
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ [Brevo] Welcome email sent successfully to ${email} (MessageId: ${data.messageId || 'OK'})`);
      return { success: true, data };
    } else {
      const err = await response.text();
      console.warn(`⚠️ [Brevo] Failed sending email to ${email}: status ${response.status} - ${err}`);
      return { success: false, error: err };
    }
  } catch (err) {
    console.error(`❌ [Brevo] Network error sending email:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function sendBrevoOTPEmail(email, name, otpCode) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@citydomination3d.com';
  const senderName = 'Apex Velocity 3D Racing';

  if (!apiKey || apiKey === 'your_brevo_api_key_here') {
    console.log(`📧 [Brevo OTP Simulation] Your Verification Code for ${email} is: ${otpCode}`);
    return { simulated: true };
  }

  const htmlContent = `
    <div style="font-family: 'Outfit', Arial, sans-serif; background-color: #050812; color: #ffffff; padding: 30px; border-radius: 12px; border: 2px solid #00ffff; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #00ffff; font-size: 28px; margin: 0;">CITY <span style="color: #ff2a2a;">DOMINATION</span></h1>
        <p style="color: #a0a6be; font-size: 14px;">DRIVER ID VERIFICATION</p>
      </div>
      <div style="background-color: rgba(255, 255, 255, 0.05); padding: 25px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
        <h2 style="color: #ffbd00; margin-top: 0;">Racer Registration Code 🔑</h2>
        <p style="line-height: 1.6; color: #e0e0e0; font-size: 15px;">
          Hello ${name}, please use the following 6-digit verification code to complete your driver profile registration and unlock your 💰 5,000 Starting Coins:
        </p>
        <div style="background: rgba(0, 255, 255, 0.15); border: 2px dashed #00ffff; padding: 18px; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #00ffff; margin: 25px 0; border-radius: 12px;">
          ${otpCode}
        </div>
        <p style="color: #a0a6be; font-size: 13px; margin-bottom: 0;">
          This verification code will expire in 10 minutes. Do not share this code with anyone.
        </p>
      </div>
      <div style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 15px; font-size: 12px; color: #70758a; text-align: center;">
        Apex Velocity 3D Authoritative Security System // Brevo Cloud Pipeline
      </div>
    </div>
  `;

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email, name }],
        subject: `🔑 ${otpCode} is your Apex Velocity 3D Verification Code`,
        htmlContent
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ [Brevo] OTP verification code (${otpCode}) sent successfully to ${email}`);
      return { success: true, data };
    } else {
      const err = await response.text();
      console.warn(`⚠️ [Brevo] Failed sending OTP email to ${email}: status ${response.status} - ${err}`);
      return { success: false, error: err };
    }
  } catch (err) {
    console.error(`❌ [Brevo] Network error sending OTP email:`, err.message);
    return { success: false, error: err.message };
  }
}
