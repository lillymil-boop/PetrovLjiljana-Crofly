import os

class AirbnbService:
    def __init__(self):
        # Povlači ključ iz okruženja servera, a ako nije postavljen, koristi zadanu vrijednost (koja je javno dostupna, ali može biti ograničena)
        self.api_key = os.environ.get('RAPIDAPI_KEY', '196fe1aae2msh2ffaa2fd034248fp1f9967jsn65f8d01461f0')
        self.api_host = 'airbnb19.p.rapidapi.com'

    def dohvati_smjestaj(self, grad, vrsta=None):
        
        lokacija_upit = f"{grad.capitalize()}, Croatia"
        
        # Službeni URL endpoint
        url = "https://airbnb19.p.rapidapi.com/api/v2/searchProperty"
        
        # Parametri koje API zahtijeva za filtriranje privatnog smještaja
        query_params = {
            "location": lokacija_upit,
            "adults": "1",
            "currency": "EUR"
        }
        
        headers = {
            'x-rapidapi-host': self.api_host,
            'x-rapidapi-key': self.api_key,
            'Content-Type': 'application/json'
        }
        
        try:
            # Slanje stvarnog HTTP GET zahtjeva prema RapidAPI poslužitelju
            odgovor = requests.get(url, headers=headers, params=query_params, timeout=10)
            
            # Ako API vrati bilo što osim statusa 200, prekidamo i javljamo prazno
            if odgovor.status_code != 200:
                print(f"API javlja grešku: Status {odgovor.status_code}")
                return {"coords": [44.4748, 15.1960], "objekti": []}
                
            podaci = odgovor.json()
            smjestajni_objekti = []
            map_center = [44.4748, 15.1960] # Početni centar Hrvatske ako nema rezultata
            
            # Parsiranje strukturiranog JSON-a koji stiže s Airbnb servisa
            if podaci.get("status") and "data" in podaci:
                properties_list = podaci["data"].get("list", [])
                
                for index, item in enumerate(properties_list):
                    listing = item.get("listing", {})
                    pricing = item.get("pricingQuote", {}).get("structuredStayDisplayPrice", {}).get("primaryLine", {})
                    
                    lat = listing.get("coordinate", {}).get("latitude")
                    lng = listing.get("coordinate", {}).get("longitude")
                    
                    if lat and lng:
                        if index == 0:
                            map_center = [lat, lng] # Centriranje karte na prvi stvarni apartman
                            
                        smjestajni_objekti.append({
                            "name": listing.get("name", "Privatni smještaj"),
                            "city": listing.get("city", grad.capitalize()),
                            "price": pricing.get("price", "Na upit"),
                            "rating": listing.get("avgRatingLocalized", "Novo"),
                            "coords": [lat, lng]
                        })
                        
            return {
                "coords": map_center,
                "objekti": smjestajni_objekti
            }
            
        except Exception as e:
            print(f"Greška u komunikaciji s Airbnb API-jem: {e}")
            return {"coords": [44.4748, 15.1960], "objekti": []}