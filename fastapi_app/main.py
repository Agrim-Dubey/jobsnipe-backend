from fastapi import FastAPI



app = FastAPI()

@app.get("/")
def read_root():
    return {"message":"welcome to the jobsnipe backend"}

@app.get("/health")
def health_route():
    return {"status": "okay the status is fine"}

