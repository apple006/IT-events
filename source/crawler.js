import { URLSearchParams } from 'url';

import { JSDOM } from 'jsdom';

import fetch from 'node-fetch';

import { event_list, makeDate } from './utility';

export async function* HuoDongXing(all) {
    for (let page = 1; ; page++) {
        let URL = `https://www.huodongxing.com/eventlist?${new URLSearchParams({
                orderby: 'n',
                status: all ? '' : 1,
                tag: 'IT互联网',
                city: '全部',
                page
            })}`,
            empty = true;

        for await (const item of event_list(
            URL,
            '.search-tab-content-list .search-tab-content-item',
            '.item-title',
            '.item-data',
            '.item-dress',
            '.item-logo',
            '.item-title'
        )) {
            empty = false;

            const [start, end] = item.start.split('-');

            (item.start = makeDate(start)), (item.end = makeDate(end));

            yield item;
        }

        if (empty) break;
    }
}

export async function* SegmentFault(all) {
    for (let page = 1; ; page++) {
        let URL = 'https://segmentfault.com/events?page=' + page,
            empty = true,
            now = new Date();

        for await (const item of event_list(
            URL,
            '.all-event-list .widget-event',
            '.title',
            '.widget-event__meta > :first-child',
            '.widget-event__meta > :last-child',
            '.widget-event__banner',
            '.title > a'
        )) {
            empty = false;

            (item.start = makeDate(item.start.slice(3))),
            (item.address = item.address.slice(3));

            if (!all && now > item.start) return;

            yield item;
        }

        if (empty) break;
    }
}

export async function* JueJin(all) {
    for (let pageNum = 1; ; pageNum++) {
        const URL =
                'https://event-storage-api-ms.juejin.im/v2/getEventList?' +
                new URLSearchParams({
                    src: 'web',
                    orderType: 'startTime',
                    pageNum
                }),
            now = new Date();

        const data = (await (await fetch(URL)).json()).d;

        if (!(data || '')[0]) break;

        console.warn(URL);

        for (let {
            title,
            eventUrl,
            tagInfo,
            content,
            startTime,
            endTime,
            city,
            screenshot
        } of data) {
            (startTime = makeDate(startTime)), (endTime = makeDate(endTime));

            if (!all && now > startTime) return;

            yield {
                title,
                start: startTime,
                end: endTime,
                address: city,
                tags: tagInfo.map(({ title }) => title),
                summary: content,
                link: eventUrl,
                banner: screenshot
            };
        }
    }
}

export async function* BaiGe(all) {
    const {
        window: {
            document: { head }
        }
    } = await JSDOM.fromURL(
        'https://www.bagevent.com/eventlist.html?f=1&tag=17&r=orderByNew'
    );

    const { paramMap, imgDomain, mainDomain } = new Function(`${
        [].find.call(head.querySelectorAll('script:not(:empty)'), code =>
            /var param = \{[\s\S]+\}/.test(code.text)
        ).text
    }
        return param;`)();

    for (let i = 1; ; i++) {
        paramMap.pagingPage = i;

        const URL =
                mainDomain +
                '/load/loadSearchEventList.do?' +
                new URLSearchParams(paramMap),
            now = new Date();

        const data = (await (await fetch(URL)).json()).resultObject.valueList
            .list;

        if (!(data || '')[0]) break;

        console.warn(URL);

        for (let { event_name, start_time, address, logo, event_id } of data) {
            start_time = makeDate(start_time);

            if (!all && now > start_time) return;

            yield {
                title: event_name,
                start: start_time,
                address,
                banner: imgDomain + logo,
                link: mainDomain + '/event/' + event_id
            };
        }
    }
}

export async function* OSChina(all) {
    for (let p = 1; ; p++) {
        const body = new URLSearchParams({
                tab: 'latest',
                time: 'all',
                p
            }),
            URL = 'https://www.oschina.net/action/ajax/get_more_event_list',
            now = new Date();

        let data = await (await fetch(URL, {
                method: 'POST',
                body
            })).text(),
            empty = true;

        for await (const item of event_list(
            new JSDOM(data, { url: URL + '?' + body }),
            '.event-item',
            '.summary',
            '.when-where > label:first-of-type',
            '.when-where > label:last-of-type',
            '.item-banner img',
            '.item-banner > a'
        )) {
            empty = false;

            item.start = makeDate(item.start);

            if (!all && now > item.start) return;

            yield item;
        }

        if (empty) break;
    }
}
