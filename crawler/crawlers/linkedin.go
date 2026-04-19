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

type LinkedInCrawler struct {
	producer *kafka.Producer
}

func NewLinkedInCrawler(producer *kafka.Producer) *LinkedInCrawler {
	return &LinkedInCrawler{producer: producer}
}

func (c *LinkedInCrawler) Scrape(role, location string) {
	searchURL := fmt.Sprintf(
		"https://www.google.com/search?q=site:linkedin.com/jobs+%s+%s",
		role, location,
	)

	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest("GET", searchURL, nil)
	if err != nil {
		log.Println("LinkedIn request error:", err)
		return
	}
	req.Header.Set("User-Agent", "Mozilla/5.0")

	resp, err := client.Do(req)
	if err != nil {
		log.Println("LinkedIn fetch error:", err)
		return
	}
	defer resp.Body.Close()

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		log.Println("LinkedIn parse error:", err)
		return
	}

	doc.Find(".tF2Cxc").Each(func(i int, s *goquery.Selection) {
		title := s.Find("h3").Text()
		link, _ := s.Find("a").Attr("href")

		job := models.Job{
			Title:    title,
			JobURL:   link,
			Source:   "linkedin",
			Location: location,
			PostedAt: time.Now().Format(time.RFC3339),
		}

		if err := c.producer.PublishJob(job); err != nil {
			log.Println("Failed to publish LinkedIn job:", err)
		}
	})
}