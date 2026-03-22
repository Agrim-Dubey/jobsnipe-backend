package crawlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"jobsnipe/crawler/kafka"
	"jobsnipe/crawler/models"
)

type HNHiringCrawler struct {
	producer *kafka.Producer
}

type hnResponse struct {
	Hits []struct {
		ObjectID    string `json:"objectID"`
		StoryTitle  string `json:"story_title"`
		CommentText string `json:"comment_text"`
		Author      string `json:"author"`
	} `json:"hits"`
}

func NewHNHiringCrawler(producer *kafka.Producer) *HNHiringCrawler {
	return &HNHiringCrawler{producer: producer}
}

func (c *HNHiringCrawler) Scrape(role, location string) {
	searchURL := fmt.Sprintf(
		"https://hn.algolia.com/api/v1/search?query=%s+%s&tags=comment,story_author_whoishiring",
		role, location,
	)

	resp, err := http.Get(searchURL)
	if err != nil {
		log.Println("HN fetch error:", err)
		return
	}
	defer resp.Body.Close()

	var hnResp hnResponse
	if err := json.NewDecoder(resp.Body).Decode(&hnResp); err != nil {
		log.Println("HN parse error:", err)
		return
	}

	for _, hit := range hnResp.Hits {
		job := models.Job{
			Title:       role,
			Description: hit.CommentText,
			JobURL:      fmt.Sprintf("https://news.ycombinator.com/item?id=%s", hit.ObjectID),
			Source:      "hn_hiring",
			PostedAt:    time.Now().Format(time.RFC3339),
		}

		if err := c.producer.PublishJob(job); err != nil {
			log.Println("Failed to publish HN job:", err)
		}
	}
}