import { sendMail } from '../util/sendMail.js';

const origin = process.env.INFO_OPENINGS_MJ_ORIGIN;
const targetUrl = process.env.INFO_OPENINGS_MJ_ENDPOINT;

const getData = url => fetch(url)
  .then(response => response.json())
  .then(result => {
    console.log(`[${new Date()}] ${url} has requested.`);
    return result.collection || [];
  })
  .catch(e => {
    console.error(`[${new Date()}][ERR] failed to execute getData().`);
    throw e;
  });

const generateTemplate = async () => {
  let template = '';
  try {
    const data = await getData(targetUrl.replaceAll('~~', '=').replaceAll('??', '&'));
    template = `
      <section>
        <h1>Taiwan / Full-time / Frontend Developer</h1>
        ${data.map(d => (
          `<article style="margin-bottom: 20px; font-size: 14px;">
            <div>
              <a href="${origin}/en/jobs/${d.id}" target="_blank">
                <strong>${d.title}</strong>
              </a>
              (<a href="${d.employer?.url}" target="_blank">
                ${d.employer?.name}
              </a>)
            </div>
            <div style="display: flex;">
              <div style="width: 100px;">
                <img src="${d.employer?.logo?.url}" width="80" />
              </div>
              <div>
                <div>
                  ${d.salary?.currency} ${d.salary?.minimum} - ${d.salary?.maximum} (${d.salary?.paid_period})
                </div>
                <div>
                  ${d.address?.handwriting_city}, ${d.address?.handwriting_country}
                  ${d.address?.handwriting_street ? `(${d.address?.handwriting_street})` : ''}
                </div>
                <div>
                  ${d.published_at?.split('T')?.[0]}
                  (Updated: ${d.updated_at?.split('T')?.[0]})
                </div>
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
    }
    sendMail({ subject: process.env.INFO_OPENINGS_MJ_SUBJECT, html });
  });
