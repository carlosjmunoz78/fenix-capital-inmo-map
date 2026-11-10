import hashlib, tempfile, unittest
from pathlib import Path
from io import BytesIO
from unittest.mock import patch
import polyhaven_auto_lab_v0 as p

class Response:
    status=200
    headers={"Content-Type":"image/jpeg"}
    def __init__(self,url,data):self.url=url;self.f=BytesIO(data)
    def geturl(self):return self.url
    def read(self,n):return self.f.read(n)
    def __enter__(self):return self
    def __exit__(self,*args):pass

class Tests(unittest.TestCase):
    def test_disallow_untrusted_hosts(self):
        for url in ["http://dl.polyhaven.org/file/ph-assets/a.jpg","https://evil.com/file/ph-assets/a.jpg",
                    "https://dl.polyhaven.org.evil.com/file/ph-assets/a.jpg","https://dl.polyhaven.org/other/a.jpg"]:
            self.assertFalse(p.safe_url(url))
    def test_good_host(self):
        self.assertTrue(p.safe_url("https://dl.polyhaven.org/file/ph-assets/a.jpg"))
    def test_selection(self):
        v={"url":"https://dl.polyhaven.org/file/ph-assets/a.jpg","size":1200,"md5":"a"*32}
        self.assertEqual(p.choose({"1k":{"jpg":v}}),v)
        self.assertIsNone(p.choose({"1k":{"jpg":dict(v,size=30*1024*1024)}}))
    def test_shortlist_dedup(self):
        self.assertEqual(len(p.shortlist({"a":{"name":"urban house"},"b":{"name":"urban sky"}},"urban",{"b":1})),1)
    def test_dryrun(self):
        data=b"x"*1200
        url="https://dl.polyhaven.org/file/ph-assets/x.jpg"
        item={"url":url,"size":len(data),"md5":hashlib.md5(data).hexdigest()}
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            r=p.run("urban","textures",root,root/"state.json",False,
                {"abc":{"name":"urban house"}},lambda ident:{"1k":item})
            self.assertEqual(r["mode"],"DRY_RUN")
            self.assertEqual(r["bytes"],0)
            self.assertFalse((root/"state.json").exists())
    def test_live_and_repeat_dedup(self):
        data=b"x"*1200
        url="https://dl.polyhaven.org/file/ph-assets/x.jpg"
        item={"url":url,"size":len(data),"md5":hashlib.md5(data).hexdigest()}
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            with patch.object(p,"urlopen",side_effect=lambda req,timeout:Response(url,data)):
                kwargs={"query":"urban","kind":"textures","dest":root,"statefile":root/"state.json","live":True,
                    "catalog":{"abc":{"name":"urban house"}},"files_lookup":lambda ident:{"1k":item}}
                r=p.run(**kwargs)
                self.assertEqual(len(r["downloads"]),1)
                self.assertEqual(r["downloads"][0]["sha256"],hashlib.sha256(data).hexdigest())
                self.assertEqual(len(p.run(**kwargs)["downloads"]),0)
    def test_hash_failure_cleans_temp(self):
        url="https://dl.polyhaven.org/file/ph-assets/x.jpg"
        with tempfile.TemporaryDirectory() as d:
            with patch.object(p,"urlopen",side_effect=lambda req,timeout:Response(url,b"x"*1200)):
                with self.assertRaises(RuntimeError):p.download("abc",{"url":url,"size":1200,"md5":"0"*32},Path(d))
            self.assertEqual(list(Path(d).iterdir()),[])

    def test_prioritizes_color_over_displacement(self):
        color={"url":"https://dl.polyhaven.org/file/ph-assets/brick_diff_1k.jpg","size":8000,"md5":"a"*32}
        displacement={"url":"https://dl.polyhaven.org/file/ph-assets/brick_disp_1k.jpg","size":1200,"md5":"b"*32}
        self.assertEqual(p.choose({"disp":displacement,"diff":color}),color)

if __name__=="__main__":unittest.main()
