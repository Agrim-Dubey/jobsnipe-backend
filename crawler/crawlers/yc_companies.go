package crawlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"jobsnipe/crawler/kafka"
	"jobsnipe/crawler/models"
)

type YCCrawler struct {
	producer *kafka.Producer
}

type ycResponse struct {
	Companies []struct {
		Name        string `json:"name"`
		Description string `json:"one_liner"`
		Website     string `json:"website"`
		IsHiring    bool   `json:"is_hiring"`
		JobsURL     string `json:"jobsUrl"`
	} `json:"companies"`
}

func NewYCCrawler(producer *kafka.Producer) *YCCrawler {
	return &YCCrawler{producer: producer}
}

func (c *YCCrawler) Scrape(role, location string) {
	url := "https://www.ycombinator.com/companies?isHiring=true"

	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		log.Println("YC request error:", err)
		return
	}
	req.Header.Set("User-Agent", "Mozilla/5.0")

	resp, err := client.Do(req)
	if err != nil {
		log.Println("YC fetch error:", err)
		return
	}
	defer resp.Body.Close()

	var ycResp ycResponse
	if err := json.NewDecoder(resp.Body).Decode(&ycResp); err != nil {
		log.Println("YC parse error:", err)
		return
	}

	for _, company := range ycResp.Companies {
		if !company.IsHiring {
			continue
		}

		job := models.Job{
			Title:       role,
			Company:     company.Name,
			Description: company.Description,
			JobURL:      company.JobsURL,
			Source:      "yc_companies",
			Location:    location,
			PostedAt:    time.Now().Format(time.RFC3339),
		}

		if err := c.producer.PublishJob(job); err != nil {
			log.Println("Failed to publish YC job:", err)
		}
	}
}