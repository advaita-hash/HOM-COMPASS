"""Generate a seed repertory (public/repertory/seed.json) from a compact table.

Format per rubric:  (Chapter, "Rubric text", "Rem 3, Rem 2, Rem 1, ...")
Grades: a remedy written "Puls 3" has grade 3 (bold). Classic Kent-style
associations — a study seed, to be replaced by a full Kent ingestion.
"""
import json, re, os

DATA = [
 ("Mind", "Anxiety", "Aconite 3, Arsenicum 3, Phosphorus 3, Calcarea 2, Causticum 2, Kali-ars 2, Natrum-mur 2, Ignatia 2, Nux-vomica 2, Pulsatilla 1, Lycopodium 1, Sepia 1"),
 ("Mind", "Anxiety, health, about", "Arsenicum 3, Calcarea 3, Kali-ars 2, Nitric-acid 2, Phosphorus 2, Nux-vomica 1, Sepia 1, Sulphur 1"),
 ("Mind", "Fear, death, of", "Aconite 3, Arsenicum 3, Calcarea 2, Phosphorus 2, Nitric-acid 2, Nux-vomica 1, Platina 1, Gelsemium 1"),
 ("Mind", "Grief, ailments from", "Ignatia 3, Natrum-mur 3, Phosphoric-acid 2, Staphysagria 2, Causticum 2, Aurum 1, Pulsatilla 1, Lachesis 1"),
 ("Mind", "Consolation aggravates", "Natrum-mur 3, Sepia 3, Silica 2, Ignatia 2, Lycopodium 1, Nitric-acid 1, Calcarea-phos 1"),
 ("Mind", "Irritability", "Nux-vomica 3, Bryonia 3, Chamomilla 3, Anacardium 2, Lycopodium 2, Sepia 2, Sulphur 2, Hepar 2, Natrum-mur 1, Staphysagria 1"),
 ("Mind", "Weeping, consolation aggravates", "Natrum-mur 3, Sepia 2, Silica 2, Ignatia 1, Lycopodium 1"),
 ("Mind", "Indifference, loved ones, to", "Sepia 3, Phosphoric-acid 2, Natrum-mur 2, Fluoric-acid 2, Lilium-tig 1, Aurum 1"),
 ("Mind", "Fastidious", "Arsenicum 3, Nux-vomica 2, Anacardium 1, Graphites 1, Silica 1"),
 ("Mind", "Restlessness", "Arsenicum 3, Aconite 3, Rhus-tox 3, Tarentula 2, Mercurius 2, Ferrum 1, Pulsatilla 1"),
 ("Mind", "Anticipation, ailments from", "Argentum-nit 3, Gelsemium 3, Lycopodium 3, Silica 2, Arsenicum 1, Phosphoric-acid 1"),
 ("Vertigo", "Vertigo, general", "Conium 3, Cocculus 2, Gelsemium 2, Bryonia 2, Phosphorus 2, Pulsatilla 1, Nux-vomica 1, Silica 1"),
 ("Head", "Pain, headache, general", "Belladonna 3, Bryonia 3, Natrum-mur 3, Nux-vomica 2, Sanguinaria 2, Silica 2, Glonoine 2, Spigelia 2, Gelsemium 1"),
 ("Head", "Pain, sun, from", "Natrum-mur 3, Glonoine 3, Belladonna 2, Lachesis 1, Gelsemium 1"),
 ("Head", "Pain, throbbing", "Belladonna 3, Glonoine 3, China 2, Natrum-mur 2, Sanguinaria 2, Melilotus 1"),
 ("Eye", "Inflammation, conjunctivitis", "Belladonna 3, Euphrasia 3, Argentum-nit 2, Apis 2, Pulsatilla 2, Mercurius 2, Sulphur 1"),
 ("Nose", "Coryza", "Allium-cepa 3, Euphrasia 2, Arsenicum 2, Natrum-mur 2, Nux-vomica 2, Gelsemium 1, Sabadilla 1"),
 ("Face", "Neuralgia, prosopalgia", "Spigelia 3, Colocynth 2, Mag-phos 2, Belladonna 2, Verbascum 1, Chamomilla 1"),
 ("Mouth", "Salivation", "Mercurius 3, Iodum 2, Pulsatilla 1, Nitric-acid 1, Baryta-carb 1"),
 ("Throat", "Pain, sore throat", "Belladonna 3, Lachesis 3, Mercurius 3, Phytolacca 2, Apis 2, Hepar 2, Lycopodium 2, Baryta-carb 1"),
 ("Stomach", "Nausea", "Ipecac 3, Arsenicum 2, Nux-vomica 2, Pulsatilla 2, Tabacum 2, Sepia 1, Colchicum 1"),
 ("Stomach", "Thirst, thirstless", "Pulsatilla 3, Apis 2, Gelsemium 1, Nux-moschata 1"),
 ("Stomach", "Thirst, large quantities", "Bryonia 3, Natrum-mur 2, Phosphorus 2, Sulphur 1, Arsenicum 1"),
 ("Stomach", "Desires, sweets", "Argentum-nit 3, Lycopodium 2, Sulphur 2, China 1, Kali-carb 1"),
 ("Stomach", "Desires, salt", "Natrum-mur 3, Calcarea 1, Carbo-veg 1, Phosphorus 1"),
 ("Abdomen", "Flatulence, distension", "Lycopodium 3, China 3, Carbo-veg 3, Argentum-nit 2, Nux-vomica 1, Chamomilla 1"),
 ("Abdomen", "Pain, cramping, colic", "Colocynth 3, Mag-phos 3, Chamomilla 2, Dioscorea 2, Nux-vomica 2, Belladonna 1"),
 ("Rectum", "Constipation", "Nux-vomica 3, Bryonia 2, Alumina 2, Silica 2, Lycopodium 2, Opium 2, Sepia 1, Sulphur 1"),
 ("Rectum", "Diarrhoea", "Arsenicum 3, Podophyllum 3, Sulphur 2, Aloe 2, Veratrum 2, Chamomilla 2, Mercurius 1"),
 ("Rectum", "Urging, ineffectual", "Nux-vomica 3, Mercurius 2, Lycopodium 1, Rhus-tox 1"),
 ("Bladder", "Urination, frequent", "Pulsatilla 2, Causticum 2, Sulphur 2, Phosphorus 1, Natrum-mur 1"),
 ("Male", "Sexual desire, increased", "Phosphorus 2, Platina 2, Nux-vomica 2, Cantharis 2, Lycopodium 1"),
 ("Female", "Menses, before, aggravation", "Sepia 3, Lachesis 3, Pulsatilla 2, Natrum-mur 2, Calcarea 2, Lycopodium 1"),
 ("Female", "Bearing down sensation", "Sepia 3, Lilium-tig 3, Belladonna 2, Murex 2, Platina 1, Lachesis 1"),
 ("Respiration", "Asthmatic", "Arsenicum 3, Ipecac 2, Nux-vomica 2, Kali-carb 2, Antim-tart 2, Lobelia 2, Spongia 1"),
 ("Cough", "Dry cough", "Bryonia 3, Rumex 2, Spongia 2, Phosphorus 2, Sticta 2, Aconite 1, Drosera 1"),
 ("Cough", "Loose, rattling", "Antim-tart 3, Ipecac 2, Pulsatilla 2, Kali-sulph 1, Hepar 1"),
 ("Chest", "Palpitation", "Aconite 2, Digitalis 2, Spigelia 2, Lachesis 2, Cactus 2, Natrum-mur 1"),
 ("Back", "Pain, lumbar", "Rhus-tox 3, Bryonia 2, Nux-vomica 2, Kali-carb 2, Berberis 2, Sepia 1"),
 ("Extremities", "Pain, rheumatic", "Rhus-tox 3, Bryonia 3, Pulsatilla 2, Colchicum 2, Kalmia 2, Ledum 2, Causticum 1"),
 ("Extremities", "Restless legs", "Zincum 3, Rhus-tox 2, Arsenicum 1, Causticum 1, Tarentula 1"),
 ("Sleep", "Sleeplessness, insomnia", "Coffea 3, Nux-vomica 2, Arsenicum 2, Pulsatilla 2, Cocculus 2, Ignatia 1, Aconite 1"),
 ("Sleep", "Sleepiness, drowsiness", "Nux-moschata 3, Opium 2, Antim-tart 2, Gelsemium 2, Phosphoric-acid 1"),
 ("Chill", "Chilliness, general", "Nux-vomica 3, Arsenicum 2, Silica 2, Calcarea 2, Hepar 2, Pulsatilla 1"),
 ("Fever", "Heat, general", "Aconite 3, Belladonna 3, Arsenicum 2, Sulphur 2, Bryonia 2, Gelsemium 1"),
 ("Perspiration", "Profuse", "Mercurius 3, Calcarea 2, Silica 2, China 2, Sambucus 1, Sulphur 1"),
 ("Skin", "Itching", "Sulphur 3, Rhus-tox 2, Arsenicum 2, Mezereum 2, Psorinum 2, Dolichos 1"),
 ("Skin", "Eruptions, urticaria", "Apis 3, Urtica-urens 3, Rhus-tox 2, Natrum-mur 1, Sulphur 1"),
 ("Generalities", "Aggravation, warmth", "Pulsatilla 3, Sulphur 2, Lachesis 2, Apis 2, Iodum 2, Kali-sulph 1"),
 ("Generalities", "Aggravation, cold", "Arsenicum 3, Nux-vomica 3, Hepar 2, Silica 2, Rhus-tox 2, Calcarea 2, Dulcamara 2"),
 ("Generalities", "Amelioration, open air", "Pulsatilla 3, Natrum-sulph 2, Argentum-nit 2, Apis 1, Sulphur 1"),
 ("Generalities", "Right sided", "Lycopodium 3, Belladonna 2, Apis 2, Sanguinaria 2, Chelidonium 2, Bryonia 1"),
 ("Generalities", "Left sided", "Lachesis 3, Phosphorus 2, Sepia 2, Argentum-nit 1, Spigelia 1"),
 ("Generalities", "Periodicity", "China 3, Arsenicum 2, Cedron 2, Natrum-mur 2, Sulphur 1"),
 ("Generalities", "Weakness, prostration", "Arsenicum 3, China 3, Phosphoric-acid 2, Gelsemium 2, Muriatic-acid 2, Carbo-veg 2, Picric-acid 1"),
]

