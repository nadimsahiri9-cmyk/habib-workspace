# Docker Networking — Fiche de référence

## Les réseaux Docker

| Type | Description | Cas d'usage |
|------|-------------|-------------|
| **bridge** | Réseau privé par défaut. Les conteneurs communiquent via IP. | Standalone, dev local |
| **host** | Partage le réseau de l'hôte (pas d'isolation réseau) | Performances max, services exposés direct |
| **overlay** | Multi-host,跨 machines (Swarm) | Clusters Swarm |
| **macvlan** | Adresse MAC dédiée sur le réseau physique | Legacy, appliances |
| **none** | Pas de réseau | Conteneurs isolés |

## Bridge network (le plus courant)

```bash
# Créer un réseau personnalisé
docker network create mon-reseau

# Lancer un conteneur sur ce réseau
docker run --network mon-reseau --name mon-app nginx

# DNS intégré : les conteneurs se résolvent par leur --name
ping mon-app  # marche si sur le même réseau user-defined
```

⚠️ Le bridge par défaut (`docker0`) n'a PAS de DNS automatique.
👉 Toujours utiliser un **user-defined bridge network** pour la résolution DNS.

## Exposition des ports

```bash
# Port mapping : hôte:conteneur
docker run -p 8080:80 nginx

# Exposition sans publier (entre conteneurs même réseau)
docker run --expose 3000 mon-app  # accessible sur le réseau, pas depuis l'hôte
```

- `-p 8080:80` = port 8080 hôte → port 80 conteneur
- `-p 8080:80/udp` = UDP uniquement
- `-p 0.0.0.0:8080:80` = bind sur toutes les interfaces (vs `127.0.0.1:8080:80`)

## Communication entre conteneurs

### Même réseau user-defined bridge
```bash
docker network create app-net
docker run --network app-net --name api mon-api
docker run --network app-net --name web mon-web
# web peut appeler http://api:3000
```

### Docker Compose
```yaml
services:
  api:
    image: mon-api
    ports: ["3000:3000"]
  web:
    image: mon-web
    ports: ["8080:80"]
# Compose crée un réseau auto, DNS par nom de service
```

## docker-compose réseaux

```yaml
services:
  db:
    image: postgres
    networks:
      - backend
  api:
    image: mon-api
    networks:
      - backend
      - frontend
  web:
    image: mon-web
    networks:
      - frontend

networks:
  backend:
    driver: bridge
  frontend:
    driver: bridge
```

## DNS & Résolution

- Docker Daemon a un **DNS embarqué** (127.0.0.11)
- Résolution automatique sur les user-defined networks
- `/etc/hosts` du conteneur géré par Docker (ne pas modifier)
- `--dns` pour DNS custom, `--dns-search` pour domaines de recherche
- `--hostname` = hostname du conteneur (pas forcément le nom DNS)
- `--network-alias` = alias DNS additionnel sur le réseau

## Volumes & Réseau

- Les volumes partagent des fichiers, pas des connections réseau
- Pour partager un socket : monter un volume avec le socket Unix
- Exemple : `/var/run/docker.sock:/var/run/docker.sock` (⚠️ sécurité)

## Docker host networking

```bash
docker run --network host mon-app
# Pas de traduction NAT, le conteneur utilise l'IP/ports de l'hôte
# Utile pour : performances réseau, apps qui bind sur 0.0.0.0
# Risque : conflit de ports, moins d'isolation
```

## Docker overlay network (Swarm)

```bash
docker network create -d overlay mon-overlay
```

- Multi-host : les conteneurs communiquent par dessus le réseau physique
- Chiffrement possible : `--opt encrypted`
- Nécessite Swarm init
- Service discovery : DNS par nom de service

## Sécurité réseau Docker

- User-defined bridge : les conteneurs sont isolés par défaut (pas de `--link` nécessaire comme avant)
- `--icc=false` sur le bridge par défaut (inter-conteneur communication) → désactivé manuellement
- `--iptables` : Docker manipule iptables pour NAT et filtrage
- Pour restreindre : définir des `network` séparés et ne connecter que ce qui doit communiquer
- Éviter `--network host` sauf besoin explicite (perte d'isolation)
- Éviter de monter `/var/run/docker.sock` sauf besoin admin

## Commandes essentielles

```bash
docker network ls                     # lister les réseaux
docker network inspect mon-reseau     # inspecter un réseau
docker network create --driver bridge --subnet 172.20.0.0/16 mon-reseau  # réseau avec subnet fixe
docker network connect mon-reseau mon-container  # connecter un conteneur en cours
docker network disconnect mon-reseau mon-container  # déconnecter
docker run --network mon-reseau --ip 172.20.0.10 nginx  # IP fixe
```

## Debug réseau

```bash
# Tester la connectivité
docker exec mon-container ping autre-container
docker exec mon-container curl http://autre-container:3000

# Voir les iptables Docker
iptables -t nat -L -n | grep DOCKER

# Voir les ports ouverts du conteneur (depuis l'hôte)
ss -tlnp | grep docker

# Logs du réseau
docker network inspect mon-reseau | jq '.[].Containers'
```
