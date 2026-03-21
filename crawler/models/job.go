package models

type Job struct {
	Title string `json:"title"`
	Company string `json:"company"`
	Location string `json:"location"`
	JObURL string `json:"job_url"`
	Description string `json:"description"`
	Salary string `json:"salary"`
	Source string `json:"source"`
	PostedAt string `json:"posted_at"`

}