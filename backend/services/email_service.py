"""
SMTP email service — Gmail-based.
Sends welcome emails with auto-generated passwords to teachers/parents.
"""
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import settings
import logging

logger = logging.getLogger(__name__)

def _send(to: str, subject: str, html: str, text: str = ""):
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP not configured — skipping email to %s", to)
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"VinSchool <{settings.SMTP_USER}>"
        msg["To"]      = to
        if text:
            msg.attach(MIMEText(text, "plain"))
        msg.attach(MIMEText(html, "html"))

        ctx = ssl.create_default_context()
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=ctx) as server:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, to, msg.as_string())
        return True
    except Exception as e:
        logger.error("Email send failed to %s: %s", to, e)
        return False

def send_teacher_welcome(name: str, email: str, password: str, school: str):
    subject = f"Welcome to VinSchool — Your Teacher Account"
    html = f"""
    <div style="font-family:'Segoe UI',sans-serif;max-width:520px;margin:auto;padding:32px;background:#faf9ff;border-radius:16px">
      <div style="background:#695be6;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
        <h1 style="color:white;margin:0;font-size:24px">VinSchool</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0">Smart School Management</p>
      </div>
      <h2 style="color:#100e1a">Welcome, {name}!</h2>
      <p style="color:#555">Your teacher account at <strong>{school}</strong> has been created.</p>
      <div style="background:white;border:2px solid #695be6;border-radius:12px;padding:20px;margin:20px 0">
        <p style="margin:0 0 8px;color:#555;font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:1px">Your Login Credentials</p>
        <p style="margin:4px 0;color:#100e1a"><strong>Email:</strong> {email}</p>
        <p style="margin:4px 0;color:#100e1a"><strong>Password:</strong> <code style="background:#f3f0ff;padding:2px 8px;border-radius:6px;font-size:15px">{password}</code></p>
        <p style="margin:4px 0;color:#100e1a"><strong>Role:</strong> Teacher</p>
      </div>
      <p style="color:#e53e3e;font-size:13px">⚠️ Please change your password after your first login.</p>
      <a href="http://localhost:5173/login" style="display:inline-block;background:#695be6;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:bold;margin-top:8px">
        Login to VinSchool →
      </a>
      <p style="color:#aaa;font-size:12px;margin-top:24px">If you didn't expect this email, please contact your school administrator.</p>
    </div>"""
    return _send(email, subject, html)

def send_parent_welcome(parent_name: str, email: str, password: str, student_name: str, school: str):
    subject = f"VinSchool — Parent Account for {student_name}"
    html = f"""
    <div style="font-family:'Segoe UI',sans-serif;max-width:520px;margin:auto;padding:32px;background:#faf9ff;border-radius:16px">
      <div style="background:#695be6;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
        <h1 style="color:white;margin:0;font-size:24px">VinSchool</h1>
      </div>
      <h2 style="color:#100e1a">Hello, {parent_name}!</h2>
      <p style="color:#555">A parent account has been created for you to track <strong>{student_name}</strong>'s progress at <strong>{school}</strong>.</p>
      <div style="background:white;border:2px solid #695be6;border-radius:12px;padding:20px;margin:20px 0">
        <p style="margin:0 0 8px;color:#555;font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:1px">Your Login Credentials</p>
        <p style="margin:4px 0;color:#100e1a"><strong>Email:</strong> {email}</p>
        <p style="margin:4px 0;color:#100e1a"><strong>Password:</strong> <code style="background:#f3f0ff;padding:2px 8px;border-radius:6px;font-size:15px">{password}</code></p>
      </div>
      <a href="http://localhost:5173/login" style="display:inline-block;background:#695be6;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:bold">
        Login to VinSchool →
      </a>
    </div>"""
    return _send(email, subject, html)

def send_otp_email(email: str, otp: str, name: str = ""):
    subject = "VinSchool — Your OTP"
    html = f"""
    <div style="font-family:'Segoe UI',sans-serif;max-width:400px;margin:auto;padding:32px;background:#faf9ff;border-radius:16px;text-align:center">
      <h2 style="color:#100e1a">Your OTP{f', {name}' if name else ''}</h2>
      <div style="background:#695be6;color:white;font-size:36px;font-weight:900;letter-spacing:12px;padding:20px;border-radius:12px;margin:20px 0">
        {otp}
      </div>
      <p style="color:#aaa;font-size:13px">Valid for 10 minutes. Do not share this with anyone.</p>
    </div>"""
    return _send(email, subject, html)
