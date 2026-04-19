package crawlers

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"jobsnipe/crawler/kafka"
	"jobsnipe/crawler/models"

	"github.com/PuerkitoBio/goquery"
)

type WellfoundCrawler struct {
	producer *kafka.Producer
}

func NewWellfoundCrawler(producer *kafka.Producer) *WellfoundCrawler {
	return &WellfoundCrawler{producer: producer}
}

func (c *WellfoundCrawler) Scrape(role, location string) {
	searchURL := fmt.Sprintf(
		"https://wellfound.com/jobs?q=%s&l=%s",
		role, location,
	)

	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest("GET", searchURL, nil)
	if err != nil {
		log.Println("Wellfound request error:", err)
		return
	}
	req.Header.Set("User-Agent", "Mozilla/5.0")

	resp, err := client.Do(req)
	if err != nil {
		log.Println("Wellfound fetch error:", err)
		return
	}
	defer resp.Body.Close()

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		log.Println("Wellfound parse error:", err)
		return
	}

	doc.Find(".job-listing").Each(func(i int, s *goquery.Selection) {
		title := s.Find(".job-title").Text()
		company := s.Find(".company-name").Text()
		location := s.Find(".job-location").Text()
		link, _ := s.Find("a").Attr("href")

		job := models.Job{
			Title:    title,
			Company:  company,
			Location: location,
			JobURL:   fmt.Sprintf("https://wellfound.com%s", link),
			Source:   "wellfound",
			PostedAt: time.Now().Format(time.RFC3339),
		}

		if err := c.producer.PublishJob(job); err != nil {
			log.Println("Failed to publish Wellfound job:", err)
		}
	})
}