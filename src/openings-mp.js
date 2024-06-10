import { setTimeout } from 'node:timers/promises';
import { load } from 'cheerio';
import { sendMail } from '../util/sendMail.js';

const origin = process.env.INFO_OPENINGS_MP_ORIGIN;
const idleInMilliseconds = 1234;

const getData = url => fetch(url)
  .then(response => response.text())
  .then(text => {
    const $ = load(text);
    const data = [];

    $('.views-row').each((index, el) => {
      data.push({
        title: $(el).find('h3 a').text(),
        pathname: $(el).find('h3 a').attr('href'),
        salary: $(el).find('.job-salary')?.text()?.trim(),
        location: $(el).find('.job-location')?.text()?.trim(),
        desc: $(el).find('.job_advert__job-summary-text')?.html(),
        bulletPoints: $(el).find('.job_advert__job-desc-bullet-points')?.html(),
      });
    });

    console.log(`[${new Date()}] ${url} has parsed.`);
    return data;
  })
  .catch(e => {
    console.error(`[${new Date()}][ERR] failed to execute getData().`);
    throw e;
  });

const generateTemplate = async ({ heading, targetUrl }) => {
  let template = '';
  try {
    const data = await getData(`${origin}${targetUrl}`);
    template = `
      <section>
        <h1>${heading}</h1>
        ${data
          .map(d => (
            `<article style="margin-bottom: 20px; font-size: 14px;">
              <div>
                <a href="${origin}${d.pathname}" target="_blank">
                  <strong>${d.title}</strong>
                </a>
              </div>
              <div>${d.salary} / ${d.location}</div>
              ${d.desc}
              ${d.bulletPoints}
            </article>`
          ))
          .join('\n')
        }
      </section>
    `;
  } catch (e) {
    console.error(`[${new Date()}][ERR] failed to generate html template.`);
    throw e;
  }

  return template;
}

(async function execute () {
  const feHtml = await generateTemplate({
    heading: process.env.INFO_OPENINGS_MP_HEADING_FE,
    targetUrl: process.env.INFO_OPENINGS_MP_PATHNAME_FE,
  });

  await setTimeout(idleInMilliseconds);

  const webHtml = await generateTemplate({
    heading: process.env.INFO_OPENINGS_MP_HEADING_WEB,
    targetUrl: process.env.INFO_OPENINGS_MP_PATHNAME_WEB,
  });

  if (!feHtml && !webHtml) {
    console.error(`[${new Date()}][ERR] empty template.`);
    return;
  }
  sendMail({
    subject: process.env.INFO_OPENINGS_MP_SUBJECT,
    html: feHtml + webHtml,
  });
})();
