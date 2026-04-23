import requests
import json

# Test the endpoint
url = "http://localhost:8000/api/grants/opportunities/from-excel-source"

# You'll need a valid token - let's try without auth first to see the error
response = requests.get(url)
print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")
print(f"Headers: {dict(response.headers)}")
