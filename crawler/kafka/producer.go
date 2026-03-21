package kafka

import (
	"context"
	"encoding/json"
	"time"

	"jobsnipe/crawler/models"

	kafka "github.com/segmentio/kafka-go"
)

type Producer struct {
	writer *kafka.Writer
}

func NewProducer(broker, topic string) *Producer {
	writer := kafka.NewWriter(kafka.WriterConfig{
		Brokers: []string{broker},
		Topic:   topic,
	})
	return &Producer{writer: writer}
}

func (p *Producer) PublishJob(job models.Job) error {
	event := models.CrawlEvent{
		EventType: "job.found",
		PayLoad:   job,
		CreatedAt: time.Now().Format(time.RFC3339),
	}

	bytes, err := json.Marshal(event)
	if err != nil {
		return err
	}

	return p.writer.WriteMessages(context.Background(),
		kafka.Message{Value: bytes},
	)
}

func (p *Producer) Close() {
	p.writer.Close()
}