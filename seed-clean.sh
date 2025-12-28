#!/bin/bash
API="https://solaire-api-828508661560.europe-west1.run.app/api"
TOKEN="saftoken-123"

echo "🧹 Nettoyage via API..."

# Récupérer et supprimer tous les projets
echo "   Suppression projets..."
curl -s "$API/projects?limit=100" -H "X-Api-Token: $TOKEN" | \
  python3 -c "import sys,json; [print(p['id']) for p in json.load(sys.stdin).get('items',[])]" | \
  while read id; do
    curl -s -X DELETE "$API/projects/$id" -H "X-Api-Token: $TOKEN" > /dev/null
  done

# Supprimer installateurs
echo "   Suppression installateurs..."
curl -s "$API/installers?limit=100" -H "X-Api-Token: $TOKEN" | \
  python3 -c "import sys,json; [print(p['id']) for p in json.load(sys.stdin).get('items',[])]" | \
  while read id; do
    curl -s -X DELETE "$API/installers/$id" -H "X-Api-Token: $TOKEN" > /dev/null
  done

# Supprimer leads
echo "   Suppression leads..."
curl -s "$API/leads?limit=100" -H "X-Api-Token: $TOKEN" | \
  python3 -c "import sys,json; [print(p['id']) for p in json.load(sys.stdin).get('items',[])]" | \
  while read id; do
    curl -s -X DELETE "$API/leads/$id" -H "X-Api-Token: $TOKEN" > /dev/null
  done

# Supprimer documents
echo "   Suppression documents..."
curl -s "$API/documents?limit=100" -H "X-Api-Token: $TOKEN" | \
  python3 -c "import sys,json; [print(p['id']) for p in json.load(sys.stdin).get('items',[])]" | \
  while read id; do
    curl -s -X DELETE "$API/documents/$id" -H "X-Api-Token: $TOKEN" > /dev/null
  done

echo ""
echo "📝 Création des 5 leads..."
for i in 1 2 3 4 5; do
  curl -s -X POST "$API/leads" -H "X-Api-Token: $TOKEN" -H "Content-Type: application/json" -d '{
    "company": "SOLAR LEAD '$i'",
    "contact": {"firstName": "Lead'$i'", "lastName": "Test", "email": "lead'$i'@test.fr", "phone": "060'$i'0'$i'0'$i'0'$i'"},
    "pack": "PRO",
    "source": "website",
    "status": "new"
  }' > /dev/null
done
echo "   ✓ 5 leads créés"

echo ""
echo "👷 Création des 5 installateurs..."
INST_IDS=""
for i in 1 2 3 4 5; do
  RESP=$(curl -s -X POST "$API/installers" -H "X-Api-Token: $TOKEN" -H "Content-Type: application/json" -d '{
    "company": "INSTALLATEUR '$i'",
    "siret": "1234567890123'$i'",
    "contact": {"firstName": "Inst'$i'", "lastName": "Test", "email": "inst'$i'@test.fr", "phone": "061'$i'1'$i'1'$i'1'$i'"},
    "address": {"street": "'$i' rue Test", "city": "Ville'$i'", "postalCode": "'$i''$i'000"},
    "subscription": {"plan": "pro", "dossiersIncluded": 15},
    "status": "active"
  }')
  ID=$(echo $RESP | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))")
  INST_IDS="$INST_IDS $ID"
done
echo "   ✓ 5 installateurs créés"

echo ""
echo "📁 Création des 5 projets..."
IDS=($INST_IDS)
STEPS=("sent" "approved" "approved" "approved" "approved")
CONSUEL=("pending" "waiting" "attestation_approved" "attestation_approved" "attestation_approved")
ENEDIS=("pending" "pending" "mes_scheduled" "mes_done" "mes_done")
EDFOA=("pending" "pending" "pending" "s21_sent" "contract_signed")

for i in 0 1 2 3 4; do
  IDX=$((i+1))
  curl -s -X POST "$API/projects" -H "X-Api-Token: $TOKEN" -H "Content-Type: application/json" -d '{
    "installerId": "'${IDS[$i]}'",
    "beneficiary": {
      "firstName": "Client'$IDX'",
      "lastName": "Projet",
      "email": "client'$IDX'@email.com",
      "phone": "067'$IDX''$IDX''$IDX''$IDX''$IDX''$IDX''$IDX'",
      "address": {"street": "'$IDX' avenue Test", "city": "Paris", "postalCode": "7500'$IDX'"}
    },
    "installation": {
      "power": '$((IDX * 3))',
      "panelsCount": '$((IDX * 8))',
      "panelsBrand": "Longi",
      "inverterBrand": "Enphase",
      "roofType": "tuile",
      "raccordementType": "surplus"
    },
    "pack": "PRO",
    "packPrice": 269
  }' > /dev/null
done
echo "   ✓ 5 projets créés"

echo ""
echo "✅ Seed terminé !"
echo "   - 5 Leads"
echo "   - 5 Installateurs"  
echo "   - 5 Projets"
