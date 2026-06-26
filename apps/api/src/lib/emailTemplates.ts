const BRAND_NAME = 'InterviewMinds';
const PRIMARY_COLOR = '#2563eb';
const DARK_COLOR = '#1e293b';
const BG_COLOR = '#f8fafc';
const CARD_BG = '#ffffff';
const TEXT_COLOR = '#334155';
const MUTED_COLOR = '#94a3b8';

function baseHtml(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${BRAND_NAME}</title>
</head>
<body style="margin:0;padding:0;background-color:${BG_COLOR};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG_COLOR};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;">
          <tr>
            <td style="background-color:${CARD_BG};border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.06);">
              <!-- Header -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,${PRIMARY_COLOR},#1d4ed8);">
                <tr>
                  <td align="center" style="padding:32px 24px 24px;">
                    <div style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                      ${BRAND_NAME}
                    </div>
                    <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">
                      AI-Powered Interview Platform
                    </div>
                  </td>
                </tr>
              </table>
              <!-- Body -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:32px 24px;">
                    ${content}
                  </td>
                </tr>
              </table>
              <!-- Footer -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${DARK_COLOR};">
                <tr>
                  <td align="center" style="padding:24px;">
                    <div style="font-size:13px;color:${MUTED_COLOR};line-height:1.6;">
                      <div style="font-weight:600;color:#ffffff;font-size:14px;margin-bottom:4px;">${BRAND_NAME}</div>
                      <div>AI-Powered Interview Platform</div>
                      <div style="margin-top:12px;">
                        <a href="https://interviewminds.com" style="color:${PRIMARY_COLOR};text-decoration:none;font-size:13px;">interviewminds.com</a>
                      </div>
                      <div style="margin-top:12px;font-size:11px;color:${MUTED_COLOR};">
                        You received this email because you are using ${BRAND_NAME}.
                        <br />If you have questions, reply to this email or contact support@interviewminds.com.
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 24px 0;">
              <div style="font-size:11px;color:${MUTED_COLOR};line-height:1.5;">
                &copy; ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(href: string, text: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
    <tr>
      <td align="center" style="border-radius:8px;background-color:${PRIMARY_COLOR};">
        <a href="${href}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;letter-spacing:0.3px;">${text}</a>
      </td>
    </tr>
  </table>`;
}

function divider(): string {
  return `<div style="height:1px;background-color:#e2e8f0;margin:24px 0;"></div>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;font-size:14px;color:${TEXT_COLOR};vertical-align:top;white-space:nowrap;width:120px;font-weight:500;">${label}</td>
    <td style="padding:6px 0;font-size:14px;color:${TEXT_COLOR};vertical-align:top;">${value}</td>
  </tr>`;
}

interface RenderedTemplate {
  subject: string;
  html: string;
}

const templates: Record<string, (v: Record<string, string>) => RenderedTemplate> = {
  'interview-scheduled': (v) => ({
    subject: `Interview Scheduled - ${v.role || 'Position'}`,
    html: baseHtml(`
      <div style="font-size:18px;font-weight:600;color:${DARK_COLOR};margin-bottom:8px;">Interview Scheduled</div>
      <div style="font-size:15px;color:${TEXT_COLOR};line-height:1.6;margin-bottom:16px;">
        Hi ${v.candidate_name || 'there'},
      </div>
      <div style="font-size:15px;color:${TEXT_COLOR};line-height:1.6;margin-bottom:24px;">
        Your interview for <strong>${v.role || 'the position'}</strong> has been scheduled. Here are the details:
      </div>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px;width:100%;">
        ${detailRow('Date', v.interview_date || '—')}
        ${detailRow('Time', v.interview_time || '—')}
        ${detailRow('Timezone', v.timezone || '—')}
        ${detailRow('Duration', v.duration || '60 minutes')}
      </table>
      ${v.interview_link ? button(v.interview_link, 'Join Interview') : ''}
      ${divider()}
      <div style="font-size:14px;color:${TEXT_COLOR};line-height:1.6;">
        <strong style="color:${DARK_COLOR};">Preparation Tips:</strong>
        <ul style="margin:8px 0 0;padding-left:20px;">
          <li style="margin-bottom:4px;">Test your camera and microphone beforehand</li>
          <li style="margin-bottom:4px;">Find a quiet, well-lit space</li>
          <li style="margin-bottom:4px;">Have a stable internet connection ready</li>
          <li style="margin-bottom:4px;">Review the job description and prepare examples</li>
        </ul>
      </div>
    `),
  }),

  'interview-reminder': (v) => ({
    subject: `Reminder: Interview Tomorrow - ${v.role || 'Position'}`,
    html: baseHtml(`
      <div style="font-size:18px;font-weight:600;color:${DARK_COLOR};margin-bottom:8px;">⏰ Interview Reminder</div>
      <div style="font-size:15px;color:${TEXT_COLOR};line-height:1.6;margin-bottom:16px;">
        Hi ${v.candidate_name || 'there'},
      </div>
      <div style="font-size:15px;color:${TEXT_COLOR};line-height:1.6;margin-bottom:24px;">
        This is a reminder that your interview for <strong>${v.role || 'the position'}</strong> is coming up.
      </div>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px;width:100%;">
        ${detailRow('Date', v.interview_date || '—')}
        ${detailRow('Time', v.interview_time || '—')}
        ${detailRow('Timezone', v.timezone || '—')}
      </table>
      ${v.interview_link ? button(v.interview_link, 'Join Interview') : ''}
      ${divider()}
      <div style="font-size:14px;color:${TEXT_COLOR};line-height:1.6;">
        <strong style="color:${DARK_COLOR};">System Requirements:</strong>
        <ul style="margin:8px 0 0;padding-left:20px;">
          <li style="margin-bottom:4px;">Latest version of Chrome, Firefox, or Edge</li>
          <li style="margin-bottom:4px;">Working webcam and microphone</li>
          <li style="margin-bottom:4px;">Stable internet connection (5 Mbps+)</li>
          <li style="margin-bottom:4px;">Closed background applications for performance</li>
        </ul>
      </div>
    `),
  }),

  'interview-completed': (v) => ({
    subject: 'Interview Completed - Thank You!',
    html: baseHtml(`
      <div style="font-size:18px;font-weight:600;color:${DARK_COLOR};margin-bottom:8px;">Interview Completed 🎉</div>
      <div style="font-size:15px;color:${TEXT_COLOR};line-height:1.6;margin-bottom:16px;">
        Hi ${v.candidate_name || 'there'},
      </div>
      <div style="font-size:15px;color:${TEXT_COLOR};line-height:1.6;margin-bottom:24px;">
        Thank you for completing your interview for <strong>${v.role || 'the position'}</strong>!
      </div>
      <div style="font-size:15px;color:${TEXT_COLOR};line-height:1.6;margin-bottom:24px;background-color:#f0f9ff;border-left:4px solid ${PRIMARY_COLOR};padding:16px;border-radius:6px;">
        Your responses have been recorded and our team will review them. We typically get back to candidates within <strong>${v.response_time || '5-7 business days'}</strong>.
      </div>
      <div style="font-size:14px;color:${TEXT_COLOR};line-height:1.6;">
        In the meantime, feel free to explore more opportunities on our platform.
      </div>
    `),
  }),

  'result-available': (v) => ({
    subject: 'Your Interview Results are Ready',
    html: baseHtml(`
      <div style="font-size:18px;font-weight:600;color:${DARK_COLOR};margin-bottom:8px;">Results Available</div>
      <div style="font-size:15px;color:${TEXT_COLOR};line-height:1.6;margin-bottom:16px;">
        Hi ${v.candidate_name || 'there'},
      </div>
      <div style="font-size:15px;color:${TEXT_COLOR};line-height:1.6;margin-bottom:24px;">
        Your interview results for <strong>${v.role || 'the position'}</strong> are now ready to view.
      </div>
      <div style="font-size:15px;color:${TEXT_COLOR};line-height:1.6;margin-bottom:24px;background-color:#f0f9ff;border-left:4px solid ${PRIMARY_COLOR};padding:16px;border-radius:6px;">
        <strong style="color:${DARK_COLOR};">In your dashboard you will find:</strong>
        <ul style="margin:8px 0 0;padding-left:20px;">
          <li style="margin-bottom:4px;">Detailed score breakdown by competency</li>
          <li style="margin-bottom:4px;">Personalized feedback on your responses</li>
          <li style="margin-bottom:4px;">Areas for improvement and recommended resources</li>
        </ul>
      </div>
      ${button(v.dashboard_url || '#', 'View Results')}
    `),
  }),

  'rejection-notification': (v) => ({
    subject: 'Update on Your Application',
    html: baseHtml(`
      <div style="font-size:18px;font-weight:600;color:${DARK_COLOR};margin-bottom:8px;">Application Update</div>
      <div style="font-size:15px;color:${TEXT_COLOR};line-height:1.6;margin-bottom:16px;">
        Dear ${v.candidate_name || 'Candidate'},
      </div>
      <div style="font-size:15px;color:${TEXT_COLOR};line-height:1.6;margin-bottom:24px;">
        Thank you for taking the time to interview with us for the <strong>${v.role || 'position'}</strong> role.
      </div>
      <div style="font-size:15px;color:${TEXT_COLOR};line-height:1.6;margin-bottom:24px;background-color:#fef2f2;border-left:4px solid #ef4444;padding:16px;border-radius:6px;">
        After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current needs.
      </div>
      <div style="font-size:15px;color:${TEXT_COLOR};line-height:1.6;margin-bottom:24px;">
        We were genuinely impressed by your efforts and encourage you to apply for future positions that match your skills. We wish you the very best in your career journey.
      </div>
      ${v.dashboard_url ? button(v.dashboard_url, 'Browse Open Positions') : ''}
      <div style="font-size:13px;color:${MUTED_COLOR};line-height:1.5;margin-top:8px;">
        If you have any questions, feel free to reach out to our team at support@interviewminds.com.
      </div>
    `),
  }),

  'offer-letter': (v) => ({
    subject: `Job Offer - ${v.role || 'Position'}`,
    html: baseHtml(`
      <div style="font-size:18px;font-weight:600;color:${DARK_COLOR};margin-bottom:8px;">🎉 Congratulations!</div>
      <div style="font-size:15px;color:${TEXT_COLOR};line-height:1.6;margin-bottom:16px;">
        Dear ${v.candidate_name || 'Candidate'},
      </div>
      <div style="font-size:15px;color:${TEXT_COLOR};line-height:1.6;margin-bottom:24px;">
        We are delighted to extend you an offer for the <strong>${v.role || 'position'}</strong> role at <strong>${v.company_name || 'our company'}</strong>.
      </div>
      <div style="font-size:15px;color:${TEXT_COLOR};line-height:1.6;margin-bottom:24px;background-color:#f0fdf4;border-left:4px solid #22c55e;padding:16px;border-radius:6px;">
        Your skills, experience, and enthusiasm truly stood out during the interview process, and we are excited about what you will bring to our team.
        <div style="margin-top:12px;font-weight:500;">Offer details have been sent separately or are available in your dashboard.</div>
      </div>
      <div style="font-size:15px;color:${TEXT_COLOR};line-height:1.6;margin-bottom:24px;">
        Please respond by <strong>${v.response_deadline || 'the specified date'}</strong> to confirm your acceptance. We look forward to welcoming you aboard!
      </div>
      ${v.offer_url ? button(v.offer_url, 'Review Offer') : ''}
    `),
  }),

  'interview-rescheduled': (v) => ({
    subject: `Interview Rescheduled - ${v.role || 'Position'}`,
    html: baseHtml(`
      <div style="font-size:18px;font-weight:600;color:${DARK_COLOR};margin-bottom:8px;">Interview Rescheduled</div>
      <div style="font-size:15px;color:${TEXT_COLOR};line-height:1.6;margin-bottom:16px;">
        Hi ${v.candidate_name || 'there'},
      </div>
      <div style="font-size:15px;color:${TEXT_COLOR};line-height:1.6;margin-bottom:24px;">
        Your interview for <strong>${v.role || 'the position'}</strong> has been rescheduled.
      </div>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px;width:100%;">
        <tr>
          <td style="padding:12px;background-color:#fef2f2;border-radius:6px 0 0 6px;width:50%;vertical-align:top;">
            <div style="font-size:12px;color:#ef4444;font-weight:600;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Previous</div>
            <div style="font-size:14px;color:${TEXT_COLOR};font-weight:500;">${v.old_date || '—'}</div>
            <div style="font-size:13px;color:${MUTED_COLOR};">${v.old_time || '—'}</div>
          </td>
          <td style="width:8px;"></td>
          <td style="padding:12px;background-color:#f0fdf4;border-radius:0 6px 6px 0;width:50%;vertical-align:top;">
            <div style="font-size:12px;color:#22c55e;font-weight:600;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">New</div>
            <div style="font-size:14px;color:${TEXT_COLOR};font-weight:500;">${v.interview_date || '—'}</div>
            <div style="font-size:13px;color:${MUTED_COLOR};">${v.interview_time || '—'}</div>
          </td>
        </tr>
        <tr><td colspan="3" style="padding:4px;"></td></tr>
        ${detailRow('Timezone', v.timezone || '—')}
      </table>
      ${v.interview_link ? button(v.interview_link, 'Join Interview') : ''}
      <div style="font-size:13px;color:${MUTED_COLOR};line-height:1.5;margin-top:8px;">
        If this new time does not work for you, please contact the hiring team as soon as possible.
      </div>
    `),
  }),

  'code-assessment': (v) => ({
    subject: `Coding Challenge - ${v.role || 'Position'}`,
    html: baseHtml(`
      <div style="font-size:18px;font-weight:600;color:${DARK_COLOR};margin-bottom:8px;">Coding Challenge Assigned 💻</div>
      <div style="font-size:15px;color:${TEXT_COLOR};line-height:1.6;margin-bottom:16px;">
        Hi ${v.candidate_name || 'there'},
      </div>
      <div style="font-size:15px;color:${TEXT_COLOR};line-height:1.6;margin-bottom:24px;">
        As part of the interview process for <strong>${v.role || 'the position'}</strong>, we have assigned you a coding challenge.
      </div>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px;width:100%;">
        ${detailRow('Challenge', v.challenge_name || 'Coding Assessment')}
        ${detailRow('Deadline', v.deadline || '—')}
        ${detailRow('Duration', v.duration || '—')}
        ${detailRow('Language', v.language || 'Any')}
      </table>
      ${v.challenge_link ? button(v.challenge_link, 'Start Challenge') : ''}
      ${divider()}
      <div style="font-size:14px;color:${TEXT_COLOR};line-height:1.6;">
        <strong style="color:${DARK_COLOR};">Tips for Success:</strong>
        <ul style="margin:8px 0 0;padding-left:20px;">
          <li style="margin-bottom:4px;">Read all instructions and requirements carefully</li>
          <li style="margin-bottom:4px;">Plan your approach before writing code</li>
          <li style="margin-bottom:4px;">Test your solution with sample inputs</li>
          <li style="margin-bottom:4px;">Ensure your code compiles and runs correctly</li>
          <li style="margin-bottom:4px;">Submit before the deadline to avoid disqualification</li>
        </ul>
      </div>
    `),
  }),
};

export function renderEmailTemplate(
  templateName: string,
  variables: Record<string, string>
): RenderedTemplate | null {
  const renderer = templates[templateName];
  if (!renderer) return null;
  return renderer(variables);
}