# Expand common abbreviations to display names (matches Materia Medica where possible).
FULL = {
 "Aconite":"Aconitum", "Arsenicum":"Arsenicum Album", "Nux-vomica":"Nux Vomica",
 "Natrum-mur":"Natrum Muriaticum", "Kali-ars":"Kali Arsenicum", "Kali-carb":"Kali Carbonicum",
 "Kali-sulph":"Kali Sulphuricum", "Antim-tart":"Antimonium Tartaricum", "Mag-phos":"Magnesia Phosphorica",
 "Argentum-nit":"Argentum Nitricum", "Nitric-acid":"Nitric Acid", "Phosphoric-acid":"Phosphoric Acid",
 "Muriatic-acid":"Muriatic Acid", "Picric-acid":"Picric Acid", "Carbo-veg":"Carbo Vegetabilis",
 "Rhus-tox":"Rhus Toxicodendron", "Calcarea":"Calcarea Carbonica", "Calcarea-phos":"Calcarea Phosphorica",
 "Lilium-tig":"Lilium Tigrinum", "Nux-moschata":"Nux Moschata", "Allium-cepa":"Allium Cepa",
 "Urtica-urens":"Urtica Urens", "Natrum-sulph":"Natrum Sulphuricum", "Baryta-carb":"Baryta Carbonica",
 "Ipecac":"Ipecacuanha", "Antim-crud":"Antimonium Crudum",
}

