document.addEventListener('DOMContentLoaded', () => {
    
    /* ==========================================================================
       1. DARK MODE LOGIKA
       ========================================================================== */
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

    const currentTheme = localStorage.getItem('theme');

    if (currentTheme) {
        htmlElement.setAttribute('data-theme', currentTheme);
        updateToggleButton(currentTheme);
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            let theme = htmlElement.getAttribute('data-theme');

            if (theme === 'dark') {
                htmlElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                updateToggleButton('light');
            } else {
                htmlElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                updateToggleButton('dark');
            }

            if (typeof initMap === "function") {
                initMap(); 
            }
        });
    }

    function updateToggleButton(theme) {
        if (!themeToggle) return;
        themeToggle.innerHTML = (theme === 'dark') ? '☀️' : '🌙';
    }


    /* ==========================================================================
       2. LOGIKA ZA REGISTRACIJU (index.html) - ISPRAVLJENO NA RENDER ADRESU
       ========================================================================== */
    const registrationForm = document.getElementById('registrationForm');

    if (registrationForm) {
        registrationForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const errorText = document.getElementById('errorText');

            if (password !== confirmPassword) {
                errorText.style.display = 'block';
                errorText.scrollIntoView({ behavior: 'smooth' });
                return; 
            } else {
                errorText.style.display = 'none';
            }

            const korisnik = {
                ime: document.getElementById('firstName').value,
                prezime: document.getElementById('lastName').value,
                email: document.getElementById('email').value,
                lozinka: password
            };

            console.log("Šaljem podatke na Render pozadinu...", korisnik);

            try {
                // ISPRAVLJENO: Umjesto localhosta sada šalje izravno na Render u oblak
                const response = await fetch('https://crofly.onrender.com/registracija', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(korisnik)
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('korisnikIme', korisnik.ime);
                    alert(`Uspješna registracija! Dobrodošli, ${korisnik.ime} ${korisnik.prezime}.`);
                    this.reset();
                } else {
                    alert("Greška pri registraciji: " + (data.greska || "Nepoznata pogreška"));
                }

            } catch (error) {
                console.error("Komunikacija s backendom nije uspjela:", error);
                alert("Neuspješno povezivanje s poslužiteljem. Provjerite radi li Render aplikacija!");
            }
        });
    }
});
    
/* ==========================================================================
   3. DODATNE FUNKCIJE (dohvaćanje prognoze)
   ========================================================================== */
async function dohvatiPrognozu(grad, elementId) {
    const targetId = elementId || `${grad.toLowerCase()}-prognoza`;
    const prikaz = document.getElementById(targetId);
    if (!prikaz) return;

    prikaz.innerHTML = `<p>Učitavanje prognoze za ${grad}...</p>`;

    try {
        const response = await fetch(`https://crofly.onrender.com/api/prognoza/${grad.toLowerCase()}`);
        if (!response.ok) throw new Error('API response not OK');

        const data = await response.json();
        prikaz.innerHTML = `
            <p>Temperatura: <strong>${data.temperatura}</strong></p>
            <p>Vjetar: <strong>${data.vjetar}</strong></p>
        `;
    } catch (error) {
        prikaz.innerHTML = `<p style="color: red;">Greška pri dohvaćanju prognoze.</p>`;
        console.error('Dohvat prognoze nije uspio:', error);
    }
}

/* ==========================================================================
   4. KLASA ZA UPRAVLJANJE KARTOM (Uživo povezano na vanjski Airbnb API)
   ========================================================================== */
class CroFlyMap {
    constructor() {
        this.map = null;
        this.markers = [];
        this.croatiaCenter = [44.4748, 15.1960];
    }

    init() {
        if (document.getElementById("map")) {
            this.map = L.map('map').setView(this.croatiaCenter, 7);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(this.map);

            this.provjeriUrlParametre();
        }
    }

    provjeriUrlParametre() {
        const urlParams = new URLSearchParams(window.location.search);
        const gradParam = urlParams.get('grad');
        
        if (gradParam) {
            const selectGrad = document.getElementById('grad-select');
            if (selectGrad) {
                selectGrad.value = gradParam.charAt(0).toUpperCase() + gradParam.slice(1);
                this.filtriraj();
            }
        }
    }

    async filtriraj() {
        const grad = document.getElementById('grad-select').value;
        const vrsta = document.getElementById('vrsta-smjestaja').value; 

        if (!grad) {
            alert("Molimo odaberite grad.");
            return;
        }

        this.obrisiMarkere();

        try {
            const response = await fetch(`https://crofly.onrender.com/api/smjestaj/${grad}/${vrsta}`);
            const data = await response.json();

            if (!data.objekti || data.objekti.length === 0) {
                alert("Trenutno nema dostupnog smještaja za odabrani grad.");
                return;
            }

            this.map.setView(data.coords, 13);

            data.objekti.forEach(place => {
                const marker = L.marker(place.coords).addTo(this.map);
                
                marker.bindPopup(`
                    <div style="font-family: 'Poppins', sans-serif; min-width: 160px; padding: 5px;">
                        <strong style="color: #003580; font-size: 1.1em; display: block; margin-bottom: 3px;">${place.name}</strong>
                        <span style="color: #666; font-size: 0.9em;">${place.city}</span><br>
                        <span style="color: #ffb020; font-size: 0.9em;">⭐ ${place.rating}</span>
                        <div style="margin-top: 8px; font-weight: bold; color: #00a896; font-size: 1.05em; border-top: 1px solid #eee; padding-top: 5px;">
                            ${place.price} / noć
                        </div>
                    </div>
                `);
                
                this.markers.push(marker);
            });

        } catch (error) {
            console.error("Greška pri dohvaćanju Airbnb podataka:", error);
            alert("Neuspješno povezivanje s poslužiteljem for smještaj.");
        }
    }

