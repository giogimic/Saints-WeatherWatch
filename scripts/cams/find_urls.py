import urllib.request
import re

url = "https://newengland511.org/cctv"
html = urllib.request.urlopen(url).read().decode('utf-8')

for line in html.split('\n'):
    if 'script' in line.lower() or 'cctv' in line.lower() or 'data' in line.lower():
        print(line.strip())
