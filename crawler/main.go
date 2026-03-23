package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"jobsnipe/crawler/crawlers"
	"jobsnipe/crawler/kafka"
	"jobsnipe/crawler/scraper"
)

type UserPreferences struct {
	DesiredRoles       []string `json:"desired_roles"`
	PreferredLocations []string `json:"preferred_locations"`
}

func fetchPreferences(apiURL string) (*UserPreferences, error) {
	resp, err := http.Get(apiURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var prefs UserPreferences
	if err := json.NewDecoder(resp.Body).Decode(&prefs); err != nil {
		return nil, err
	}
	return &prefs, nil
}

func main() {
	cfg := LoadConfig()

	producer := kafka.NewProducer(cfg.KafkaBroker, cfg.KafkaTopic)
	defer producer.Close()

	linkedInCrawler := crawlers.NewLinkedInCrawler(producer)
	indeedCrawler := crawlers.NewIndeedCrawler(producer)
	wellfoundCrawler := crawlers.NewWellfoundCrawler(producer)
	hnCrawler := crawlers.NewHNHiringCrawler(producer)
	redditCrawler := crawlers.NewRedditCrawler(producer)
	ycCrawler := crawlers.NewYCCrawler(producer)
	customScraper := scraper.NewCustomScraper(producer)

	for {
		log.Println("Starting crawl cycle...")

		prefs, err := fetchPreferences("http://fastapi_app:8000/preferences/me")
		if err != nil {
			log.Println("Failed to fetch preferences:", err)
			time.Sleep(time.Duration(cfg.CrawlInterval) * time.Second)
			continue
		}

		for _, role := range prefs.DesiredRoles {
			for _, location := range prefs.PreferredLocations {
				var wg sync.WaitGroup

				wg.Add(6)

				go func() { defer wg.Done(); linkedInCrawler.Scrape(role, location) }()
				go func() { defer wg.Done(); indeedCrawler.Scrape(role, location) }()
				go func() { defer wg.Done(); wellfoundCrawler.Scrape(role, location) }()
				go func() { defer wg.Done(); hnCrawler.Scrape(role, location) }()
				go func() { defer wg.Done(); redditCrawler.Scrape(role, location) }()
				go func() { defer wg.Done(); ycCrawler.Scrape(role, location) }()

				wg.Wait()
			}
		}

		// custom scraper example — user defined URLs would come from preferences
		customScraper.Scrape("https://jobs.lever.co", "", "")

		log.Println("Crawl cycle done. Sleeping...")
		time.Sleep(time.Duration(cfg.CrawlInterval) * time.Second)
	}
}