    obrisiMarkere() {
        this.markers.forEach(m => this.map.removeLayer(m));
        this.markers = [];
    }
}

const croFlyMap = new CroFlyMap();

window.onload = function() {
    croFlyMap.init();
};

function filtrirajKartu() {
    croFlyMap.filtriraj();
}

/* ==========================================================================
   5. LOGIKA ZA LETOVE
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    const gradovi = ['zagreb', 'split', 'dubrovnik', 'zadar', 'pula', 'rijeka', 'osijek'];

    async function osvjeziLetove(grad) {
        const kontejner = document.getElementById(grad + "-raspored");
        if (!kontejner) return;

        try {
            const response = await fetch(`https://crofly.onrender.com/api/raspored/${grad}`);
            const data = await response.json();

            kontejner.innerHTML = ''; 

            if (!data.odlasci || data.odlasci.length === 0) {
                kontejner.innerHTML = '<p>Nema planiranih letova. ✈️</p>';
                return;
            }

            data.odlasci.forEach(letInfo => {
                const redak = document.createElement('p');
                redak.style.margin = "5px 0";
                redak.innerHTML = `<strong>${letInfo.vrijeme}</strong> | ${letInfo.broj} -> ${letInfo.odrediste}`;
                kontejner.appendChild(redak);
            });
        } catch (err) {
            kontejner.innerHTML = '<p style="color: red;">Greška u vezi.</p>';
        }
    }

    gradovi.forEach(grad => {
        osvjeziLetove(grad);
    });

    document.querySelectorAll('ul li a').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href.startsWith('#')) {
                const gradId = href.substring(1);
                osvjeziLetove(gradId);
            }
        });
    });
});

/* ==========================================================================
   6. LOGIKA ZA JAVASCRIPT API PRIJEVOZ (autobus.html)
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    const gradovi = ['zagreb', 'split', 'dubrovnik', 'zadar', 'pula', 'rijeka', 'osijek'];

    async function dohvatiPrijevoz() {
        for (const grad of gradovi) {
            const kontejner = document.getElementById(grad + "-bus-info");
            
            if (kontejner) {
                try {
                    const res = await fetch(`https://crofly.onrender.com/api/prijevoz/${grad}`);
                    const data = await res.json();
                    
                    kontejner.innerHTML = `
                        <div style="background: #f8f9fa; padding: 12px; border-left: 5px solid #4285F4; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <p style="margin: 0; font-size: 1.1em; color: #2c3e50;">🚌 <strong>${data.linija}</strong></p>
                            <p style="margin: 6px 0 0; font-size: 0.9em; color: #555;">⏱️ Vrijeme do centra: <strong>${data.vrijeme}</strong></p>
                        </div>
                    `;
                } catch (err) {
                    console.error("Greška kod dohvata za grad " + grad + ":", err);
                    kontejner.innerHTML = `
                        <div style="background: #fff3f3; padding: 10px; border-left: 5px solid #dc3545; border-radius: 4px;">
                            <p style="margin: 0; color: #dc3545; font-weight: bold;">⚠️ Podaci trenutno nedostupni.</p>
                        </div>
                    `;
                }
            }
        }
    }

    dohvatiPrijevoz();
});

document.addEventListener('DOMContentLoaded', () => {
    const gradovi = ['Zagreb', 'Split', 'Dubrovnik', 'Zadar', 'Pula', 'Rijeka', 'Osijek'];
    
    gradovi.forEach(grad => {
        const elementId = grad.toLowerCase() + '-prognoza';
        dohvatiPrognozu(grad, elementId);
    });
});

/* ==========================================================================
   7. LOGIKA ZA WIKIPEDIA ATRAKCIJE (Izravno unutar sekcije grada)
   ========================================================================== */
async function dohvatiWikiPodatke(grad) {
    const response = await fetch(`https://crofly.onrender.com/api/wiki/${grad}`);
    return await response.json();
}

async function prikaziZanimljivostiGrada(grad) {
    const prikaz = document.getElementById(`${grad.toLowerCase()}-wiki`);
    if (!prikaz) return;

    document.querySelectorAll('.wiki-lokalni-prikaz').forEach(box => box.innerHTML = '');

    prikaz.innerHTML = `<p class="wiki-ucitavanje-tekst">Dohvaćam zanimljivosti s Wikipedije...</p>`;

    try {
        const data = await dohvatiWikiPodatke(grad);

        if (data.error) {
            prikaz.innerHTML = `<p class="wiki-greska-tekst">Greška: ${data.error}</p>`;
            return;
        }

        prikaz.innerHTML = `
           <div class="wiki-lokalna-kartica">
                <h4>Jeste li znali?</h4>
                <div class="wiki-sadrzaj-kontejner">
                    <img src="${data.slika}" alt="${data.grad}" class="wiki-kartica-slika">
                    <div class="wiki-tekst-desno">
                        <p>${data.tekst}</p>
                        <a href="${data.link}" target="_blank" class="wiki-saznaj-vise-link">Saznajte više na Wikipediji &rarr;</a>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        prikaz.innerHTML = `<p class="wiki-greska-tekst">Neuspješno povezivanje s Python serverom.</p>`;
        console.error("Wikipedia greška:", error);
    }
}