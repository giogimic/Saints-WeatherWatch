import urllib.request
import json
import gzip

try:
    req = urllib.request.Request('https://newengland511.org/map/mapIcons/Cameras', headers={'User-Agent': 'Mozilla/5.0', 'Accept-Encoding': 'gzip'})
    r = urllib.request.urlopen(req)
    data = r.read()
    if r.info().get('Content-Encoding') == 'gzip':
        data = gzip.decompress(data)
    
    text = data.decode('utf-8')
    import re
    urls = re.findall(r'"imageUrl":"([^"]+)"', text)
    titles = re.findall(r'"title":"([^"]+)"', text)
    
    for i in range(min(len(urls), len(titles))):
        if any(x in titles[i] for x in ['Smyrna', 'Island Falls', 'Dickey', 'Fort Kent', 'Soucy', 'I-95']):
            print(f"{titles[i]}: {urls[i]}")
            
except Exception as e:
    print('Failed:', e)
