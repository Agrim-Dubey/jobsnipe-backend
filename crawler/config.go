package main
import (
	"os"
	"strconv"
)
type Config struct{
	KafkaBroker string
	KafkaTopic string
	CrawlInterval int
}
func LoadConfig() Config{
	kafkaBrokerURL := os.Getenv("KAFKA_URL")
	if kafkaBrokerURL == ""{
	kafkaBrokerURL = "localhost:9092"
	}
	kafkaTopic:= os.Getenv("KAFKA_TOPIC")
	if kafkaTopic ==""{
		kafkaTopic="jobs"
	}
	crawlInterval:=os.Getenv("CRAWL_INTERVAL")
	if crawlInterval == ""{
		crawlInterval = "3600"
	}
	interval, err := strconv.Atoi(crawlInterval)
	if err != nil{
		interval=3600
	}
	return Config{
    KafkaBroker:   kafkaBrokerURL,
    KafkaTopic:    kafkaTopic,
    CrawlInterval: interval,
}
}
