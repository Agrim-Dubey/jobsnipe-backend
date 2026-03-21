package models

type CrawlEvent struct{
	EventType string `json:"event_type"`
	PayLoad Job `json:"payload"`
	CreatedAt string `json:"created_at"`
}