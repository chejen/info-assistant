import { setTimeout } from 'node:timers/promises';
import { load } from 'cheerio';
import { sendMail } from '../util/sendMail.js';

const baseUrl = process.env.INFO_WEATHER_BASE_URL;
const targets = (process.env.INFO_WEATHER_TARGETS || '').split(',');

const getData = id => fetch(`${baseUrl}${id}`)
  .then(response => response.text())
  .then(text => {
    const $ = load(text);
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
            <td>${el.day}</td>
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
    }
    sendMail({ subject: 'Daily Weather', html });
  });
