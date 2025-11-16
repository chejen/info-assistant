import { setTimeout } from 'node:timers/promises';
import { load } from 'cheerio';
import { sendMail } from '../util/sendMail.js';

const origin = process.env.INFO_EXHIBITION_SS_ORIGIN;
const targetUrl = `${origin}${process.env.INFO_EXHIBITION_SS_PATHNAME}`;
const idleInMilliseconds = 1234;

const getData = url => fetch(url)
  .then(response => response.text())
  .then(text => {
    const $ = load(text);
    const data = [];
    let maxPage = 1;
    $('#list_page li a')
      .each((i, el) => {
        let page = Number($(el).text().trim());
        if (page > maxPage) maxPage = page;
      });
    $('#exhibition .row_rt')
      .each((i, el) => {
        data.push({
          pathname: $(el).find('a').attr('href'),
          date: $(el).find('.date').text(),
          title: $(el).find('.lv_h2').text(),
          desc: $(el).find('.article').text(),
        });
      });

    console.log(`[${new Date()}] ${url} has parsed.`);
    return {
      data,
      maxPage,
    };
  })
  .catch(e => {
    console.error(`[${new Date()}][ERR] failed to execute getData().`);
    throw e;
  });

const generateTemplate = async () => {
  let template = '';
  try {
    const events = [];
    let currentPage = 1;
    let maxPage = 1;
    let dataPerPage = await getData(targetUrl);
    events.push(...dataPerPage.data);
    while (dataPerPage.maxPage > currentPage++) {
      await setTimeout(idleInMilliseconds);
      dataPerPage = await getData(`${targetUrl}?page=${currentPage}`);
      events.push(...dataPerPage.data);
    }

    template = `
      <section>
        ${events.map(el => (
          `<article>
            <span style="padding-right: 10px;">${el.date}</span>
            <a href="${origin}${el.pathname}" target="_blank">${el.title}</a>
            <p>${el.desc}</p>
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
    sendMail({ subject: process.env.INFO_EXHIBITION_SS_SUBJECT, html });
  });
