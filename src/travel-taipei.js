import { load } from 'cheerio';
import { sendMail } from '../util/sendMail.js';

const origin = process.env.INFO_TRAVEL_TAIPEI_ORIGIN;
const targetUrl = `${origin}${process.env.INFO_TRAVEL_TAIPEI_PATHNAME}`;

const getData = url => fetch(url)
  .then(response => response.text())
  .then(text => {
    const $ = load(text);
    const data = [];
    $('.info-card-item .link')
      .each((i, el) => {
        data.push({
          pathname: $(el).attr('href'),
          date: $(el).find('.date').text(),
          title: $(el).find('.info-title').text(),
        });
      });

    console.log(`[${new Date()}] "Travel Taipei" has parsed.`);
    return data;
  })
  .catch(error => {
    return Promise.reject(error);
  });

const generateTemplate = async () => {
  let template = '';
  try {
    const data = await getData(targetUrl);
    template = `
      <ol>
        ${data.map(el => (
          `<li>
            <a href="${origin}${el.pathname}" target="_blank">(${el.date}) ${el.title}</a>
          </li>`
        )).join('')}
      </ol>
    `;
  } catch (e) {
    console.error(`[${new Date()}][ERR] failed to generate html template.`);
    console.error(e);
  }

  return template;
}

generateTemplate()
  .then(html => {
    if (!html) {
      console.error(`[${new Date()}][ERR] empty template.`);
    }
    sendMail({ subject: '[GitHub Actions] Weekly Travel in Taipei', html });
  })
  .catch(e => {
    console.error(`[${new Date()}][ERR] failed to send email.`);
    console.error(e);
  });
