from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import requests
import os 
import pymysql
pymysql.install_as_MySQLdb()

from apiprijevoz import dohvati_javni_prijevoz
from apivrijeme import dohvati_vrijeme
from apiwikipedia import wikipedia_service
from api_airbnb import AirbnbService

airbnb_service = AirbnbService()

app = Flask(__name__)
CORS(app)

API_KEY = os.environ.get('AIRLABS_API_KEY', '62a8d06a-c03e-4228-ba9f-eeb81f44f318')

def db_konekcija():
    return pymysql.connect(
        host='student.veleri.hr',
        port=3306,
        user='rda',
        passwd='11',
        db='rda_money',
        charset='utf8mb4'
    )

@app.route('/')
@app.route('/letovi')
def index():
    return send_from_directory('.', 'letovi.html')


@app.route('/registracija', methods=['POST'])
def registracija():
    podaci = request.get_json()
    if not podaci:
        return jsonify({"greska": "Nisu poslani podaci"}), 400
        
    ime = podaci.get('ime')
    prezime = podaci.get('prezime')
    email = podaci.get('email')
    lozinka = podaci.get('lozinka')

    if not all([ime, prezime, email, lozinka]):
        return jsonify({"greska": "Sva polja su obavezna"}), 400

    try:
        db = db_konekcija()
        cursor = db.cursor()
        
        sql = "INSERT INTO letovi_korisnici (ime, prezime, email, lozinka) VALUES (%s, %s, %s, %s)"
        cursor.execute(sql, (ime, prezime, email, lozinka))
        db.commit()
        
        cursor.close()
        db.close()
        return jsonify({"poruka": "Uspješna registracija!"}), 201
    except pymysql.IntegrityError:
        return jsonify({"greska": "Korisnik s ovim emailom već postoji"}), 400
    except Exception as e:
        return jsonify({"greska": f"Greška na serveru: {str(e)}"}), 500

@app.route('/api/raspored/<grad>')
def api_raspored(grad):
    iata_kodovi = {
        'zagreb': 'ZAG', 'split': 'SPU', 'dubrovnik': 'DBV',
        'zadar': 'ZAD', 'pula': 'PUY', 'rijeka': 'RJK', 'osijek': 'OSI'
    }
    
    iata = iata_kodovi.get(grad.lower())
    if not iata:
        return jsonify({"odlasci": []})

    url = f"https://airlabs.co/api/v9/schedules?dep_iata={iata}&api_key={API_KEY}"

    try:
        r = requests.get(url)
        data = r.json()
        sirovi_letovi = data.get('response', [])
        
        odlasci_cisto = []
        for let in sirovi_letovi[:10]:
            vrijeme_raw = let.get('dep_time', '00:00 00:00')
            vrijeme = vrijeme_raw.split(' ')[1] if ' ' in vrijeme_raw else '00:00'
            odlasci_cisto.append({
                "broj": let.get('flight_iata', 'N/A'),
                "vrijeme": vrijeme,
                "odrediste": let.get('arr_iata', '???')
            })
        return jsonify({"odlasci": odlasci_cisto})
    except:
        return jsonify({"odlasci": []})

@app.route('/<path:filename>')
def custom_static(filename):
    return send_from_directory('.', filename)

@app.route('/api/prijevoz/<grad>')
def api_prijevoz(grad):
    podaci = dohvati_javni_prijevoz(grad)
    return jsonify(podaci)

@app.route('/api/prognoza/<grad>')
def api_prognoza(grad):
    return jsonify(dohvati_vrijeme(grad))

@app.route('/api/wiki/<grad>', methods=['GET'])
def wiki_api_ruta(grad):
    rezultat = wikipedia_service.dohvati_atrakcije(grad)
    return jsonify(rezultat)

@app.route('/api/smjestaj/<grad>/<vrsta>', methods=['GET'])
def smjestaj_api_ruta(grad, vrsta):
    rezultat = airbnb_service.dohvati_smjestaj(grad, vrsta)
    return jsonify(rezultat)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)