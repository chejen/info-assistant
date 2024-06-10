import { setTimeout } from 'node:timers/promises';
import { load } from 'cheerio';
import { sendMail } from '../util/sendMail.js';

const origin = process.env.INFO_OPENINGS_1B_ORIGIN;
const amountPerPage = +process.env.INFO_OPENINGS_1B_AMOUNT_PER_PAGE;
const idleInMilliseconds = 1234;

const getData = url => fetch(url)
  .then(response => response.text())
  .then(text => {
    const $ = load(text);
    const data = [];

    $('[data-job-no]:not(.js-job-item--recommend)').each((index, el) => {
      const companyEl = $(el).find('.b-block__left > ul > li:nth-child(2) > a');
      const meta = [];
      $(el).find('.job-list-tag .b-tag--default').each((i, metaEl) => {
        meta.push($(metaEl).text());
      });
      data.push({
        title: $(el).find('.js-job-link').text(),
        pathname: $(el).find('.js-job-link').attr('href'),
        company: companyEl.text()?.replaceAll('\n', '')?.trim(),
        companyPathname: companyEl.attr('href'),
        location: companyEl.attr('title')?.split('\n')?.[1],
        updatedAt: $(el).find('.b-tit__date').text()?.replaceAll('\n', '')?.trim(),
        meta,
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
    let page = 1;
    let dataPerPage = await getData(`${origin}${targetUrl}&page=${page}`);
    let data = dataPerPage;
    while (
      dataPerPage?.length &&
      dataPerPage?.length % amountPerPage === 0
    ) {
      await setTimeout(idleInMilliseconds);
      dataPerPage = await getData(`${origin}${targetUrl}&page=${++page}`);
      data = [...data, ...dataPerPage];
    }
    template = `
      <section>
        <h1>${heading}</h1>
        ${data
          .map(d => (
            `<article style="margin-bottom: 20px; font-size: 14px;">
              <div>
                <a href="${d.pathname}" target="_blank">
                  <strong>${d.title}</strong>
                </a>
              </div>
              <div>
                <a href="${d.companyPathname}" target="_blank">
                  ${d.company}
                </a>
              </div>
              <div>${d.location}</div>
              <div>
                (${d.updatedAt})
                ${d.meta.join(' | ')}
              </div>
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
  const yearlyHtml = await generateTemplate({
    heading: process.env.INFO_OPENINGS_1B_HEADING_YEARLY,
    targetUrl: process.env.INFO_OPENINGS_1B_PATHNAME_YEARLY,
  });

  await setTimeout(idleInMilliseconds);

  const monthlyHtml = await generateTemplate({
    heading: process.env.INFO_OPENINGS_1B_HEADING_MONTHLY,
    targetUrl: process.env.INFO_OPENINGS_1B_PATHNAME_MONTHLY,
  });

  if (!yearlyHtml && !monthlyHtml) {
    console.error(`[${new Date()}][ERR] empty template.`);
    return;
  }
  sendMail({
    subject: process.env.INFO_OPENINGS_1B_SUBJECT,
    html: yearlyHtml + monthlyHtml,
  });
})();
