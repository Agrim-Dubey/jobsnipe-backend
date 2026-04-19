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

type RedditCrawler struct {
	producer *kafka.Producer
}

type redditResponse struct {
	Data struct {
		Children []struct {
			Data struct {
				Title     string `json:"title"`
				URL       string `json:"url"`
				Selftext  string `json:"selftext"`
				Author    string `json:"author"`
				Permalink string `json:"permalink"`
			} `json:"data"`
		} `json:"children"`
	} `json:"data"`
}

var jobSubreddits = []string{
	"forhire",
	"remotework",
	"cscareerquestions",
	"IndiaJobs",
	"jobbit",
	"techjobs",
}

func NewRedditCrawler(producer *kafka.Producer) *RedditCrawler {
	return &RedditCrawler{producer: producer}
}

func (c *RedditCrawler) Scrape(role, location string) {
	client := &http.Client{Timeout: 10 * time.Second}

	for _, subreddit := range jobSubreddits {
		searchURL := fmt.Sprintf(
			"https://www.reddit.com/r/%s/search.json?q=%s&restrict_sr=1&sort=new",
			subreddit, role,
		)

		req, err := http.NewRequest("GET", searchURL, nil)
		if err != nil {
			log.Println("Reddit request error:", err)
			continue
		}
		req.Header.Set("User-Agent", "jobsnipe-crawler/1.0")

		resp, err := client.Do(req)
		if err != nil {
			log.Println("Reddit fetch error:", err)
			continue
		}
		defer resp.Body.Close()

		var redditResp redditResponse
		if err := json.NewDecoder(resp.Body).Decode(&redditResp); err != nil {
			log.Println("Reddit parse error:", err)
			continue
		}

		for _, child := range redditResp.Data.Children {
			post := child.Data
			job := models.Job{
				Title:       post.Title,
				Description: post.Selftext,
				JobURL:      fmt.Sprintf("https://reddit.com%s", post.Permalink),
				Source:      fmt.Sprintf("reddit/r/%s", subreddit),
				Location:    location,
				PostedAt:    time.Now().Format(time.RFC3339),
			}

			if err := c.producer.PublishJob(job); err != nil {
				log.Println("Failed to publish Reddit job:", err)
			}
		}
	}
}