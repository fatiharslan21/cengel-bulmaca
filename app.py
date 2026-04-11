from flask import Flask, render_template, jsonify, request
import json,os,glob

app = Flask(__name__)
DATA = os.path.join(os.path.dirname(__file__), "static", "data")

def all_p():
    return [json.load(open(f,encoding="utf-8")) for f in sorted(glob.glob(os.path.join(DATA,"puzzle_*.json")))]

def get_p(pid):
    f=os.path.join(DATA,f"puzzle_{pid:03d}.json")
    return json.load(open(f,encoding="utf-8")) if os.path.exists(f) else None

@app.route("/")
def index():
    ps=all_p()
    g={"Kolay":[],"Orta":[],"Zor":[],"Çok Zor":[]}
    for p in ps: g.setdefault(p["difficulty"],[]).append(p)
    return render_template("index.html",grouped=g,total=len(ps))

@app.route("/bulmaca/<int:pid>")
def play(pid):
    p=get_p(pid)
    if not p: return "Bulunamadı",404
    return render_template("play.html",puzzle=p,total=len(all_p()))

@app.route("/api/hint",methods=["POST"])
def hint():
    d=request.json; p=get_p(d.get("pid",0))
    if not p: return jsonify(error="yok"),404
    def TR(c):
        m={'i':'İ','ı':'I','ö':'Ö','ü':'Ü','ş':'Ş','ç':'Ç','ğ':'Ğ'}
        return m.get(c,c.upper())
    for w in p["words"]:
        if w["number"]==d.get("num") and w["direction"]==d.get("dir"):
            kn=d.get("known",{})
            for i,ch in enumerate(w["answer"]):
                if str(i) not in kn or TR(kn[str(i)])!=ch:
                    return jsonify(i=i,ch=ch)
    return jsonify(msg="ok")

if __name__=="__main__":
    app.run(debug=True,port=5000)
