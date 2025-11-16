import { load } from 'cheerio';
import { sendMail } from '../util/sendMail.js';

const origin = process.env.INFO_EXHIBITION_HS_ORIGIN;
const targetUrl = `${origin}${process.env.INFO_EXHIBITION_HS_PATHNAME}`;

const getData = url => fetch(url)
  .then(response => response.text())
  .then(text => {
    const $ = load(text);
    const data = [];
    $('#event-ul a')
      .each((i, el) => {
        data.push({
          pathname: $(el).attr('href'),
          date: $(el).find('.event-date').text().trim(),
          title: $(el).find('.card-text-name').text(),
          // .get() converts the Cheerio object into a plain JavaScript array
          type: $(el).find('.event-list-type span').map((_i, _el) => $(_el).text()).get(),
        });
      });

    console.log(`[${new Date()}] ${url} has parsed.`);
    return data;
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
        ${data.map(el => (
          `<article style="padding: 5px 0;">
            <span style="padding-right: 10px;">${el.date}</span>
            ${el.type.map(t => `<span style="padding-right: 5px;">#${t}</span>`).join('')}
            <div><a href="${origin}${el.pathname}" target="_blank">${el.title}</a></div>
          </article>`
        )).join('')}
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
    sendMail({ subject: process.env.INFO_EXHIBITION_HS_SUBJECT, html });
  });