def full(name):
    return FULL.get(name, name)

def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

rubrics = []
chapters = []
for ch, text, rems in DATA:
    if ch not in chapters:
        chapters.append(ch)
    rlist = []
    for tok in rems.split(","):
        tok = tok.strip()
        m = re.match(r"^(.*?)[\s]+([1-4])$", tok)
        if not m:
            raise SystemExit(f"bad remedy token: {tok!r} in {text!r}")
        rlist.append({"name": full(m.group(1).strip()), "grade": int(m.group(2))})
    rubrics.append({
        "id": slug(f"{ch}-{text}"),
        "chapter": ch,
        "rubric": text,
        "remedies": rlist,
    })

rep = {
    "id": "seed",
    "title": "Seed Repertory",
    "author": "HOM-COMPASS",
    "source": "Study seed · classic Kent-style rubrics",
    "note": "A compact demo repertory. Replace with a full Kent ingestion when available.",
    "chapters": chapters,
    "rubricCount": len(rubrics),
    "rubrics": rubrics,
}

import os
_OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "repertory")
os.makedirs(_OUT, exist_ok=True)
with open(os.path.join(_OUT, "seed.json"), "w") as f:
    json.dump(rep, f, ensure_ascii=False, indent=0)

print("rubrics:", len(rubrics), "chapters:", len(chapters))
print("total remedy refs:", sum(len(r["remedies"]) for r in rubrics))
