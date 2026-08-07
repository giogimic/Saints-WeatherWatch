import urllib.request
import urllib.parse
import json

url = "https://newengland511.org/cctv"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
}

params = {
    'draw': '1',
    'start': '0',
    'length': '500',
    'search[value]': '',
    'search[regex]': 'false'
}

query = urllib.parse.urlencode(params)
full_url = f"{url}?{query}"
req = urllib.request.Request(full_url, headers=headers)

try:
    with urllib.request.urlopen(req) as resp:
        body = resp.read().decode('utf-8')
        print("Status:", resp.status)
        parsed = json.loads(body)
        print("Data length:", len(parsed.get('data', [])))
        if parsed.get('data'):
            print("First item:", parsed['data'][0])
except Exception as e:
    print("Error:", e)
