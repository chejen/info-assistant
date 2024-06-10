import { sendMail } from '../util/sendMail.js';

const origin = process.env.INFO_OPENINGS_YR_ORIGIN;
const targetUrl = process.env.INFO_OPENINGS_YR_ENDPOINT;

const getData = url => fetch(url)
  .then(response => response.json())
  .then(result => {
    console.log(`[${new Date()}] ${url} has requested.`);
    return result.payload.jobs || [];
  })
  .catch(e => {
    console.error(`[${new Date()}][ERR] failed to execute getData().`);
    throw e;
  });

const generateTemplate = async () => {
  let template = '';
  try {
    const data = await getData(targetUrl);
    template = `
      <section>
        <h1>${process.env.INFO_OPENINGS_YR_HEADING}</h1>
        ${data.map(d => (
          `<article style="margin-bottom: 20px; font-size: 14px;">
            <div>
              <a href="${origin}${d.path}" target="_blank">
                <strong>${d.name}</strong>
              </a>
              (<a href="${origin}${d.company?.path}" target="_blank">
                ${d.company?.brand}
              </a>)
            </div>
            <div style="display: flex;">
              <div style="width: 100px;">
                <img src="${d.company?.logo}" width="80" />
              </div>
              <div>
                <div>${d.salary}</div>
                <div>${d.location}</div>
                <div>${d.lastActiveAt}</div>
              </div>
            </div>
          </article>`
        )).join('\n')}
      </section>
    `;
  } catch (e) {
    console.error(`[${new Date()}][ERR] failed to generate html template.`);
    throw e;
  }

  return template;
}

generateTemplate()
  .then(html => {
    if (!html) {
      console.error(`[${new Date()}][ERR] empty template.`);
      return;
    }
    sendMail({ subject: process.env.INFO_OPENINGS_YR_SUBJECT, html });
  });
