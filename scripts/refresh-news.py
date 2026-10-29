"""Publish the official RSS feed as a browser-readable static JSON asset."""
import argparse
from datetime import datetime, timezone
import html
import json
from pathlib import Path
import re
import urllib.request
import xml.etree.ElementTree as ET

FEED_URL = 'https://www.formula1.com/en/latest/all.xml'


def parse_feed(xml):
    root = ET.fromstring(xml)
    if root.tag != 'rss' or root.find('channel') is None:
        raise ValueError('Expected an RSS feed')
    articles = []
    for item in root.findall('./channel/item')[:30]:
        title = (item.findtext('title') or '').strip()
        link = (item.findtext('link') or '').strip()
        if not title or not link.startswith('https://www.formula1.com/'):
            continue
        enclosure = item.find('enclosure')
        thumbnail = enclosure.get('url', '') if enclosure is not None else ''
        articles.append({
            'title': title,
            'description': html.unescape(re.sub(r'<[^>]*>', '', item.findtext('description') or '')).strip(),
            'link': link,
            'pubDate': (item.findtext('pubDate') or '').strip(),
            'thumbnail': thumbnail if thumbnail.startswith('https://') else '',
            'source': 'Formula 1',
        })
    if not articles:
        raise ValueError('Feed contains no usable articles; preserving the published copy')
    return {'updatedAt': datetime.now(timezone.utc).isoformat(), 'articles': articles}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=Path, help='Use a downloaded RSS file')
    parser.add_argument('--output', type=Path, default=Path('data/news/news.json'))
    args = parser.parse_args()
    if args.input:
        xml = args.input.read_bytes()
    else:
        request = urllib.request.Request(FEED_URL, headers={'User-Agent': 'F1RaceLab-News/1.0'})
        with urllib.request.urlopen(request, timeout=30) as response:
            xml = response.read()
    feed = parse_feed(xml)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix('.tmp')
    temporary.write_text(json.dumps(feed, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(args.output)
    print(f'Published {len(feed["articles"])} articles to {args.output}')


if __name__ == '__main__':
    main()
