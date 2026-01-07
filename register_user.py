import requests, json
url = 'http://127.0.0.1:5000/api/auth/register'
payload = {
    "name": "Examiner One",
    "email": "examiner@example.com",
    "password": "password123",
    "role": "examiner"
}
resp = requests.post(url, json=payload)
print('Status:', resp.status_code)
print('Response:', resp.text)
