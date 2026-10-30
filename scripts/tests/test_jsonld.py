import unittest,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from check_jsonld import check
class Test(unittest.TestCase):
 def setUp(self):
  self.base='<html lang="ja"><head><title>Title</title><meta name="description" content="Description"><link rel="canonical" href="https://example.test/"></head><body><h1>Visible</h1><script>void 0;</script></body></html>'
  self.obj={'@context':'https://schema.org','@type':'WebSite','name':'Title','description':'Description','url':'https://example.test/','inLanguage':'ja'}
 def doc(self,obj=None):return self.base.replace('</head>','<script type="application/ld+json">'+json.dumps(obj or self.obj)+'</script></head>')
 def test_positive(self):self.assertTrue(check(self.base,self.doc(),'WebSite')['restoresOriginal'])
 def test_mutations(self):
  for key,value in [('name','Wrong'),('description','Wrong'),('url','https://other.test/'),('@type','SearchResultsPage'),('@context','https://evil.test'),('inLanguage','en'),('aggregateRating',{'ratingValue':5}),('price',100),('extra','x')]:
   with self.subTest(key=key),self.assertRaises(AssertionError):check(self.base,self.doc({**self.obj,key:value}),'WebSite')
 def test_duplicate_block(self):
  with self.assertRaises(AssertionError):check(self.base,self.doc().replace('</head>','<script type="application/ld+json">{}</script></head>'),'WebSite')
 def test_injection(self):
  with self.assertRaises((AssertionError,ValueError)):check(self.base,self.doc({**self.obj,'name':'</script><script>alert(1)</script>'}),'WebSite')
 def test_non_ld_changes(self):
  for old,new in [('Visible','Changed'),('void 0','alert(1)'),('<body>','<body style="color:red">')]:
   with self.subTest(old=old),self.assertRaises(AssertionError):check(self.base,self.doc().replace(old,new),'WebSite')
 def test_invalid_json(self):
  with self.assertRaises(ValueError):check(self.base,self.doc().replace('"@type":','"@type" '),'WebSite')
 def test_duplicate_key(self):
  with self.assertRaises(AssertionError):check(self.base,self.doc().replace('{"@context"','{"name":"Title","@context"'),'WebSite')
 def test_source_attribute(self):
  with self.assertRaises(AssertionError):check(self.base,self.doc().replace('type="application/ld+json"','type="application/ld+json" src="x.js"'),'WebSite')
if __name__=='__main__':unittest.main()
