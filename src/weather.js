import axios from 'axios';
import { load } from 'cheerio';
import { sendMail } from '../util/sendMail.js';
import sleep from '../util/sleep.js';

const baseUrl = process.env.INFO_WEATHER_BASE_URL;
const targets = (process.env.INFO_WEATHER_TARGETS || '').split(',');

const converse = (fahrenheit) => {
  const f = fahrenheit.split('°')[0];
  return isNaN(f) ? '' : Math.round((f - 32) * 0.5556) + '°C';
}

const parse = id => axios
  .get(`${baseUrl}${id}`)
  .then(response => {
    const $ = load(response.data);
    const data = [];

    $('[id^="detailIndex"]').each((index, detail) => {
      data.push({
        day: $(detail).find('[data-testid="daypartName"]').text(),
        lowTemp: $(detail).find('[class*="lowTempValue"]').text(),
        highTemp: $(detail).find('[class*="highTempValue"]').text(),
        desc: $(detail).find('[data-testid="wxIcon"] span').text(),
        precip: $(detail).find('[data-testid="PercentageValue"]').first().text(),
      });
    });

    console.log(`[${new Date()}] ${baseUrl}${id} has parsed.`);
    return { data, title: $('[data-testid="PresentationName"]').text() };
  })
  .catch(error => {
    return Promise.reject(error);
  });

const fetchInfo = async () => {
  let info = '';
  try {
    for (const target of targets) {
      await sleep(1234);
      const { title, data } = await parse(target);
      info += `
        <p>
          <h2>${title}</h2>
          <table style="border-collapse: collapse; border: 1px solid black;">
          ${data.map((el, i) => `
          <tr>
            <td>${el.day}</td>
            <td>${el.desc}</td>
            <td><span style="color: ${+el.precip.split('%')[0] > 30 ? 'red' : 'black'}">precipitation: ${el.precip}</span></td>
            <td>${converse(el.lowTemp)} - ${converse(el.highTemp)}</td>
          </tr>`).join('')}
          </table>
        </p>
      `;
    }
  } catch (e) {
    console.error(`[${new Date()}][ERR] failed to parse.`);
    console.error(e);
  }

  return info;
}

fetchInfo().then(html => sendMail({ subject: 'Daily Weather', html }));
