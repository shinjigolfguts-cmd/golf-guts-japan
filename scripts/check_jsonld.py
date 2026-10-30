"""Portable local identity-only JSON-LD check. No network. Run with two HTML directories."""
from html.parser import HTMLParser
import json,re
from pathlib import Path
class Page(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True);self.titles=[];self.desc=[];self.canon=[];self.lang=[];self.ld=[];self.active=None;self.head=False
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if t=='head':self.head=True
  if t=='html':self.lang.append(a.get('lang'))
  if t=='title':self.titles.append('');self.active='title'
  if t=='meta' and a.get('name')=='description':self.desc.append(a.get('content'))
  if t=='link' and 'canonical' in a.get('rel','').split():self.canon.append(a.get('href'))
  if t=='script' and a.get('type','').lower()=='application/ld+json':
   assert self.head and set(a)=={'type'},'LD must be inert inline head block';self.ld.append('');self.active='ld'
 def handle_data(self,s):
  if self.active=='title':self.titles[-1]+=s
  if self.active=='ld':self.ld[-1]+=s
 def handle_endtag(self,t):
  if t in ('script','title'):self.active=None
  if t=='head':self.head=False

def unique_object(pairs):
 d={}
 for k,v in pairs:
  assert k not in d,'duplicate JSON key';d[k]=v
 return d

def check(original,candidate,typ):
 p=Page();p.feed(candidate);b=Page();b.feed(original)
 assert len(p.ld)==1 and len(b.ld)==0
 assert len(p.titles)==len(p.desc)==len(p.canon)==1 and p.lang==['ja']
 obj=json.loads(p.ld[0],object_pairs_hook=unique_object)
 expected={'@context':'https://schema.org','@type':typ,'name':p.titles[0],'description':p.desc[0],'url':p.canon[0],'inLanguage':'ja'}
 assert obj==expected,'exact 6 keys and existing values required'
 assert p.titles==b.titles and p.desc==b.desc and p.canon==b.canon
 blocks=list(re.finditer(r'<script\s+type="application/ld\+json">[\s\S]*?</script>',candidate))
 assert len(blocks)==1
 m=blocks[0];assert candidate[:m.start()]+candidate[m.end():]==original,'non-LD byte changes'
 return {'type':typ,'structuredData':obj,'addedBytes':len(candidate.encode())-len(original.encode()),'restoresOriginal':True}
if __name__=='__main__':
 import sys
 print(json.dumps({f:check((Path(sys.argv[1])/f).read_text(),(Path(sys.argv[2])/f).read_text(),t) for f,t in [('index.html','WebSite'),('find.html','WebPage')]},ensure_ascii=False,indent=2))
