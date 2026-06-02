import requests

class WikipediaService:
    def __init__(self):
        self.base_url = "https://hr.wikipedia.org/api/rest_v1/page/summary/"
        self.gradovi = {
            'zagreb': 'Zagreb',
            'split': 'Split',
            'rijeka': 'Rijeka',
            'osijek': 'Osijek',
            'zadar': 'Zadar',
            'dubrovnik': 'Dubrovnik',
            'pula': 'Pula'
        }

    def dohvati_atrakcije(self, grad_ime):
        točan_naziv = self.gradovi.get(grad_ime.lower())
        if not točan_naziv:
            return {"error": "grad nije na popisu podržanih gradova."}
        
        try:
            # Dodajemo User-Agent zaglavlje kako nas Wikipedija ne bi blokirala
            headers = {
                'User-Agent': 'CroFlyApp/1.0 (kontakt: student@unipu.hr) Requests/2.31.0'
            }
            
            odgovor = requests.get(self.base_url + točan_naziv, headers=headers, timeout=5)
            
            if odgovor.status_code != 200:
                return {"error": "Znamenitosti trenutno nedostupne."}
                
            data = odgovor.json()
            return {
                "grad": točan_naziv,
                "tekst": data.get("extract", "Nema opisa."),
                "slika": data.get("originalimage", {}).get("source", "https://via.placeholder.com/400x200?text=Nema+slike"),
                "link": data.get("content_urls", {}).get("desktop", {}).get("page", "#")
            }
        except Exception:
            return {"error": "Greška u povezivanju s Wikipedijom."}

# Kreiramo instancu servisa koja će se uvoziti u glavni API
wikipedia_service = WikipediaService()