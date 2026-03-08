import { setTimeout } from 'node:timers/promises';
import { load } from 'cheerio';
import { sendMail } from '../util/sendMail.js';

const baseUrl = process.env.INFO_WEATHER_BASE_URL;
const targets = (process.env.INFO_WEATHER_TARGETS || '').split(',');

const getData = id => fetch(`${baseUrl}${id}/weather-forecast/${id.split('/')[1]}`)
  .then(response => response.text())
  .then(text => {
    const $ = load(text);
    const data = [];

    $('.daily-list-item').each((index, detail) => {
      data.push({
        date: $(detail).find('.date').text().trim(),
        lowTemp: $(detail).find('.temp-lo').text(),
        highTemp: $(detail).find('.temp-hi').text(),
        desc: $(detail).find('.phrase .no-wrap').text(),
        precip: $(detail).find('.precip').text().trim(),
      });
    });

    console.log(`[${new Date()}] ${baseUrl}${id}/weather-forecast/${id.split('/')[1]} has parsed.`);
    return { data, title: $('h1.header-loc').text() };
  })
  .catch(e => {
    console.error(`[${new Date()}][ERR] failed to execute getData().`);
    throw e;
  });

const convertFahrenheitToCelsius = (fahrenheit) => {
  const f = fahrenheit.split('°')[0];
  return isNaN(f) ? '' : Math.round((f - 32) * 0.5556) + '°C';
}

const generateTemplate = async () => {
  let template = '';
  try {
    for (const target of targets) {
      await setTimeout(1234);
      const { title, data } = await getData(target);
      template += `
        <p>
          <h2>${title}</h2>
          <table style="border-collapse: collapse; border: 1px solid black;">
          ${data.map((el, i) => `
          <tr>
            <td>${el.date}</td>
            <td>${el.desc}</td>
            <td>
              <span style="color: ${+el.precip.split('%')[0] > 30 ? 'red' : 'black'}">
                precipitation: ${el.precip}
              </span>
            </td>
            <td>
              ${convertFahrenheitToCelsius(el.lowTemp)} -
              ${convertFahrenheitToCelsius(el.highTemp)}
            </td>
          </tr>`).join('')}
          </table>
        </p>
      `;
    }
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
    sendMail({ subject: 'Daily Weather', html });
  });
