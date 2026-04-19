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

type IndeedCrawler struct {
	producer *kafka.Producer
}

func NewIndeedCrawler(producer *kafka.Producer) *IndeedCrawler {
	return &IndeedCrawler{producer: producer}
}

func (c *IndeedCrawler) Scrape(role, location string) {
	searchURL := fmt.Sprintf(
		"https://www.indeed.com/jobs?q=%s&l=%s",
		role, location,
	)

	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest("GET", searchURL, nil)
	if err != nil {
		log.Println("Indeed request error:", err)
		return
	}
	req.Header.Set("User-Agent", "Mozilla/5.0")

	resp, err := client.Do(req)
	if err != nil {
		log.Println("Indeed fetch error:", err)
		return
	}
	defer resp.Body.Close()

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		log.Println("Indeed parse error:", err)
		return
	}

	doc.Find(".job_seen_beacon").Each(func(i int, s *goquery.Selection) {
		title := s.Find(".jobTitle").Text()
		company := s.Find(".companyName").Text()
		location := s.Find(".companyLocation").Text()
		link, _ := s.Find("a").Attr("href")

		job := models.Job{
			Title:    title,
			Company:  company,
			Location: location,
			JobURL:   fmt.Sprintf("https://www.indeed.com%s", link),
			Source:   "indeed",
			PostedAt: time.Now().Format(time.RFC3339),
		}

		if err := c.producer.PublishJob(job); err != nil {
			log.Println("Failed to publish Indeed job:", err)
		}
	})
}