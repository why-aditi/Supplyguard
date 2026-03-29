/**
 * RSS Ingestion Worker — Auto-polls free news feeds, classifies disruptions via ML
 * 
 * Feeds polled every 15 minutes via node-cron. Articles are deduped by URL,
 * classified by the ML service, and auto-create disruption events if confidence ≥ threshold.
 */

import Parser from 'rss-parser';
import cron from 'node-cron';

// Free RSS feeds for supply chain news
const RSS_FEEDS = [
  {
    url: 'https://news.google.com/rss/search?q=port+congestion+shipping+delay&hl=en-US&gl=US&ceid=US:en',
    name: 'Google News — Port Congestion',
  },
  {
    url: 'https://news.google.com/rss/search?q=supply+chain+disruption&hl=en-US&gl=US&ceid=US:en',
    name: 'Google News — Supply Chain',
  },
  {
    url: 'https://news.google.com/rss/search?q=shipping+strike+port+closure&hl=en-US&gl=US&ceid=US:en',
    name: 'Google News — Strikes & Closures',
  },
  {
    url: 'https://feeds.bbci.co.uk/news/business/rss.xml',
    name: 'BBC Business',
  },
  {
    url: 'https://news.google.com/rss/search?q=semiconductor+shortage+chip+supply&hl=en-US&gl=US&ceid=US:en',
    name: 'Google News — Semiconductors',
  },
];

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const CONFIDENCE_THRESHOLD = parseFloat(process.env.NLP_CONFIDENCE_THRESHOLD || '0.55');

export class RSSWorker {
  constructor({ onDisruption }) {
    this.onDisruption = onDisruption;
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'SupplyGuard-RSS/1.0',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
    });
    this.seenUrls = new Set();
    this.stats = {
      lastPollTime: null,
      totalArticlesProcessed: 0,
      disruptionsTriggered: 0,
      feedErrors: 0,
      lastArticles: [], // keep last 10 classified articles
    };
    this.cronJob = null;
  }

  start() {
    console.log('[RSS] Worker starting...');
    console.log(`[RSS] Monitoring ${RSS_FEEDS.length} feeds, threshold: ${CONFIDENCE_THRESHOLD}`);

    // Initial poll on startup (after 10s delay to let ML service start)
    setTimeout(() => this._pollAll(), 10_000);

    // Schedule every 15 minutes
    this.cronJob = cron.schedule('*/15 * * * *', () => {
      this._pollAll();
    });

    console.log('[RSS] Cron scheduled: every 15 minutes');
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    console.log('[RSS] Worker stopped');
  }

  async _pollAll() {
    console.log(`[RSS] Polling ${RSS_FEEDS.length} feeds...`);
    this.stats.lastPollTime = new Date().toISOString();

    const results = await Promise.allSettled(
      RSS_FEEDS.map((feed) => this._pollFeed(feed))
    );

    let newArticles = 0;
    let errors = 0;
    for (const result of results) {
      if (result.status === 'fulfilled') {
        newArticles += result.value;
      } else {
        errors++;
        this.stats.feedErrors++;
      }
    }

    console.log(`[RSS] Poll complete: ${newArticles} new articles, ${errors} feed errors`);
  }

  async _pollFeed(feed) {
    let newCount = 0;

    try {
      const rss = await this.parser.parseURL(feed.url);
      const items = (rss.items || []).slice(0, 10); // Latest 10 per feed

      for (const item of items) {
        const url = item.link || item.guid || '';
        if (!url || this.seenUrls.has(url)) continue;

        this.seenUrls.add(url);
        newCount++;

        const title = (item.title || '').trim();
        const body = (item.contentSnippet || item.content || '').trim().slice(0, 500);

        if (!title) continue;

        // Classify via ML service
        try {
          const classification = await this._classify(title, body);
          this.stats.totalArticlesProcessed++;

          // Store for status endpoint
          this.stats.lastArticles = [
            {
              title: title.slice(0, 100),
              source: feed.name,
              type: classification.disruption_type,
              confidence: classification.confidence,
              timestamp: new Date().toISOString(),
            },
            ...this.stats.lastArticles,
          ].slice(0, 10);

          // If disruption detected with sufficient confidence
          if (
            classification.disruption_type !== 'none' &&
            classification.confidence >= CONFIDENCE_THRESHOLD
          ) {
            this.stats.disruptionsTriggered++;

            console.log(
              `[RSS] Disruption detected: "${title.slice(0, 60)}..." -> ${classification.disruption_type} (${(classification.confidence * 100).toFixed(0)}%)`
            );

            if (this.onDisruption) {
              this.onDisruption({
                source: 'rss',
                disruption_type: classification.disruption_type,
                severity: classification.severity || 0.7,
                location: classification.location || '',
                affected_node_id: this._matchNode(title, classification),
                confidence: classification.confidence,
                details: {
                  headline: title,
                  source_feed: feed.name,
                  url,
                  published: item.pubDate || item.isoDate || null,
                },
              });
            }
          }
        } catch (err) {
          // ML service unavailable — skip classification silently
        }
      }
    } catch (err) {
      console.warn(`[RSS] Feed error (${feed.name}): ${err.message}`);
      throw err;
    }

    return newCount;
  }

  async _classify(title, body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(`${ML_SERVICE_URL}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`ML service returned ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Try to match the article to a node in the supply chain graph.
   * Simple keyword matching against known port/hub names.
   */
  _matchNode(title, classification) {
    const text = title.toLowerCase();

    const nodeKeywords = {
      'port-shanghai': ['shanghai'],
      'port-shenzhen': ['shenzhen', 'yantian', 'shekou'],
      'port-singapore': ['singapore'],
      'port-rotterdam': ['rotterdam'],
      'port-la': ['los angeles', 'long beach', 'la port'],
      'port-hamburg': ['hamburg'],
      'port-busan': ['busan', 'pusan'],
      'port-dubai': ['dubai', 'jebel ali'],
      'port-mumbai': ['mumbai', 'nhava sheva', 'jnpt'],
      'hub-suez': ['suez', 'red sea'],
      'hub-malacca': ['malacca', 'singapore strait'],
      'hub-panama': ['panama canal'],
      'mfg-tsmc': ['tsmc', 'taiwan semiconductor'],
      'mfg-samsung-semi': ['samsung', 'pyeongtaek'],
      'mfg-foxconn': ['foxconn', 'hon hai'],
      'mfg-bosch': ['bosch'],
      'mfg-catl': ['catl', 'contemporary amperex'],
    };

    for (const [nodeId, keywords] of Object.entries(nodeKeywords)) {
      for (const kw of keywords) {
        if (text.includes(kw)) return nodeId;
      }
    }

    // Default to a general node based on disruption type
    const typeDefaults = {
      port_delay: 'port-shanghai',
      weather_event: 'hub-suez',
      supplier_failure: 'mfg-tsmc',
      geopolitical: 'hub-suez',
      transport_strike: 'port-rotterdam',
      customs_delay: 'port-la',
    };

    return typeDefaults[classification.disruption_type] || 'port-shanghai';
  }

  getStatus() {
    return {
      running: !!this.cronJob,
      feed_count: RSS_FEEDS.length,
      ...this.stats,
      seen_urls_count: this.seenUrls.size,
    };
  }
}
