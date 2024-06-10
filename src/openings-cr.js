import { setTimeout } from 'node:timers/promises';
import { load } from 'cheerio';
import { sendMail } from '../util/sendMail.js';

const origin = process.env.INFO_OPENINGS_CR_ORIGIN;
const activeWithinDays = +(process.env.INFO_OPENINGS_CR_ACTIVE_WITHIN_DAYS || 30);
const idleInMilliseconds = 1234;

const getData = url => fetch(url)
  .then(response => response.text())
  .then(text => {
    const $ = load(text);
    const data = [];
    const ids = [];

    $('[class^="JobSearchItem_wrapper"]').each((index, el) => {
      const pathname = $(el).find('[class*="_jobTitle_"]').attr('href');
      const id = pathname?.split('/')?.pop();
      ids.push(id);
      data.push({
        title: $(el).find('[class*="_jobTitle_"]').text(),
        pathname,
        id,
        company: $(el).find('[class*="_companyName_"]').text(),
        companyPathname: $(el).find('[class*="_companyName_"]').attr('href'),
        companyLogo: $(el).find('[class^="CompanyLogo_wrapper"] > img').attr('src'),
        salary: $(el).find('[class^="JobSearchItem_features"] [class*="_inlineMessage_"]:nth-child(3) [class*="_label_"]').text(),
        location: $(el).find('[class*="_featureSegmentLink_"]').text(),
      });
    });

    console.log(`[${new Date()}] ${url} has parsed.`);
    return { ids, data };
  })
  .then(async result => {
    await setTimeout(idleInMilliseconds);
    const metaUrl = new URL(`${origin}${process.env.INFO_OPENINGS_CR_ENDPOINT_META}`);
    metaUrl.searchParams.set('paths', result.ids.filter(id => id).join());
    const metaResponse = await fetch(metaUrl.href);
    const metaResult = await metaResponse.json();
    console.log(`[${new Date()}] ${metaUrl.href} has fetched.`);
    return { ...result, meta: metaResult?.jobs_meta };
  })
  .then(({ data, meta }) => data.map(d => {
    if (meta[d.id]) {
      d.pageLastActiveAt = meta[d.id].page_last_active_at?.split('T')[0];
    }
    return d;
  }))
  .catch(e => {
    console.error(`[${new Date()}][ERR] failed to execute getData().`);
    throw e;
  });

const generateTemplate = async ({ heading, targetUrl }) => {
  let template = '';
  try {
    let page = 1;
    let dataPerPage = await getData(`${origin}${targetUrl}`);
    let data = dataPerPage;
    while (data?.length % 10 === 0) {
      await setTimeout(idleInMilliseconds);
      let dataPerPage = await getData(`${origin}${targetUrl}&page=${++page}`);
      data = [...data, ...dataPerPage];
    }
    template = `
      <section>
        <h1>${heading} (in ${activeWithinDays} days)</h1>
        ${data
          // within specified days
          .filter(d => (new Date() - new Date(d.pageLastActiveAt)) / 86400000 <= activeWithinDays)
          // sorted by pageLastActiveAt in descending order
          .sort((a, b) => new Date(b.pageLastActiveAt) - new Date(a.pageLastActiveAt))
          .map(d => (
            `<article style="margin-bottom: 20px; font-size: 14px;">
              <div>
                <a href="${origin}${d.pathname}" target="_blank">
                  <strong>${d.title}</strong>
                </a>
              </div>
              <div style="display: flex;">
                <div style="width: 100px;">
                  <img src="${d.companyLogo}" width="80" />
                </div>
                <div>
                  <div>
                    <a href="${origin}${d.companyPathname}" target="_blank">
                      ${d.company}
                    </a>
                  </div>
                  <div>${d.salary}</div>
                  <div>${d.location}</div>
                  <div>${d.pageLastActiveAt}</div>
                </div>
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
    heading: process.env.INFO_OPENINGS_CR_HEADING_YEARLY,
    targetUrl: process.env.INFO_OPENINGS_CR_PATHNAME_YEARLY,
  });

  await setTimeout(idleInMilliseconds);

  const monthlyHtml = await generateTemplate({
    heading: process.env.INFO_OPENINGS_CR_HEADING_MONTHLY,
    targetUrl: process.env.INFO_OPENINGS_CR_PATHNAME_MONTHLY,
  });

  if (!yearlyHtml && !monthlyHtml) {
    console.error(`[${new Date()}][ERR] empty template.`);
    return;
  }
  sendMail({
    subject: process.env.INFO_OPENINGS_CR_SUBJECT,
    html: yearlyHtml + monthlyHtml,
  });
})();
