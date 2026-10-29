import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('refresh_news', Path(__file__).with_name('refresh-news.py'))
refresh_news = importlib.util.module_from_spec(spec)
spec.loader.exec_module(refresh_news)


class RefreshNewsTests(unittest.TestCase):
    def test_maps_official_feed_without_inventing_dates(self):
        feed = refresh_news.parse_feed('''<rss><channel><item>
          <title>F1 &amp; racing</title><description>&lt;p&gt;Latest news&lt;/p&gt;</description>
          <link>https://www.formula1.com/en/latest/article/test</link>
          </item></channel></rss>''')
        article = feed['articles'][0]
        self.assertEqual(article['title'], 'F1 & racing')
        self.assertEqual(article['description'], 'Latest news')
        self.assertEqual(article['pubDate'], '')
        self.assertEqual(article['thumbnail'], '')

    def test_rejects_error_pages_and_empty_feeds(self):
        for xml in ['<html>Access denied</html>', '<rss><channel/></rss>',
                    '<rss><channel><item><title>Unsafe</title><link>javascript:alert(1)</link></item></channel></rss>']:
            with self.subTest(xml=xml), self.assertRaises(ValueError):
                refresh_news.parse_feed(xml)


if __name__ == '__main__':
    unittest.main()
