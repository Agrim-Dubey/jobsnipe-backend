package scraper

import (
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"jobsnipe/crawler/kafka"
	"jobsnipe/crawler/models"

	"github.com/PuerkitoBio/goquery"
)

type CustomScraper struct {
	producer *kafka.Producer
}

func NewCustomScraper(producer *kafka.Producer) *CustomScraper {
	return &CustomScraper{producer: producer}
}

func (c *CustomScraper) Scrape(targetURL, role, location string) {
	client := &http.Client{Timeout: 10 * time.Second}

	req, err := http.NewRequest("GET", targetURL, nil)
	if err != nil {
		log.Println("Custom scraper request error:", err)
		return
	}
	req.Header.Set("User-Agent", "Mozilla/5.0")

	resp, err := client.Do(req)
	if err != nil {
		log.Println("Custom scraper fetch error:", err)
		return
	}
	defer resp.Body.Close()

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		log.Println("Custom scraper parse error:", err)
		return
	}

	jobKeywords := []string{"apply", "job", "career", "hiring", "opening", "position", "role"}

	doc.Find("a").Each(func(i int, s *goquery.Selection) {
		text := strings.ToLower(s.Text())
		link, exists := s.Attr("href")
		if !exists {
			return
		}

		for _, keyword := range jobKeywords {
			if strings.Contains(text, keyword) {
				if !strings.HasPrefix(link, "http") {
					link = fmt.Sprintf("%s%s", targetURL, link)
				}

				job := models.Job{
					Title:    s.Text(),
					JobURL:   link,
					Source:   fmt.Sprintf("custom:%s", targetURL),
					Location: location,
					PostedAt: time.Now().Format(time.RFC3339),
				}

				if err := c.producer.PublishJob(job); err != nil {
					log.Println("Failed to publish custom job:", err)
				}
				break
			}
		}
	})
}