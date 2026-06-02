from flask import Flask, jsonify
from flask_cors import CORS
import requests
import os

app = Flask(__name__)
CORS(app)  # Otvara vrata JavaScriptu

# API ključ za Google Maps Directions API
GOOGLE_KEY = os.environ.get('GOOGLE_MAPS_KEY', 'AIzaSyAs-n8ho4ea_b-UzQUTztQT0CMxYBYBBJc')

def dohvati_javni_prijevoz(grad):
    lokacije = {
        'zagreb': {"start": "Zračna luka Franjo Tuđman", "end": "Trg bana Jelačića, Zagreb"},
        'split': {"start": "Zračna luka Split", "end": "Riva, Split"},
        'rijeka': {"start": "Zračna luka Rijeka", "end": "Korzo, Rijeka"},
        'zadar': {"start": "Zračna luka Zadar", "end": "Poluotok, Zadar"},
        'dubrovnik': {"start": "Zračna luka Dubrovnik", "end": "Stradun, Dubrovnik"},
        'pula': {"start": "Zračna luka Pula", "end": "Arena, Pula"},
        'osijek': {"start": "Zračna luka Osijek", "end": "Tvrđa, Osijek"}
    }

    info = lokacije.get(grad.lower())
    if not info: 
        return {"linija": "Grad nije definiran", "vrijeme": "N/A"}

    url = "https://maps.googleapis.com/maps/api/directions/json"
    params = {
        "origin": info['start'],
        "destination": info['end'],
        "mode": "transit", # Ovo prisiljava Google da traži BUSEVE i TRAMVAJE
        "key": GOOGLE_KEY
    }

    try:
        r = requests.get(url, params=params, timeout=5)
        data = r.json()
        
        # Ako je Google uspio pronaći rutu
        if data.get("status") == "OK":
            koraci = data['routes'][0]['legs'][0]['steps']
            
            # Tražimo dio rute koji je javni prijevoz (preskačemo hodanje do stanice)
            transit_korak = next((k for k in koraci if k['travel_mode'] == 'TRANSIT'), None)
            
            if transit_korak:
                linija_info = transit_korak['transit_details']['line']
                # Neki prijevoznici imaju 'short_name' (ZET 290), a neki samo 'name' (Pleso Prijevoz)
                naziv_linije = linija_info.get('short_name') or linija_info.get('name') or "Shuttle Bus"
                
                # Izvlačimo ukupno vrijeme putovanja
                vrijeme = data['routes'][0]['legs'][0]['duration']['text']
                vrijeme = vrijeme.replace("mins", "min").replace("hours", "h") # Mali prijevod na hrvatski
                
                return {"linija": f"Linija {naziv_linije}", "vrijeme": vrijeme}
            else:
                return {"linija": "Samo pješačka ruta", "vrijeme": "N/A"}
        else:
            print(f"Google kaže: {data.get('status')} za {grad}")
            return {"linija": "Ruta trenutno nije dostupna", "vrijeme": "N/A"}

    except Exception as e:
        print("Greška:", e)
        return {"linija": "Servis nedostupan", "vrijeme": "N/A"}

# Ruta koja sluša tvoj JavaScript
@app.route('/api/prijevoz/<grad>')
def get_prijevoz(grad):
    rezultat = dohvati_javni_prijevoz(grad)
    return jsonify(rezultat)

if __name__ == "__main__":
    import os

    port = int(os.environ.get("PORT", 5000))
    print(f"API Prijevoz je pokrenut na javnom portu: {port}")
    app.run(host="0.0.0.0", port=port, debug=False)